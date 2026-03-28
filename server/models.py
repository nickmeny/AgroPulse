from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='parent') 
    parent_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    points = db.Column(db.Integer, default=0)
    weekly_allowance = db.Column(db.Float, default=0.0)
    goal_name = db.Column(db.String(100), nullable=True)
    goal_amount = db.Column(db.Float, default=0.0)

    # Σχέσεις (Relationships)
    transactions = db.relationship('Transaction', backref='owner', lazy=True, cascade="all, delete-orphan")
    pockets = db.relationship('Pocket', backref='owner', lazy=True, cascade="all, delete-orphan")
    investments = db.relationship('Investment', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_balance(self):
        # Υπολογίζουμε μόνο τις εγκεκριμένες (approved) συναλλαγές
        total_tx = sum(t.amount for t in self.transactions if t.status == 'approved')
        locked_in_pockets = sum(p.balance for p in self.pockets)
        return round(total_tx - locked_in_pockets, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "balance": self.get_balance(),
            "points": self.points,
            "goal": {"name": self.goal_name, "amount": self.goal_amount},
            "weekly_allowance": self.weekly_allowance,
            "pockets": [p.to_dict() for p in self.pockets] if self.role == 'kid' else []
        }

class Pocket(db.Model):
    __tablename__ = 'pockets'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    balance = db.Column(db.Float, default=0.0)
    target_amount = db.Column(db.Float, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "balance": self.balance,
            "target": self.target_amount
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))
    description = db.Column(db.String(200))
    # 'approved' (για έσοδα/εγκεκριμένα) ή 'pending' (για αιτήματα αγοράς)
    status = db.Column(db.String(20), default='approved') 
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "category": self.category,
            "description": self.description,
            "status": self.status,
            "date": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }

class Investment(db.Model):
    __tablename__ = 'investments'
    id = db.Column(db.Integer, primary_key=True)
    asset_name = db.Column(db.String(50), nullable=False)
    coins_invested = db.Column(db.Integer, nullable=False)
    buy_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending') # 'pending' ή 'approved'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "asset_name": self.asset_name,
            "coins_invested": self.coins_invested,
            "buy_price": self.buy_price,
            "status": self.status,
            "date": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }