from flask import Flask, request, jsonify
from models import db, User, Transaction
from ai.finance_ai import FinanceNN # Το αρχείο με την κλάση που μου έστειλες
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Δημιουργούμε φάκελο για τα AI μοντέλα αν δεν υπάρχει
if not os.path.exists('ai_models'):
    os.makedirs('ai_models')

with app.app_context():
    db.create_all()

def get_family_brain(user):
    """Βρίσκει το σωστό AI μοντέλο για την οικογένεια"""
    owner_id = user.parent_id if user.role == 'kid' and user.parent_id else user.id
    model_path = f"ai_models/family_{owner_id}.pkl"
    return FinanceNN(model_file=model_path)

# --- ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    new_user = User(
        username=data['username'], 
        email=data['email'], 
        role=data.get('role', 'parent'),
        parent_id=data.get('parent_id')
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User created", "user": new_user.to_dict()}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        return jsonify(user.to_dict()), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/update_balance', methods=['POST'])
def update_balance():
    data = request.get_json()
    user_id = data.get('user_id')
    amount = float(data.get('amount'))
    category = data.get('category', 'General')

    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404

    ai_results = {}
    # Αν είναι έξοδο, τρέξε το AI
    if amount < 0:
        brain = get_family_brain(user)
        # analyze_transaction(ποσό, κατηγορία, υπόλοιπο)
        ai_results = brain.analyze_transaction(abs(amount), category, user.get_balance())
        
        # Πρόσθεσε τους πόντους στον χρήστη
        user.points += ai_results.get('points_earned', 0)

    # Αποθήκευση Transaction
    new_tx = Transaction(
        amount=amount,
        user_id=user.id,
        category=category,
        store_name=data.get('store_name', 'N/A'),
        description=data.get('description', 'No description')
    )
    
    db.session.add(new_tx)
    db.session.commit()

    return jsonify({
        "message": "Success",
        "new_balance": user.get_balance(),
        "total_points": user.points,
        "ai_analysis": ai_results
    }), 200

@app.route('/api/teach_ai', methods=['POST'])
def teach_ai():
    """Ο γονέας διορθώνει το AI της οικογένειας"""
    data = request.get_json()
    user = User.query.get(data.get('user_id')) # Ο γονέας που κάνει τη διόρθωση
    
    brain = get_family_brain(user)
    brain.teach_ai(
        amount=abs(data['amount']),
        category_name=data['category'],
        balance=data['balance'],
        correct_label=data['correct_label'] # 1 για OK, 0 για Warning
    )
    return jsonify({"message": "AI learned from parent feedback"}), 200

@app.route('/api/transactions/<int:user_id>', methods=['GET'])
def history(user_id):
    user = User.query.get(user_id)
    txs = Transaction.query.filter_by(user_id=user_id).all()
    return jsonify({
        "balance": user.get_balance(),
        "points": user.points,
        "history": [t.to_dict() for t in txs]
    }), 200

if __name__ == '__main__':
    app.run(debug=True)