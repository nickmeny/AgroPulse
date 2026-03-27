import unittest
import json
import sys
import os

# Ensure the parent directory is in the path so we can import main and models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from models import db, User

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        self.client = app.test_client()
        
        with app.app_context():
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_registration(self):
        payload = {"username": "newbie", "email": "new@example.com", "password": "password123"}
        response = self.client.post('/api/register', 
                                    data=json.dumps(payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_duplicate_registration(self):
        with app.app_context():
            u = User(username='taken', email='taken@test.com')
            u.set_password('pass')
            db.session.add(u)
            db.session.commit()

        payload = {"username": "taken", "email": "new@test.com", "password": "pass"}
        response = self.client.post('/api/register', 
                                    data=json.dumps(payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_login_success(self):
        with app.app_context():
            u = User(username='tester', email='test@test.com')
            u.set_password('secret')
            db.session.add(u)
            db.session.commit()

        payload = {"username": "tester", "password": "secret"}
        response = self.client.post('/api/login', 
                                    data=json.dumps(payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_login_failure(self):
        with app.app_context():
            u = User(username='tester', email='test@test.com')
            u.set_password('secret')
            db.session.add(u)
            db.session.commit()

        payload = {"username": "tester", "password": "wrongpassword"}
        response = self.client.post('/api/login', 
                                    data=json.dumps(payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main()