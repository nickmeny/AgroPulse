from flask import Flask, request, jsonify
from flask_cors import CORS 
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Transaction, Pocket, Investment
from ai.finance_ai import FinanceNN 
import random
import os

app = Flask(__name__)
CORS(app) 

# --- Ρυθμίσεις Βάσης & Security ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'kippy-bank-ultra-secret-2026' 
jwt = JWTManager(app)

db.init_app(app)

# Dictionary για τα AI μοντέλα ανά οικογένεια
family_brains = {}

def get_brain(user):
    owner_id = user.parent_id if user.role == 'kid' and user.parent_id else user.id
    if owner_id not in family_brains:
        model_path = f"ai_models/family_{owner_id}.pkl"
        family_brains[owner_id] = FinanceNN(model_file=model_path)
    return family_brains[owner_id]

# Αρχικοποίηση
with app.app_context():
    if not os.path.exists('ai_models'): 
        os.makedirs('ai_models')
    db.create_all()
    print("🚀 Kippy Bank: ALL SYSTEMS ONLINE")

# --- 1. AUTH (Register & Login) ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    role = data.get('role', 'parent')
    parent_id = None
    if role == 'kid':
        p_user, p_pass = data.get('parent_username'), data.get('parent_password')
        parent = User.query.filter_by(username=p_user, role='parent').first()
        if not parent or not parent.check_password(p_pass):
            return jsonify({"error": "Parent verification failed!"}), 401
        parent_id = parent.id
    if User.query.filter((User.email == data['email']) | (User.username == data['username'])).first():
        return jsonify({"error": "User already exists!"}), 400
    new_user = User(username=data['username'], email=data['email'], role=role, parent_id=parent_id, weekly_allowance=data.get('weekly_allowance', 0.0))
    new_user.set_password(data['password'])
    db.session.add(new_user); db.session.commit()
    return jsonify(new_user.to_dict()), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        return jsonify({"token": create_access_token(identity=str(user.id)), "user": user.to_dict()}), 200
    return jsonify({"error": "Invalid credentials"}), 401

# --- 2. FAMILY TRANSFERS (Parent -> Kid) ---
@app.route('/api/parent/transfer_to_kid', methods=['POST'])
@jwt_required()
def transfer_to_kid():
    parent_id = get_jwt_identity()
    parent = db.session.get(User, int(parent_id))
    if parent.role != 'parent': return jsonify({"error": "Only parents can do this"}), 403
    data = request.get_json()
    kid = User.query.filter_by(username=data.get('kid_username'), parent_id=parent.id).first()
    if not kid: return jsonify({"error": "Child not found in your family"}), 404
    amount = float(data.get('amount', 0))
    if parent.get_balance() < amount: return jsonify({"error": "Parent insufficient funds"}), 400
    db.session.add(Transaction(amount=-amount, category="Transfer", description=f"To {kid.username}", user_id=parent.id))
    db.session.add(Transaction(amount=amount, category="Allowance", description=f"From {parent.username}", user_id=kid.id))
    db.session.commit()
    return jsonify({"message": "Success", "parent_balance": parent.get_balance(), "kid_balance": kid.get_balance()})

# --- 3. BALANCE & AI ANALYSIS ---
@app.route('/api/update_balance', methods=['POST'])
@jwt_required()
def update_balance():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    amount = float(data.get('amount'))
    if amount < 0 and (user.get_balance() + amount) < 0:
        return jsonify({"error": "Insufficient main balance!"}), 400
    ai_analysis = {}
    if amount < 0:
        brain = get_brain(user)
        ai_analysis = brain.analyze_transaction(abs(amount), data.get('category', 'General'), user.get_balance())
        user.points += ai_analysis.get('points_earned', 0)
    db.session.add(Transaction(amount=amount, category=data.get('category'), description=data.get('description', ''), user_id=user.id))
    db.session.commit()
    return jsonify({"new_balance": user.get_balance(), "ai_analysis": ai_analysis})

# --- 4. POCKETS (Create & Move Money) ---
@app.route('/api/pockets/create', methods=['POST'])
@jwt_required()
def create_pocket():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    if user.role != 'kid': return jsonify({"error": "Kids only"}), 403
    new_pocket = Pocket(name=data['name'], target_amount=data.get('target', 0.0), user_id=user.id)
    db.session.add(new_pocket); db.session.commit()
    return jsonify(new_pocket.to_dict()), 201

@app.route('/api/pockets/transfer', methods=['POST'])
@jwt_required()
def pocket_transfer():
    data = request.get_json()
    user = db.session.get(User, data['user_id'])
    pocket = db.session.get(Pocket, data['pocket_id'])
    amount = float(data['amount']) # Θετικό: Main -> Pocket, Αρνητικό: Pocket -> Main
    if amount > 0 and user.get_balance() < amount: return jsonify({"error": "No funds in main balance"}), 400
    if amount < 0 and pocket.balance < abs(amount): return jsonify({"error": "Pocket empty"}), 400
    pocket.balance += amount; db.session.commit()
    return jsonify({"main_balance": user.get_balance(), "pocket_balance": pocket.balance})

