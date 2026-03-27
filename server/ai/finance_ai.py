import numpy as np
from sklearn.neural_network import MLPClassifier
import random
import joblib
import os

class FinanceNN:
    def __init__(self, model_file="finance_model.pkl"):
        self.category_map = {"Βιβλία": 1, "Αποταμίευση": 2, "Gaming": 3, "Γλυκά": 4}
        self.model_file = model_file
        # Εδώ θα κρατάμε το ιστορικό για το Behavioral AI
        self.transaction_history = [] 
        
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

    # --- BEHAVIORAL: Προσθήκη στο ιστορικό ---
    def _add_to_history(self, amount, cat_id, ai_label):
        self.transaction_history.append((amount, cat_id, ai_label))
        # Κρατάμε μόνο τις τελευταίες 20 συναλλαγές για να μην γεμίσει η RAM
        if len(self.transaction_history) > 20:
            self.transaction_history.pop(0)

    def analyze_transaction(self, amount, category_name, balance):
        cat_id = self.category_map.get(category_name, 3)
        percentage = amount / balance if balance > 0 else 1
        
        prediction = self.model.predict([[amount, cat_id, balance, percentage]])[0]
        probability = self.model.predict_proba([[amount, cat_id, balance, percentage]])[0][1]

        if prediction == 1:
            status = "APPROVED"
            points = int(amount * 5) if cat_id <= 2 else 10
            message = f"Το AI δίνει έγκριση! Μια σοφή κίνηση. Κέρδισες {points} πόντους."
        else:
            status = "WARNING"
            points = 2
            message = "Το AI ανησυχεί. Αυτή η αγορά ίσως επηρεάσει τους στόχους σου. Σίγουρα το θες;"

        # Ενημέρωση ιστορικού για το Behavioral AI
        self._add_to_history(amount, cat_id, prediction)

        return {
            "status": status,
            "ai_confidence": f"{probability * 100:.2f}%",
            "message": message,
            "points_earned": points,
            "internal_prediction": int(prediction)
        }

    # --- BEHAVIORAL: Πρόβλεψη Στόχου ---
    def predict_goal_timeframe(self, target_amount, weekly_allowance, current_savings=0):
        if len(self.transaction_history) < 3:
            return {"error": "Χρειάζομαι περισσότερο ιστορικό για να προβλέψω."}

        total_spent = sum(t[0] for t in self.transaction_history)
        risky_spent = sum(t[0] for t in self.transaction_history if t[2] == 0)
        risky_ratio = risky_spent / total_spent if total_spent > 0 else 0

        # Υπολογίζουμε μέσο όρο εξόδων ανά εβδομάδα (υποθετικά 3 αγορές/βδομάδα)
        avg_weekly_spend = (total_spent / len(self.transaction_history)) * 3
        real_savings = weekly_allowance - avg_weekly_spend

        if real_savings <= 0:
            return {
                "weeks_left": "Άπειρες",
                "advice": "Προσοχή! Ξοδεύεις περισσότερα από όσα αποταμιεύεις. Ο στόχος απομακρύνεται!",
                "status": "CRITICAL"
            }

        weeks_needed = (target_amount - current_savings) / real_savings
        
        # Behavioral Penalty
        if risky_ratio > 0.4:
            weeks_needed *= 1.2
            advice = "Το AI βλέπει τάση παρορμητικών αγορών. Αν συνεχίσεις έτσι, ο στόχος θα καθυστερήσει 20%."
        else:
            advice = "Είσαι σε καλό δρόμο! Συνέχισε έτσι για να πάρεις τον στόχο σου στην ώρα του."

        return {
            "weeks_left": round(weeks_needed, 1),
            "advice": advice,
            "monthly_savings_est": round(real_savings * 4, 2)
        }

# --- ΤΕΣΤ ΛΕΙΤΟΥΡΓΙΑΣ ---
if __name__ == "__main__":
    brain = FinanceNN()
    
    # Προσομοίωση ιστορικού (3 αγορές)
    brain.analyze_transaction(10, "Γλυκά", 100)
    brain.analyze_transaction(50, "Gaming", 90)
    brain.analyze_transaction(20, "Βιβλία", 40)
    
    # Πρόβλεψη για PC 1000€ με χαρτζιλίκι 50€/βδομάδα
    prediction = brain.predict_goal_timeframe(1000, 50)
    print(f"\nΣυμβουλή AI: {prediction['advice']}")
    print(f"Εκτιμώμενες εβδομάδες: {prediction['weeks_left']}")