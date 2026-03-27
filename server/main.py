from flask import Flask, request, jsonify
from flask_cors import CORS 
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Transaction
from ai.finance_ai import FinanceNN 
import os

app = Flask(__name__)
CORS(app)  # Ενεργοποίηση για σύνδεση με Frontend (React/Vue/Flutter)

# Ρυθμίσεις Βάσης & Security
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'kippy-bank-secret-key-2024' # Άλλαξέ το σε κάτι τυχαίο
jwt = JWTManager(app)

db.init_app(app)

# Dictionary για τα AI μοντέλα ανά οικογένεια
family_brains = {}

def get_brain(user):
    """Επιστρέφει το AI μοντέλο της οικογένειας του χρήστη"""
    owner_id = user.parent_id if user.role == 'kid' and user.parent_id else user.id
    if owner_id not in family_brains:
        model_path = f"ai_models/family_{owner_id}.pkl"
        family_brains[owner_id] = FinanceNN(model_file=model_path)
    return family_brains[owner_id]

# Αρχικοποίηση Βάσης Δεδομένων
with app.app_context():
    if not os.path.exists('ai_models'): 
        os.makedirs('ai_models')
    db.create_all()
    print("--- Database & Folders Ready! ---")

# --- 1. REGISTER ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    role = data.get('role', 'parent')
    
    # Αν είναι παιδί, ο πατέρας πρέπει να στείλει το parent_id του
    new_user = User(
        username=data['username'],
        email=data['email'],
        role=role,
        parent_id=data.get('parent_id'),
        weekly_allowance=data.get('weekly_allowance', 0.0)
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201

# --- 2. LOGIN (Επιστρέφει JWT Token) ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "token": access_token,
            "user": user.to_dict()
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

# --- 3. UPDATE BALANCE & AI ANALYSIS ---
@app.route('/api/update_balance', methods=['POST'])
@jwt_required()
def update_balance():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if not user: return jsonify({"error": "User not found"}), 404

    amount = float(data.get('amount'))
    current_balance = user.get_balance()

    # Έλεγχος για 0 balance
    if amount < 0 and (current_balance + amount) < 0:
        return jsonify({
            "error": "Insufficient balance! Purchase denied.",
            "current_balance": current_balance
        }), 400

    ai_analysis = {}
    if amount < 0: 
        brain = get_brain(user)
        ai_analysis = brain.analyze_transaction(abs(amount), data.get('category'), current_balance)
        user.points += ai_analysis.get('points_earned', 0)

    new_tx = Transaction(
        amount=amount, 
        category=data.get('category'), 
        description=data.get('description', ''), 
        user_id=user.id
    )
    db.session.add(new_tx)
    db.session.commit()
    
    return jsonify({
        "message": "Transaction successful",
        "new_balance": user.get_balance(), 
        "ai_analysis": ai_analysis
    }), 200

# --- 4. SET GOAL ---
@app.route('/api/set_goal', methods=['POST'])
@jwt_required()
def set_goal():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if not user: return jsonify({"error": "User not found"}), 404

    user.goal_name = data.get('goal_name')
    user.goal_amount = float(data.get('goal_amount', 0))
    db.session.commit()
    return jsonify({"message": "Goal updated successfully", "goal": user.goal_name})

# --- 5. PREDICT GOAL (Behavioral AI) ---
@app.route('/api/predict_goal/<int:user_id>', methods=['GET'])
@jwt_required()
def predict_goal(user_id):
    user = db.session.get(User, user_id)
    if not user or not user.goal_amount:
        return jsonify({"error": "No goal set or user not found"}), 400

    brain = get_brain(user)
    prediction = brain.predict_goal_timeframe(
        target_amount=user.goal_amount,
        weekly_allowance=user.weekly_allowance,
        current_savings=user.get_balance()
    )
    return jsonify(prediction)

# --- 6. TEACH AI (Parent Feedback) ---
@app.route('/api/teach_ai', methods=['POST'])
@jwt_required()
def teach_ai():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id')) 
    if not user: return jsonify({"error": "User not found"}), 404

    brain = get_brain(user)
    # Προαιρετικά: Αν η κλάση FinanceNN έχει μέθοδο teach_ai, την καλούμε εδώ
    # brain.teach_ai(...)
    return jsonify({"message": "AI has been notified of the correct behavior!"})

# --- 7. GET TRANSACTIONS (History) ---
@app.route('/api/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_transactions(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Ταξινόμηση κατά ημερομηνία (πιο πρόσφατα πρώτα)
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    
    return jsonify({
        "username": user.username,
        "balance": user.get_balance(),
        "points": user.points,
        "goal": {"name": user.goal_name, "amount": user.goal_amount},
        "history": [t.to_dict() for t in txs]
    }), 200

if __name__ == '__main__':
    # Running on 0.0.0.0 helps if you want to test from your phone
    app.run(debug=True, host='0.0.0.0', port=5000)