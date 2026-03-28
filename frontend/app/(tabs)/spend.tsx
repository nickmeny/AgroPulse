import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, SafeAreaView, ScrollView 
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

const CATEGORIES = [
  { id: "Books", icon: "book-outline", label: "Βιβλία" },
  { id: "Games", icon: "game-controller-outline", label: "Games" },
  { id: "Food", icon: "fast-food-outline", label: "Φαγητό" },
  { id: "General", icon: "basket-outline", label: "Άλλο" },
];

export default function SpendScreen() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const data = await SecureStore.getItemAsync("userData");
      if (data) setUser(JSON.parse(data));
    };
    loadUser();
  }, []);

  const handleSpend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Προσοχή", "Βάλε ένα έγκυρο ποσό.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const res = await fetch(`${API_URL}/api/update_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: user.id,
          amount: -parseFloat(amount), // Αρνητικό για έξοδο
          category: category,
          description: `Αγορά ${category}`
        })
      });

      const data = await res.json();
      if (res.ok) {
        const pts = data.ai_analysis?.points_earned || 0;
        Alert.alert("Η αγορά καταγράφηκε! 💸", `Κέρδισες ${pts} πόντους!`);
        router.replace("/dashboard");
      } else {
        Alert.alert("Σφάλμα", data.error || "Δεν έχεις αρκετά χρήματα.");
      }
    } catch (e) {
      Alert.alert("Σφάλμα", "Αποτυχία σύνδεσης.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* SIDE BAR (Παιδικό) */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
            <Ionicons name="grid-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}>
            <Ionicons name="trophy-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}>
            <Ionicons name="wallet-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideIconActive}>
            <Ionicons name="cart" size={24} color="#1a73e8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.title}>Νέα Αγορά 🛍️</Text>
        <Text style={styles.subtitle}>Τι ξόδεψες σήμερα;</Text>

        <View style={styles.inputCard}>
          <Text style={styles.label}>ΠΟΣΟ ΣΕ ΕΥΡΩ</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>€</Text>
            <TextInput 
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>
        </View>

        <Text style={styles.label}>ΔΙΑΛΕΞΕ ΚΑΤΗΓΟΡΙΑ</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={[styles.catCard, category === item.id && styles.catCardActive]}
              onPress={() => setCategory(item.id)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={28} 
                color={category === item.id ? "#fff" : "#1a73e8"} 
              />
              <Text style={[styles.catLabel, category === item.id && {color: "#fff"}]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.spendBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSpend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.spendBtnText}>ΚΑΤΑΧΩΡΗΣΗ ΤΩΡΑ</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40 },
  sideTop: { gap: 25, alignItems: 'center' },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  main: { flex: 1, padding: 25, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "900", color: "#333" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30 },
  inputCard: { backgroundColor: "#fff", padding: 20, borderRadius: 25, elevation: 4, marginBottom: 30 },
  label: { fontSize: 12, fontWeight: "bold", color: "#999", marginBottom: 15, letterSpacing: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 30, fontWeight: "900", color: "#1a73e8", marginRight: 10 },
  amountInput: { fontSize: 45, fontWeight: "900", color: "#333", flex: 1 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 40 },
  catCard: { 
    width: "47%", backgroundColor: "#fff", padding: 20, borderRadius: 20, 
    alignItems: 'center', borderWidth: 1, borderColor: "#eee" 
  },
  catCardActive: { backgroundColor: "#1a73e8", borderColor: "#1a73e8" },
  catLabel: { marginTop: 10, fontWeight: "bold", color: "#444" },
  spendBtn: { 
    backgroundColor: "#1c1c1e", padding: 22, borderRadius: 20, 
    alignItems: "center", elevation: 8, shadowColor: "#000", 
    shadowOpacity: 0.2, shadowRadius: 10 
  },
  spendBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 1 }
});