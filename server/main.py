from flask import Flask, request, jsonify
from flask_cors import CORS 
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Transaction, Pocket
from ai.finance_ai import FinanceNN 
import os

app = Flask(__name__)
CORS(app) 

# Ρυθμίσεις Βάσης & Security
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'kippy-bank-ultra-secret-2026' 
jwt = JWTManager(app)

db.init_app(app)

# Dictionary για τα AI μοντέλα ανά οικογένεια (Lazy Loading)
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
    print("--- Kippy Bank System Ready (with Pockets & AI) ---")

# --- 1. REGISTER (Με Parent Verification για Kids) ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    role = data.get('role', 'parent')
    parent_id = None

    if role == 'kid':
        p_user = data.get('parent_username')
        p_pass = data.get('parent_password')
        parent = User.query.filter_by(username=p_user, role='parent').first()
        if not parent or not parent.check_password(p_pass):
            return jsonify({"error": "Parent verification failed! Incorrect parent credentials."}), 401
        parent_id = parent.id

    existing = User.query.filter((User.email == data['email']) | (User.username == data['username'])).first()
    if existing:
        return jsonify({"error": "Username or Email already exists!"}), 400

    try:
        new_user = User(
            username=data['username'],
            email=data['email'],
            role=role,
            parent_id=parent_id,
            weekly_allowance=data.get('weekly_allowance', 0.0)
        )
        new_user.set_password(data['password'])
        db.session.add(new_user)
        db.session.commit()
        return jsonify(new_user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- 2. LOGIN (JWT Generation) ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"token": access_token, "user": user.to_dict()}), 200
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

    # Έλεγχος Υπολοίπου (το main balance δεν πρέπει να βγει αρνητικό)
    if amount < 0 and (current_balance + amount) < 0:
        return jsonify({"error": "Insufficient main balance! Move money from your Pockets first."}), 400

    ai_analysis = {}
    if amount < 0: 
        brain = get_brain(user)
        ai_analysis = brain.analyze_transaction(abs(amount), data.get('category', 'General'), current_balance)
        user.points += ai_analysis.get('points_earned', 0)

    new_tx = Transaction(
        amount=amount, 
        category=data.get('category', 'General'), 
        description=data.get('description', ''), 
        user_id=user.id
    )
    db.session.add(new_tx)
    db.session.commit()
    return jsonify({"message": "Success", "new_balance": user.get_balance(), "ai_analysis": ai_analysis})

# --- 4. CREATE POCKET (Kids Only) ---
@app.route('/api/pockets/create', methods=['POST'])
@jwt_required()
def create_pocket():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if not user or user.role != 'kid':
        return jsonify({"error": "Only kids can create pockets!"}), 403

    new_pocket = Pocket(name=data['name'], target_amount=data.get('target', 0.0), user_id=user.id)
    db.session.add(new_pocket)
    db.session.commit()
    return jsonify(new_pocket.to_dict()), 201

# --- 5. POCKET TRANSFER (Move money in/out) ---
@app.route('/api/pockets/transfer', methods=['POST'])
@jwt_required()
def transfer_money():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    pocket = db.session.get(Pocket, data.get('pocket_id'))
    amount = float(data.get('amount')) # Θετικό: Balance -> Pocket, Αρνητικό: Pocket -> Balance

    if not user or not pocket or pocket.user_id != user.id:
        return jsonify({"error": "Unauthorized pocket access"}), 403

    if amount > 0 and user.get_balance() < amount:
        return jsonify({"error": "Not enough money in main balance!"}), 400
    if amount < 0 and pocket.balance < abs(amount):
        return jsonify({"error": "Not enough money in pocket!"}), 400

    pocket.balance += amount
    db.session.commit()
    return jsonify({
        "message": "Transfer successful", 
        "new_main_balance": user.get_balance(), 
        "pocket_balance": pocket.balance
    })

# --- 6. PREDICT GOAL (Behavioral AI) ---
@app.route('/api/predict_goal/<int:user_id>', methods=['GET'])
@jwt_required()
def predict_goal(user_id):
    user = db.session.get(User, user_id)
    if not user or not user.goal_amount:
        return jsonify({"error": "No goal set"}), 400
    brain = get_brain(user)
    prediction = brain.predict_goal_timeframe(user.goal_amount, user.weekly_allowance, user.get_balance())
    return jsonify(prediction)

# --- 7. TEACH AI (Parental Feedback) ---
@app.route('/api/teach_ai', methods=['POST'])
@jwt_required()
def teach_ai():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id')) 
    if not user: return jsonify({"error": "User not found"}), 404

    brain = get_brain(user)
    brain.teach_ai(
        amount=abs(float(data['amount'])),
        category_name=data['category'],
        balance=float(data['balance']),
        correct_label=int(data['correct_label'])
    )
    return jsonify({"message": "AI model updated based on parent's advice!"}), 200

# --- 8. GET HISTORY & USER DATA ---
@app.route('/api/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_transactions(user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    return jsonify({
        "user_info": user.to_dict(),
        "history": [t.to_dict() for t in txs]
    }), 200

# --- 9. SET MAIN GOAL ---
@app.route('/api/set_goal', methods=['POST'])
@jwt_required()
def set_goal():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if not user: return jsonify({"error": "User not found"}), 404
    user.goal_name = data.get('goal_name')
    user.goal_amount = float(data.get('goal_amount', 0))
    db.session.commit()
    return jsonify({"message": "Main goal updated successfully!"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)