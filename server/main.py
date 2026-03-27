from flask import Flask, request, jsonify
from flask_cors import CORS 
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Transaction
from ai.finance_ai import FinanceNN 
import os

app = Flask(__name__)
CORS(app)  # Επιτρέπει τη σύνδεση με το Frontend

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
    # Αν είναι παιδί, ο εγκέφαλος ανήκει στον πατέρα του
    owner_id = user.parent_id if user.role == 'kid' and user.parent_id else user.id
    if owner_id not in family_brains:
        model_path = f"ai_models/family_{owner_id}.pkl"
        family_brains[owner_id] = FinanceNN(model_file=model_path)
    return family_brains[owner_id]

# Αρχικοποίηση Βάσης Δεδομένων και Φακέλων
with app.app_context():
    if not os.path.exists('ai_models'): 
        os.makedirs('ai_models')
    db.create_all()
    print("--- Database & Folders Ready! ---")

# --- 1. REGISTER (Με Parent Verification για τα παιδιά) ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    role = data.get('role', 'parent')
    parent_id = None

    # Αν ο ρόλος είναι παιδί, απαιτούμε στοιχεία γονέα για ταυτοποίηση
    if role == 'kid':
        p_user = data.get('parent_username')
        p_pass = data.get('parent_password')
        
        # Αναζήτηση και έλεγχος γονέα
        parent = User.query.filter_by(username=p_user, role='parent').first()
        if not parent or not parent.check_password(p_pass):
            return jsonify({"error": "Parent verification failed! Incorrect parent credentials."}), 401
        
        parent_id = parent.id

    # Έλεγχος αν το username ή το email υπάρχει ήδη
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
        new_user.set_password(data['password']) # Ο κωδικός του νέου χρήστη
        
        db.session.add(new_user)
        db.session.commit()
        return jsonify(new_user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Registration failed", "details": str(e)}), 500

# --- 2. LOGIN (JWT Generation) ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and user.check_password(data.get('password')):
        # Το identity πρέπει να είναι string για το JWT
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "token": access_token,
            "user": user.to_dict()
        }), 200
        
    return jsonify({"error": "Invalid username or password"}), 401

# --- 3. UPDATE BALANCE & AI ANALYSIS ---
@app.route('/api/update_balance', methods=['POST'])
@jwt_required()
def update_balance():
    data = request.get_json()
    user_id = data.get('user_id')
    user = db.session.get(User, user_id)
    
    if not user: return jsonify({"error": "User not found"}), 404

    amount = float(data.get('amount'))
    current_balance = user.get_balance()

    # Έλεγχος Υπολοίπου: Δεν επιτρέπουμε αγορά αν το balance γίνει αρνητικό
    if amount < 0 and (current_balance + amount) < 0:
        return jsonify({
            "error": "Insufficient balance! Transaction blocked.",
            "current_balance": current_balance,
            "required": abs(amount)
        }), 400

    ai_analysis = {}
    if amount < 0: # Μόνο οι αγορές αναλύονται από το AI
        brain = get_brain(user)
        # abs(amount) για να στείλουμε θετική τιμή εξόδου στο AI
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
    
    return jsonify({
        "message": "Transaction recorded",
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
    return jsonify({"message": "Savings goal updated", "goal": user.goal_name})

# --- 5. PREDICT GOAL (Behavioral Analysis) ---
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

# --- 6. TEACH AI (Feedback από Γονέα) ---
@app.route('/api/teach_ai', methods=['POST'])
@jwt_required()
def teach_ai():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id')) 
    if not user: return jsonify({"error": "User not found"}), 404

    brain = get_brain(user)
    # Εδώ καλείς τη μέθοδο teach_ai της κλάσης FinanceNN
    brain.teach_ai(
        amount=abs(float(data['amount'])),
        category_name=data['category'],
        balance=float(data['balance']),
        correct_label=int(data['correct_label'])
    )
    return jsonify({"message": "AI model updated with behavioral feedback!"}), 200

# --- 7. GET TRANSACTIONS (Ιστορικό) ---
@app.route('/api/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_transactions(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    
    return jsonify({
        "username": user.username,
        "balance": user.get_balance(),
        "points": user.points,
        "goal": {"name": user.goal_name, "amount": user.goal_amount},
        "history": [t.to_dict() for t in txs]
    }), 200

if __name__ == '__main__':
    # Running on 0.0.0.0 for external device access (Mobile/Frontend)
    app.run(debug=True, host='0.0.0.0', port=5000)