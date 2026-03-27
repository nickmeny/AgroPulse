import numpy as np
from sklearn.neural_network import MLPClassifier
import random
import joblib
import os

class FinanceNN:
    def __init__(self, model_file="finance_model.pkl"):
        self.category_map = {"Βιβλία": 1, "Αποταμίευση": 2, "Gaming": 3, "Γλυκά": 4}
        self.model_file = model_file
        
        # ΕΛΕΓΧΟΣ: Υπάρχει ήδη εκπαιδευμένο AI;
        if os.path.exists(self.model_file):
            print(f"--- Φόρτωση εκπαιδευμένου AI από {self.model_file} ---")
            self.model = joblib.load(self.model_file)
        else:
            print("--- Πρώτη φορά: Εκπαίδευση AI με 10.000 σενάρια... ---")
            self.model = MLPClassifier(
                hidden_layer_sizes=(32, 16, 8), 
                max_iter=2000, 
                learning_rate_init=0.001,
                random_state=1
            )
            self._initial_training()
            self._save_model()

    def _initial_training(self):
        X_train, y_train = self._generate_synthetic_data(10000)
        self.model.fit(X_train, y_train)

    def _save_model(self):
        joblib.dump(self.model, self.model_file)

    def _generate_synthetic_data(self, samples):
        X, y = [], []
        for _ in range(samples):
            balance = random.randint(10, 1000)
            amount = random.randint(1, 200)
            cat_id = random.randint(1, 4)
            percentage = amount / balance if balance > 0 else 1
            
            if amount > balance: label = 0
            elif cat_id <= 2: label = 1 if percentage < 0.7 else 0
            else: label = 1 if percentage < 0.15 else 0
            
            X.append([amount, cat_id, balance, percentage])
            y.append(label)
        return np.array(X), np.array(y)

    def teach_ai(self, amount, category_name, balance, correct_label):
        """
        Ο 'Pro' τρόπος: Ο γονέας διορθώνει το AI και αυτό ξανα-εκπαιδεύεται 
        πάνω στο συγκεκριμένο παράδειγμα (Incremental Learning).
        """
        cat_id = self.category_map.get(category_name, 3)
        percentage = amount / balance if balance > 0 else 1
        X_new = np.array([[amount, cat_id, balance, percentage]])
        y_new = np.array([correct_label])
        
        # Μερική επανεκπαίδευση
        self.model.partial_fit(X_new, y_new)
        self._save_model()
        print("--- Το AI έμαθε από τη διόρθωση του γονέα! ---")

    def analyze_transaction(self, amount, category_name, balance):
        cat_id = self.category_map.get(category_name, 3)
        percentage = amount / balance if balance > 0 else 1
        
        # Πρόβλεψη
        prediction = self.model.predict([[amount, cat_id, balance, percentage]])[0]
        probability = self.model.predict_proba([[amount, cat_id, balance, percentage]])[0][1]

        # Λογική Feedback & Πόντων
        if prediction == 1:
            status = "APPROVED"
            points = int(amount * 5) if cat_id <= 2 else 10
            message = f"Το AI δίνει έγκριση! Μια σοφή κίνηση. Κέρδισες {points} πόντους."
        else:
            status = "WARNING"
            points = 2
            message = "Το AI ανησυχεί. Αυτή η αγορά ίσως επηρεάσει τους στόχους σου. Σίγουρα το θες;"

        return {
            "status": status,
            "ai_confidence": f"{probability * 100:.2f}%",
            "message": message,
            "points_earned": points,
            "internal_prediction": int(prediction)
        }

# --- PRO TESTING SCENARIO ---
if __name__ == "__main__":
    brain = FinanceNN()
    
    # 1. Κανονικό Τεστ
    res = brain.analyze_transaction(20, "Βιβλία", 100)
    print(f"Απόφαση: {res['status']} | Μήνυμα: {res['message']}")

    # 2. Προσομοίωση διόρθωσης από γονέα (Αν το AI έκανε λάθος)
    # Έστω ότι το AI έκρινε λάθος μια αγορά. Ο γονέας λέει 'Όχι, αυτό είναι σωστό (1)'
    brain.teach_ai(20, "Gaming", 100, 1)