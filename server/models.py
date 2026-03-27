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
    
    # Behavioral & Goals
    points = db.Column(db.Integer, default=0)
    weekly_allowance = db.Column(db.Float, default=0.0)
    goal_name = db.Column(db.String(100), nullable=True)
    goal_amount = db.Column(db.Float, default=0.0)

    # Σχέση με τις συναλλαγές
    transactions = db.relationship('Transaction', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        """Κρυπτογράφηση κωδικού"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Έλεγχος κωδικού"""
        return check_password_hash(self.password_hash, password)

    def get_balance(self):
        """Υπολογισμός υπολοίπου από το ιστορικό"""
        return round(sum(t.amount for t in self.transactions), 2)

    def to_dict(self):
        """Μετατροπή User σε JSON"""
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "balance": self.get_balance(),
            "points": self.points,
            "goal": {"name": self.goal_name, "amount": self.goal_amount},
            "weekly_allowance": self.weekly_allowance,
            "parent_id": self.parent_id
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False) # Θετικό = Κατάθεση, Αρνητικό = Έξοδο
    category = db.Column(db.String(50))
    description = db.Column(db.String(200))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        """Μετατροπή Transaction σε JSON - ΑΠΑΡΑΙΤΗΤΟ ΓΙΑ ΤΟ HISTORY"""
        return {
            "id": self.id,
            "amount": self.amount,
            "category": self.category if self.category else "General",
            "description": self.description if self.description else "",
            "date": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }