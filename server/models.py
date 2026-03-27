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
    role = db.Column(db.String(20), default='parent') # 'parent' ή 'kid'
    parent_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Αποθήκευση πόντων από το AI
    points = db.Column(db.Integer, default=0)

    # Σχέσεις
    children = db.relationship('User', backref=db.backref('parent_obj', remote_side=[id]), lazy=True)
    transactions = db.relationship('Transaction', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_balance(self):
        return round(sum(t.amount for t in self.transactions), 2)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "balance": self.get_balance(),
            "points": self.points,
            "parent_id": self.parent_id
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), default="General")
    store_name = db.Column(db.String(100), default="N/A")
    description = db.Column(db.String(200), default="No description")
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "category": self.category,
            "store": self.store_name,
            "description": self.description,
            "date": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }