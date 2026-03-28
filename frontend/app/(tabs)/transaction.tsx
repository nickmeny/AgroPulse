import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView
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
      Alert.alert("Σφάλμα", "Παρακαλώ συμπληρώστε username και ποσό.");
      return;
    }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const response = await fetch(`${API_URL}/api/parent/transfer_to_kid`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kid_username: kidUsername.trim(), amount: parseFloat(amount) }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Επιτυχία! 🎉", data.message);
        setKidUsername(""); setAmount("");
        router.push("/dashboard");
      } else {
        Alert.alert("Αποτυχία", data.error || "Κάτι πήγε στραβά.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Δεν ήταν δυνατή η σύνδεση.");
    } finally { setLoading(false); }
  };

  // Αν είναι παιδί, δείχνουμε το κλειδωμένο UI με το Side Bar του παιδιού
  if (role === "kid") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.sideBar}>
           <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
             <Ionicons name="grid-outline" size={24} color="#666" />
           </TouchableOpacity>
           <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}>
             <Ionicons name="trophy-outline" size={24} color="#666" />
           </TouchableOpacity>
           <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}>
             <Ionicons name="wallet-outline" size={24} color="#666" />
           </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.infoText}>Μόνο οι γονείς στέλνουν χρήματα από εδώ.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* SIDE BAR ΓΙΑ ΓΟΝΕΑ */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
            <Ionicons name="grid-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideIconActive}>
            <Ionicons name="swap-horizontal" size={24} color="#1a73e8" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.sideIcon}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* ΚΥΡΙΟ ΠΕΡΙΕΧΟΜΕΝΟ */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Μεταφορά 💸</Text>
            <Text style={styles.subtitle}>Στείλτε χαρτζιλίκι άμεσα.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username Παιδιού</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput style={styles.input} placeholder="π.χ. giannis_10" value={kidUsername} onChangeText={setKidUsername} autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ποσό (€)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cash-outline" size={20} color="#666" />
                <TextInput style={styles.input} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleTransfer} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ΑΠΟΣΤΟΛΗ</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, justifyContent: 'space-between' },
  sideTop: { gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  scrollContent: { padding: 20, paddingTop: 50 },
  header: { marginBottom: 25 },
  title: { fontSize: 24, fontWeight: "900", color: "#333" },
  subtitle: { fontSize: 14, color: "#666" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 4 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: "bold", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f9f9", borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#eee' },
  input: { flex: 1, height: 45, marginLeft: 10 },
  button: { backgroundColor: "#1a73e8", height: 55, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  infoText: { textAlign: "center", color: "#888", marginTop: 15 }
});