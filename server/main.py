from flask import Flask, request, jsonify
from models import db, User, Transaction
from ai.finance_ai import FinanceNN # Το αρχείο με την κλάση FinanceNN που μου έδωσες
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Dictionary για να κρατάμε τα AI μοντέλα ανά οικογένεια στη μνήμη
family_brains = {}

def get_brain(user):
    owner_id = user.parent_id if user.role == 'kid' else user.id
    if owner_id not in family_brains:
        model_path = f"ai_models/family_{owner_id}.pkl"
        family_brains[owner_id] = FinanceNN(model_file=model_path)
    return family_brains[owner_id]

with app.app_context():
    if not os.path.exists('ai_models'): 
        os.makedirs('ai_models')
    db.create_all()
    print("--- Database & Folders Ready! ---")

# --- 1. REGISTER: Ο Πατέρας φτιάχνει λογαριασμό για τον εαυτό του ή το παιδί ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    # Αν υπάρχει parent_id στο request, σημαίνει ότι ο πατέρας δημιουργεί παιδί
    parent_id = data.get('parent_id') 
    
    new_user = User(
        username=data['username'],
        email=data['email'],
        role=data.get('role', 'parent'),
        parent_id=parent_id,
        weekly_allowance=data.get('weekly_allowance', 0.0)
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201

# --- 2. LOGIN ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        return jsonify(user.to_dict())
    return jsonify({"error": "Invalid credentials"}), 401

# --- 3. UPDATE BALANCE & AI ANALYSIS ---
@app.route('/api/update_balance', methods=['POST'])
def update_balance():
    data = request.get_json()
    user = User.query.get(data.get('user_id'))
    if not user: return jsonify({"error": "User not found"}), 404

    amount = float(data.get('amount'))
    current_balance = user.get_balance()

    # ΕΛΕΓΧΟΣ: Δεν επιτρέπουμε αγορά αν το balance θα βγει < 0
    if amount < 0 and (current_balance + amount) < 0:
        return jsonify({"error": "Insufficient balance! Purchase denied."}), 400

    ai_analysis = {}
    if amount < 0: # Μόνο αν είναι αγορά καλούμε το AI
        brain = get_brain(user)
        # abs(amount) γιατί το AI σου περιμένει θετικό αριθμό για το έξοδο
        ai_analysis = brain.analyze_transaction(abs(amount), data.get('category'), current_balance)
        user.points += ai_analysis.get('points_earned', 0)

    new_tx = Transaction(amount=amount, category=data.get('category'), 
                         description=data.get('description'), user_id=user.id)
    db.session.add(new_tx)
    db.session.commit()
    
    return jsonify({"new_balance": user.get_balance(), "ai_analysis": ai_analysis})

# --- 4. SET GOAL ---
@app.route('/api/set_goal', methods=['POST'])
def set_goal():
    data = request.get_json()
    user = User.query.get(data.get('user_id'))
    user.goal_name = data.get('goal_name')
    user.goal_amount = float(data.get('goal_amount'))
    db.session.commit()
    return jsonify({"message": "Goal updated successfully"})

# --- 5. PREDICT GOAL (Behavioral AI) ---
@app.route('/api/predict_goal/<int:user_id>', methods=['GET'])
def predict_goal(user_id):
    user = User.query.get(user_id)
    if not user or not user.goal_amount:
        return jsonify({"error": "No goal set"}), 400

    brain = get_brain(user)
    prediction = brain.predict_goal_timeframe(
        target_amount=user.goal_amount,
        weekly_allowance=user.weekly_allowance,
        current_savings=user.get_balance()
    )
    return jsonify(prediction)

# --- 6. TEACH AI (Feedback από τον γονέα) ---
@app.route('/api/teach_ai', methods=['POST'])
def teach_ai():
    data = request.get_json()
    user = User.query.get(data.get('user_id')) # Ο πατέρας
    brain = get_brain(user)
    
    # Εδώ θα μπορούσες να καλέσεις μια μέθοδο brain.fit() αν την πρόσθετες στην κλάση σου
    return jsonify({"message": "AI has been notified of the correct behavior!"})

@app.route('/api/transactions/<int:user_id>', methods=['GET'])
def get_transactions(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Παίρνουμε όλες τις συναλλαγές του χρήστη
    txs = Transaction.query.filter_by(user_id=user_id).all()
    
    return jsonify({
        "username": user.username,
        "balance": user.get_balance(),
        "points": user.points,
        "goal": {"name": user.goal_name, "amount": user.goal_amount},
        "history": [t.to_dict() for t in txs]
    }), 200
if __name__ == '__main__':
    app.run(debug=True)