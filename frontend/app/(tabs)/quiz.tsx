import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://192.168.199.153:5000";

const QUIZ_DATA = [
  { q: "Τι είναι ο 'Προϋπολογισμός' (Budget);", a: ["Σχέδιο για το πώς ξοδεύουμε/αποταμιεύουμε", "Ένα είδος βιντεοπαιχνιδιού", "Το όνομα μιας τράπεζας"], correct: 0 },
  { q: "Τι σημαίνει 'Αποταμίευση';", a: ["Ξοδεύω όλα μου τα χρήματα", "Κρατάω χρήματα για το μέλλον", "Δανείζομαι χρήματα από φίλους"], correct: 1 },
  { q: "Τι είναι ο 'Τόκος' στην τράπεζα;", a: ["Πρόστιμο", "Αμοιβή που παίρνεις επειδή αποταμιεύεις", "Το χαρτί της απόδειξης"], correct: 1 },
  { q: "Ποιο είναι το πιο σημαντικό πριν αγοράσεις κάτι;", a: ["Να δεις αν το έχουν οι φίλοι σου", "Να δεις αν το χρειάζεσαι πραγματικά", "Να είναι το πιο ακριβό"], correct: 1 },
  { q: "Τι είναι μια 'Επένδυση';", a: ["Αγοράζω κάτι ελπίζοντας να αυξηθεί η αξία του", "Χάνω χρήματα επίτηδες", "Αγοράζω γλυκά"], correct: 0 },
  { q: "Τι είναι το 'Παθητικό Εισόδημα';", a: ["Χρήματα που βγάζεις ενώ κοιμάσαι/ξεκουράζεσαι", "Χρήματα που σου δίνουν οι γονείς", "Χρήματα που βρίσκεις στο δρόμο"], correct: 0 },
  { q: "Τι σημαίνει 'Πληθωρισμός';", a: ["Όταν οι τιμές των πραγμάτων ανεβαίνουν", "Όταν τα χρήματα γίνονται πιο βαριά", "Όταν οι τράπεζες κλείνουν"], correct: 0 },
  { q: "Γιατί βάζουμε χρήματα σε 'Κουμπαράδες' (Pockets);", a: ["Για να τα κρύψουμε από όλους", "Για να πετύχουμε συγκεκριμένους στόχους", "Για να μην τα βλέπει η τράπεζα"], correct: 1 },
  { q: "Ποια είναι η διαφορά 'Ανάγκης' και 'Επιθυμίας';", a: ["Δεν υπάρχει διαφορά", "Ανάγκη είναι το φαγητό, επιθυμία ένα παιχνίδι", "Ανάγκη είναι το κινητό, επιθυμία το νερό"], correct: 1 },
  { q: "Τι κερδίζεις αν ξεκινήσεις να αποταμιεύεις από μικρός;", a: ["Τίποτα", "Τη δύναμη του ανατοκισμού (Compound Interest)", "Πονάνε τα χέρια σου"], correct: 1 },
];

export default function QuizScreen() {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [quizOver, setQuizOver] = useState(false);
  const router = useRouter();

  const handleAnswer = (index: number) => {
    if (index === QUIZ_DATA[currentQ].correct) {
      setScore(score + 10); // 10 Coins για κάθε σωστή απάντηση
    }

    if (currentQ < QUIZ_DATA.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setQuizOver(true);
      submitScore();
    }
  };

  const submitScore = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");
      
      // Στέλνουμε τα κέρδη στο backend (χρησιμοποιώντας το update_balance με θετικό ποσό για coins)
      // Σημείωση: Στο backend σου, βεβαιώσου ότι το update_balance δέχεται πόντους ή φτιάξε ένα /api/add_points
      await fetch(`${API_URL}/api/update_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.id, amount: 0, points: score + 10 }) // Δίνουμε τους πόντους
      });
    } catch (e) { console.error(e); }
  };

  if (quizOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mainCenter}>
          <Ionicons name="trophy" size={80} color="#f39c12" />
          <Text style={styles.title}>Συγχαρητήρια! 🎉</Text>
          <Text style={styles.scoreText}>Κέρδισες {score} Coins!</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace("/dashboard")}>
            <Text style={styles.btnText}>ΕΠΙΣΤΡΟΦΗ ΣΤΟ DASHBOARD</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* SIDE BAR */}
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}><Ionicons name="grid-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIconActive}><Ionicons name="school" size={24} color="#1a73e8" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}><Ionicons name="trophy-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}><Ionicons name="stats-chart-outline" size={24} color="#666" /></TouchableOpacity>
      </View>

      <View style={styles.main}>
        <Text style={styles.progressText}>Ερώτηση {currentQ + 1} από {QUIZ_DATA.length}</Text>
        <View style={styles.qCard}>
          <Text style={styles.question}>{QUIZ_DATA[currentQ].q}</Text>
        </View>

        {QUIZ_DATA[currentQ].a.map((option, index) => (
          <TouchableOpacity key={index} style={styles.optionBtn} onPress={() => handleAnswer(index)}>
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  main: { flex: 1, padding: 20, paddingTop: 60 },
  mainCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  progressText: { color: "#888", fontWeight: "bold", marginBottom: 10, letterSpacing: 1 },
  qCard: { backgroundColor: "#fff", padding: 25, borderRadius: 25, marginBottom: 30, elevation: 4 },
  question: { fontSize: 20, fontWeight: "800", color: "#333", textAlign: 'center' },
  optionBtn: { backgroundColor: "#fff", padding: 20, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: "#eee", elevation: 2 },
  optionText: { fontSize: 16, fontWeight: "600", color: "#444" },
  title: { fontSize: 28, fontWeight: "900", marginTop: 20 },
  scoreText: { fontSize: 22, color: "#2ecc71", fontWeight: "bold", marginVertical: 10 },
  btn: { backgroundColor: "#1a73e8", padding: 20, borderRadius: 15, marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "bold" }
});