# --- 5. GOALS & PREDICTIONS ---
@app.route('/api/set_goal', methods=['POST'])
@jwt_required()
def set_goal():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    user.goal_name = data.get('goal_name')
    user.goal_amount = float(data.get('goal_amount', 0))
    db.session.commit()
    return jsonify({"message": "Goal set!", "goal": user.goal_name})

@app.route('/api/predict_goal/<int:user_id>', methods=['GET'])
@jwt_required()
def predict_goal(user_id):
    user = db.session.get(User, user_id)
    if not user or not user.goal_amount: return jsonify({"error": "No goal set"}), 400
    return jsonify(get_brain(user).predict_goal_timeframe(user.goal_amount, user.weekly_allowance, user.get_balance()))

# --- 6. AI TRAINING (Parent Feedback) ---
@app.route('/api/teach_ai', methods=['POST'])
@jwt_required()
def teach_ai():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    brain = get_brain(user)
    brain.teach_ai(amount=abs(float(data['amount'])), category_name=data['category'], balance=float(data['balance']), correct_label=int(data['correct_label']))
    return jsonify({"message": "AI model updated with parent's feedback!"})

# --- 7. HISTORY ---
@app.route('/api/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_transactions(user_id):
    user = db.session.get(User, user_id)
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    return jsonify({"user": user.to_dict(), "history": [t.to_dict() for t in txs]})

@app.route('/api/invest/prices', methods=['GET'])
@jwt_required()
def get_mock_prices():
    """Επιστρέφει τυχαίες τιμές για ψεύτικα assets"""
    assets = {
        "KippyCoin": round(random.uniform(10, 100), 2),
        "SpaceX_Stock": round(random.uniform(150, 200), 2),
        "Roblox_Shares": round(random.uniform(30, 60), 2),
        "Gold_Token": round(random.uniform(1800, 2000), 2)
    }
    return jsonify(assets)

@app.route('/api/invest/buy', methods=['POST'])
@jwt_required()
def buy_investment():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    
    asset = data.get('asset_name')
    coins_to_spend = int(data.get('coins'))
    current_price = float(data.get('current_price')) # Η τιμή που βλέπει το παιδί στο UI

    if user.points < coins_to_spend:
        return jsonify({"error": "Not enough coins (points)!"}), 400

    try:
        new_inv = Investment(
            asset_name=asset,
            coins_invested=coins_to_spend,
            buy_price=current_price,
            user_id=user.id
        )
        user.points -= coins_to_spend # Αφαίρεση coins
        db.session.add(new_inv)
        db.session.commit()
        return jsonify({"message": f"Invested in {asset}!", "remaining_points": user.points}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/invest/portfolio/<int:user_id>', methods=['GET'])
@jwt_required()
def get_portfolio(user_id):
    user = db.session.get(User, user_id)
    investments = Investment.query.filter_by(user_id=user_id).all()
    
    # Logic για να υπολογίσουμε αν κερδίζει ή χάνει (Simulation)
    portfolio_data = []
    for inv in investments:
        # "Τρέχουσα" τιμή (τυχαία για το demo)
        current_mock_price = inv.buy_price * random.uniform(0.8, 1.3) 
        profit_loss = (current_mock_price - inv.buy_price) / inv.buy_price * 100
        
        d = inv.to_dict()
        d['current_value_factor'] = round(current_mock_price, 2)
        d['profit_loss_percentage'] = round(profit_loss, 2)
        portfolio_data.append(d)
        
    return jsonify({
        "total_coins_available": user.points,
        "active_investments": portfolio_data
    })

@app.route('/api/invest/sell', methods=['POST'])
@jwt_required()
def sell_investment():
    data = request.get_json()
    user = db.session.get(User, data.get('user_id'))
    inv = db.session.get(Investment, data.get('investment_id'))
    
    if not inv or inv.user_id != user.id:
        return jsonify({"error": "Investment not found"}), 404

    # Υπολογισμός επιστροφής coins (απλή λογική)
    # Αν η τιμή ανέβηκε 20%, παίρνει πίσω τα coins του + 20%
    current_mock_price = inv.buy_price * random.uniform(0.8, 1.4) 
    multiplier = current_mock_price / inv.buy_price
    coins_returned = int(inv.coins_invested * multiplier)

    user.points += coins_returned
    db.session.delete(inv)
    db.session.commit()
    
    return jsonify({
        "message": f"Sold {inv.asset_name}!",
        "coins_returned": coins_returned,
        "new_points_total": user.points
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)