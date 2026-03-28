import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, ActivityIndicator, StatusBar 
} from "react-native";
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
  { q: "Τι σημαίνει 'Πληθωρισμός';", a: ["Όταν οι τιμες των πραγμάτων ανεβαίνουν", "Όταν τα χρήματα γίνονται πιο βαριά", "Όταν οι τράπεζες κλείνουν"], correct: 0 },
  { q: "Γιατί βάζουμε χρήματα σε 'Κουμπαράδες' (Pockets);", a: ["Για να τα κρύψουμε από όλους", "Για να πετύχουμε συγκεκριμένους στόχους", "Για να μην τα βλέπει η τράπεζα"], correct: 1 },
  { q: "Ποια είναι η διαφορά 'Ανάγκης' και 'Επιθυμίας';", a: ["Δεν υπάρχει διαφορά", "Ανάγκη είναι το φαγητό, επιθυμία ένα παιχνίδι", "Ανάγκη είναι το κινητό, επιθυμία το νερό"], correct: 1 },
  { q: "Τι κερδίζεις αν ξεκινήσεις να αποταμιεύεις από μικρός;", a: ["Τίποτα", "Τη δύναμη του ανατοκισμού (Compound Interest)", "Πονάνε τα χέρια σου"], correct: 1 },
];

export default function QuizScreen() {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [quizOver, setQuizOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const router = useRouter();

  const handleAnswer = (index: number) => {
    if (isAnswered) return; 

    setSelectedAnswer(index);
    setIsAnswered(true);

    if (index === QUIZ_DATA[currentQ].correct) {
      setScore(prev => prev + 10);
    }
  };

  const nextQuestion = () => {
    if (currentQ < QUIZ_DATA.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizOver(true);
      submitFinalScore(score);
    }
  };

  const submitFinalScore = async (finalScore: number) => {
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      if (!storedUser) return;
      const user = JSON.parse(storedUser);

      await fetch(`${API_URL}/api/update_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.id, amount: 0, points: finalScore })
      });
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const getOptionStyle = (index: number) => {
    if (!isAnswered) return styles.optionBtn;
    
    if (index === QUIZ_DATA[currentQ].correct) {
      return [styles.optionBtn, styles.correctBtn]; 
    }
    if (index === selectedAnswer && index !== QUIZ_DATA[currentQ].correct) {
      return [styles.optionBtn, styles.wrongBtn]; 
    }
    return [styles.optionBtn, { opacity: 0.5 }];
  };

  if (quizOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mainCenter}>
          <Ionicons name="trophy" size={100} color="#f1c40f" />
          <Text style={styles.title}>Τέλος Quiz! 🎉</Text>
          <Text style={styles.scoreText}>Κέρδισες {score} Coins 🪙</Text>
          <TouchableOpacity style={styles.finishBtn} onPress={() => router.replace("/dashboard")}>
            <Text style={styles.finishBtnText}>ΕΠΙΣΤΡΟΦΗ ΣΤΗΝ Αρχική</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* SIDE BAR ΜΕ ΟΛΑ ΤΑ TABS */}
      <View style={styles.sideBar}>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
            <Ionicons name="grid-outline" size={24} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sideIconActive}>
            <Ionicons name="school" size={24} color="#1a73e8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}>
            <Ionicons name="trophy-outline" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}>
            <Ionicons name="wallet-outline" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}>
            <Ionicons name="stats-chart-outline" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}>
            <Ionicons name="cart-outline" size={24} color="#666" />
          </TouchableOpacity>
      </View>

      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.progressText}>ΕΡΩΤΗΣΗ {currentQ + 1} / {QUIZ_DATA.length}</Text>
          <View style={styles.scoreBadge}><Text style={styles.scoreBadgeText}>🪙 {score}</Text></View>
        </View>

        <View style={styles.qCard}>
          <Text style={styles.question}>{QUIZ_DATA[currentQ].q}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {QUIZ_DATA[currentQ].a.map((option, index) => (
            <TouchableOpacity 
              key={index} 
              style={getOptionStyle(index)} 
              onPress={() => handleAnswer(index)}
              disabled={isAnswered}
            >
              <Text style={[styles.optionText, isAnswered && index === QUIZ_DATA[currentQ].correct && { color: '#fff' }]}>
                {option}
              </Text>
              {isAnswered && index === QUIZ_DATA[currentQ].correct && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
              {isAnswered && index === selectedAnswer && index !== QUIZ_DATA[currentQ].correct && <Ionicons name="close-circle" size={20} color="#fff" />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isAnswered && (
          <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
            <Text style={styles.nextBtnText}>{currentQ < QUIZ_DATA.length - 1 ? "ΕΠΟΜΕΝΗ ΕΡΩΤΗΣΗ" : "ΔΕΣ ΤΟ ΣΚΟΡ ΣΟΥ"}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  main: { flex: 1, padding: 25, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  progressText: { color: "#888", fontWeight: "bold" },
  scoreBadge: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, elevation: 2 },
  scoreBadgeText: { fontWeight: "bold", color: "#f39c12" },
  qCard: { backgroundColor: "#1a73e8", padding: 30, borderRadius: 30, marginBottom: 20 },
  question: { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: 'center' },
  optionBtn: { backgroundColor: "#fff", padding: 18, borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  correctBtn: { backgroundColor: "#2ecc71", borderColor: "#27ae60" },
  wrongBtn: { backgroundColor: "#e74c3c", borderColor: "#c0392b" },
  optionText: { fontSize: 16, fontWeight: "600", color: "#444", flex: 1 },
  nextBtn: { backgroundColor: "#1a73e8", padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 10 },
  nextBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  mainCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: "900", marginTop: 20 },
  scoreText: { fontSize: 24, color: "#2ecc71", fontWeight: "bold", marginVertical: 10 },
  finishBtn: { backgroundColor: "#1a73e8", padding: 20, borderRadius: 20, marginTop: 20 },
  finishBtnText: { color: "#fff", fontWeight: "bold" }
});