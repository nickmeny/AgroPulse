import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, StatusBar
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- SIDE BAR --- */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
            <Ionicons name="grid-outline" size={24} color="#666" />
          </TouchableOpacity>
          
          {role === 'kid' ? (
            <>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/quiz")}>
                <Ionicons name="school-outline" size={24} color="#666" />
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
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/accept")}>
                <Ionicons name="checkmark-circle-outline" size={26} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideIconActive}>
                <Ionicons name="swap-horizontal" size={26} color="#1a73e8" />
              </TouchableOpacity>
            </>
          )}
        </View>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.sideIcon}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* --- MAIN CONTENT --- */}
      {role === "kid" ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.infoText}>Μόνο οι γονείς μπορούν να στείλουν χρήματα από αυτό το μενού.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Μεταφορά 💸</Text>
              <Text style={styles.subtitle}>Στείλτε χαρτζιλίκι στο παιδί σας άμεσα.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username Παιδιού</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="π.χ. giannis_10" 
                    value={kidUsername} 
                    onChangeText={setKidUsername} 
                    autoCapitalize="none" 
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ποσό (€)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="cash-outline" size={20} color="#666" />
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
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ΑΠΟΣΤΟΛΗ ΧΡΗΜΑΤΩΝ</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, justifyContent: 'space-between' },
  sideTop: { gap: 25, alignItems: 'center' },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  scrollContent: { padding: 25, paddingTop: 60 },
  header: { marginBottom: 25 },
  title: { fontSize: 26, fontWeight: "900", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 25, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: "bold", marginBottom: 8, color: '#444' },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f9f9", borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#eee' },
  input: { flex: 1, height: 50, marginLeft: 10, fontSize: 16 },
  button: { backgroundColor: "#1a73e8", height: 60, borderRadius: 15, justifyContent: "center", alignItems: "center", marginTop: 15 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  infoText: { textAlign: "center", color: "#888", marginTop: 15, fontSize: 15, lineHeight: 22 }
});