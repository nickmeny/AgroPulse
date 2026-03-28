import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_URL = "http://192.168.199.153:5000";

export default function TransactionScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [kidUsername, setKidUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUserRole = async () => {
      const storedUser = await SecureStore.getItemAsync("userData");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setRole(user.role);
      }
    };
    getUserRole();
  }, []);

  const handleTransfer = async () => {
    if (!kidUsername || !amount) {
      Alert.alert("Σφάλμα", "Παρακαλώ συμπληρώστε το username του παιδιού και το ποσό.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      
      const response = await fetch(`${API_URL}/api/parent/transfer_to_kid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kid_username: kidUsername.trim(),
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Επιτυχία! 🎉", data.message);
        setKidUsername("");
        setAmount("");
        // Προαιρετικά: Επιστροφή στο Dashboard για να δει το νέο balance
        router.push("/dashboard");
      } else {
        Alert.alert("Αποτυχία", data.error || "Κάτι πήγε στραβά.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Δεν ήταν δυνατή η σύνδεση με τον διακομιστή.");
    } finally {
      setLoading(false);
    }
  };

  if (role === "kid") {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={64} color="#ccc" />
        <Text style={styles.infoText}>
          Μόνο οι γονείς μπορούν να ξεκινήσουν μεταφορές χρημάτων από εδώ.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Μεταφορά Χρημάτων 💸</Text>
          <Text style={styles.subtitle}>Στείλτε χαρτζιλίκι στο παιδί σας άμεσα.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username Παιδιού</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="π.χ. giannis_2010"
                value={kidUsername}
                onChangeText={setKidUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ποσό (€)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="cash-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleTransfer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>ΑΠΟΣΤΟΛΗ ΤΩΡΑ</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={20} color="#1a73e8" />
          <Text style={styles.noteText}>
            Τα χρήματα αφαιρούνται από το δικό σας υπόλοιπο και προστίθενται αμέσως στον λογαριασμό του παιδιού.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  scrollContent: { padding: 25, paddingTop: 60 },
  header: { marginBottom: 30 },
  title: { fontSize: 26, fontWeight: "900", color: "#1a73e8" },
  subtitle: { fontSize: 15, color: "#666", marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 25, padding: 25, elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 8, marginLeft: 5 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 15,
    paddingHorizontal: 15,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: "#333" },
  button: {
    backgroundColor: "#1a73e8",
    flexDirection: "row",
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 1 },
  infoText: { textAlign: "center", color: "#888", marginTop: 20, fontSize: 16 },
  noteBox: {
    flexDirection: "row",
    backgroundColor: "#e8f0fe",
    padding: 15,
    borderRadius: 15,
    marginTop: 25,
    alignItems: "center",
    gap: 10,
  },
  noteText: { flex: 1, fontSize: 13, color: "#1a73e8", lineHeight: 18 },
});