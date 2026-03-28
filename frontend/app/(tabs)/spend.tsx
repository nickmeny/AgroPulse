import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

// Οι κατηγορίες που αναγνωρίζει το AI σου
const CATEGORIES = ["Βιβλία", "Αποταμίευση", "Gaming", "Γλυκά", "Άλλο"];

export default function SpendScreen() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Άλλο");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSpend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Προσοχή", "Βάλε ένα έγκυρο ποσό.");
      return;
    }
    
    setLoading(true);
    try {
      const userData = await SecureStore.getItemAsync("userData");
      const token = await SecureStore.getItemAsync("userToken");
      const user = JSON.parse(userData || "{}");

      const res = await fetch(`${API_URL}/api/update_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          user_id: user.id, 
          amount: -parseFloat(amount), 
          category: category,
          description: description 
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Ενημέρωση ότι το αίτημα στάλθηκε
        Alert.alert(
          "Αίτημα Εστάλη! ⏳", 
          "Η αγορά σου περιμένει έγκριση από τον γονέα. Μόλις εγκριθεί, θα πάρεις και τους πόντους σου!"
        );
        router.replace("/dashboard");
      } else {
        Alert.alert("Σφάλμα", data.error || "Κάτι πήγε στραβά.");
      }
    } catch (e) {
      Alert.alert("Σφάλμα", "Δεν ήταν δυνατή η σύνδεση με τον διακομιστή.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* SIDE BAR */}
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}><Ionicons name="grid-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/quiz")}><Ionicons name="school-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}><Ionicons name="trophy-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}><Ionicons name="wallet-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}><Ionicons name="stats-chart-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIconActive}><Ionicons name="cart" size={24} color="#1a73e8" /></TouchableOpacity>
      </View>

      <ScrollView style={styles.main}>
        <Text style={styles.title}>Νέα Αγορά 🛍️</Text>
        
        <Text style={styles.label}>ΠΟΣΟ (€)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="0.00" 
          keyboardType="numeric" 
          value={amount} 
          onChangeText={setAmount} 
        />

        <Text style={styles.label}>ΤΙ ΘΕΛΕΙΣ ΝΑ ΑΓΟΡΑΣΕΙΣ;</Text>
        <TextInput 
          style={styles.inputSmall} 
          placeholder="π.χ. Παπούτσια, Παιχνίδι..." 
          value={description} 
          onChangeText={setDescription} 
        />

        <Text style={styles.label}>ΚΑΤΗΓΟΡΙΑ (ΓΙΑ ΤΟ AI)</Text>
        <View style={styles.catContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catChip, category === cat && styles.catChipActive]} 
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.btn, loading && { opacity: 0.7 }]} 
          onPress={handleSpend} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>ΖΗΤΗΣΕ ΕΓΚΡΙΣΗ</Text>}
        </TouchableOpacity>
        
        <Text style={styles.infoText}>
          * Τα χρήματα θα αφαιρεθούν μόνο αφού ο γονέας πατήσει "Έγκριση".
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  main: { flex: 1, padding: 25, paddingTop: 50 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 30, color: "#1c1c1e" },
  label: { fontSize: 12, fontWeight: "bold", color: "#888", marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: "#fff", padding: 20, borderRadius: 18, fontSize: 32, fontWeight: "bold", marginBottom: 20, elevation: 2 },
  inputSmall: { backgroundColor: "#fff", padding: 15, borderRadius: 15, fontSize: 16, marginBottom: 20, elevation: 2 },
  catContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  catChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  catChipActive: { backgroundColor: "#1a73e8", borderColor: "#1a73e8" },
  catText: { color: "#666", fontWeight: "600" },
  catTextActive: { color: "#fff" },
  btn: { backgroundColor: "#1c1c1e", padding: 22, borderRadius: 18, alignItems: 'center', elevation: 4, marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  infoText: { textAlign: 'center', color: "#888", fontSize: 12, marginTop: 20, fontStyle: 'italic' }
});