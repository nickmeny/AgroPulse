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

family_brains = {}

def get_brain(user):
    owner_id = user.parent_id if user.role == 'kid' and user.parent_id else user.id
    if owner_id not in family_brains:
        model_path = f"ai_models/family_{owner_id}.pkl"
        family_brains[owner_id] = FinanceNN(model_file=model_path)
    return family_brains[owner_id]

with app.app_context():
    if not os.path.exists('ai_models'): 
        os.makedirs('ai_models')
    db.create_all()
    print("--- Kippy Bank System Ready ---")

# --- 1. REGISTER ---
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
            return jsonify({"error": "Parent verification failed!"}), 401
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

# --- 2. LOGIN ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"token": access_token, "user": user.to_dict()}), 200
    return jsonify({"error": "Invalid credentials"}), 401

# --- 3. PARENT TO KID TRANSFER (Username Based & Secure) ---
@app.route('/api/parent/transfer_to_kid', methods=['POST'])
@jwt_required()
def transfer_to_kid():
    # Παίρνουμε το ID του γονέα από το Token (ασφάλεια)
    current_user_id = get_jwt_identity()
    parent = db.session.get(User, int(current_user_id))
    
    if parent.role != 'parent':
        return jsonify({"error": "Only parents can initiate transfers!"}), 403

    data = request.get_json()
    kid_username = data.get('kid_username')
    amount = float(data.get('amount', 0))

    # Αναζήτηση του παιδιού με βάση το Username
    kid = User.query.filter_by(username=kid_username, role='kid').first()

    if not kid:
        return jsonify({"error": f"Child with username '{kid_username}' not found"}), 404

    # Έλεγχος αν το παιδί ανήκει όντως σε αυτόν τον γονέα
    if kid.parent_id != parent.id:
        return jsonify({"error": "This child does not belong to your family account!"}), 403

    if parent.get_balance() < amount:
        return jsonify({"error": f"Insufficient funds! Your balance: {parent.get_balance()}"}), 400

    try:
        # Αφαίρεση από γονέα
        parent_tx = Transaction(
            amount=-amount, 
            category="Transfer to Kid", 
            description=f"Pocket money for {kid.username}", 
            user_id=parent.id
        )
        # Προσθήκη στο παιδί
        kid_tx = Transaction(
            amount=amount, 
            category="Allowance", 
            description=f"Received from {parent.username}", 
            user_id=kid.id
        )
        
        db.session.add(parent_tx)
        db.session.add(kid_tx)
        db.session.commit()

        return jsonify({
            "message": "Transfer successful!",
            "parent_balance": parent.get_balance(),
            "kid_balance": kid.get_balance()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- 4. UPDATE BALANCE (Αγορές Παιδιού) ---
@app.route('/api/update_balance', methods=['POST'])
@jwt_required()
def update_balance():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if not user: return jsonify({"error": "User not found"}), 404

    amount = float(data.get('amount'))
    current_balance = user.get_balance()

    if amount < 0 and (current_balance + amount) < 0:
        return jsonify({"error": "Insufficient balance!"}), 400

    ai_analysis = {}
    if amount < 0: 
        brain = get_brain(user)
        ai_analysis = brain.analyze_transaction(abs(amount), data.get('category', 'General'), current_balance)
        user.points += ai_analysis.get('points_earned', 0)

    new_tx = Transaction(amount=amount, category=data.get('category'), description=data.get('description', ''), user_id=user.id)
    db.session.add(new_tx)
    db.session.commit()
    return jsonify({"new_balance": user.get_balance(), "ai_analysis": ai_analysis})

# --- 5. POCKETS ---
@app.route('/api/pockets/create', methods=['POST'])
@jwt_required()
def create_pocket():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if not user or user.role != 'kid': return jsonify({"error": "Only kids can have pockets"}), 403
    new_pocket = Pocket(name=data['name'], target_amount=data.get('target', 0.0), user_id=user.id)
    db.session.add(new_pocket)
    db.session.commit()
    return jsonify(new_pocket.to_dict()), 201

@app.route('/api/pockets/transfer', methods=['POST'])
@jwt_required()
def pocket_transfer():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    pocket = db.session.get(Pocket, data.get('pocket_id'))
    amount = float(data.get('amount'))
    if not user or not pocket or pocket.user_id != user.id: return jsonify({"error": "Auth failed"}), 403
    if amount > 0 and user.get_balance() < amount: return jsonify({"error": "Insufficient balance"}), 400
    if amount < 0 and pocket.balance < abs(amount): return jsonify({"error": "Pocket empty"}), 400
    pocket.balance += amount
    db.session.commit()
    return jsonify({"new_balance": user.get_balance(), "pocket_balance": pocket.balance})

# --- 6. AI & HISTORY ---
@app.route('/api/predict_goal/<int:user_id>', methods=['GET'])
@jwt_required()
def predict_goal(user_id):
    user = db.session.get(User, user_id)
    if not user or not user.goal_amount: return jsonify({"error": "No goal"}), 400
    brain = get_brain(user)
    return jsonify(brain.predict_goal_timeframe(user.goal_amount, user.weekly_allowance, user.get_balance()))

@app.route('/api/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_transactions(user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify({"error": "Not found"}), 404
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    return jsonify({"user": user.to_dict(), "history": [t.to_dict() for t in txs]})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)