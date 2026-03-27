from flask import Flask, request, jsonify
from models import db, User, Transaction

app = Flask(__name__)

# Configuration - Η βάση αποθηκεύεται στο αρχείο users.db
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Δημιουργία πινάκων
with app.app_context():
    db.create_all()

# --- ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data or 'email' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Username already exists"}), 400

    # role: 'parent' ή 'kid'. parent_id: το ID του γονέα (αν είναι kid)
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
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"error": "Missing credentials"}), 400

    user = User.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        return jsonify({"message": "Login successful", "user": user.to_dict()}), 200
    
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/update_balance', methods=['POST'])
def update_balance():
    data = request.get_json()
    user_id = data.get('user_id')
    amount = data.get('amount')
    
    if user_id is None or amount is None:
        return jsonify({"error": "user_id and amount are required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Δημιουργία συναλλαγής με όλα τα νέα στοιχεία
    new_transaction = Transaction(
        amount=float(amount),
        category=data.get('category'),
        store_name=data.get('store_name'),
        description=data.get('description', "No description"),
        user_id=user.id
    )
    
    db.session.add(new_transaction)
    db.session.commit()

    return jsonify({
        "message": "Transaction recorded",
        "new_balance": user.get_balance()
    }), 200

@app.route('/api/transactions/<int:user_id>', methods=['GET'])
def get_transactions(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Επιστρέφει το ιστορικό ξεκινώντας από την πιο πρόσφατη κίνηση
    transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
    
    return jsonify({
        "username": user.username,
        "role": user.role,
        "balance": user.get_balance(),
        "history": [t.to_dict() for t in transactions]
    }), 200

if __name__ == '__main__':
    app.run(debug=True)