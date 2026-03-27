import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "http://192.168.199.153:5000"; 

type AuthMode = "LOGIN" | "REGISTER_PARENT" | "REGISTER_KID";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(""); 
  const [allowance, setAllowance] = useState("10");
  const [parentUsername, setParentUsername] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert("Σφάλμα", "Συμπληρώστε username και κωδικό.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "LOGIN" ? "/api/login" : "/api/register";
      let payload: any = { username: username.trim(), password: password };

      if (mode !== "LOGIN") {
        payload.role = mode === "REGISTER_KID" ? "kid" : "parent";
        payload.email = email.trim() || `${username}@kippy.com`;
        if (mode === "REGISTER_KID") {
          payload.weekly_allowance = parseFloat(allowance) || 0;
          payload.parent_username = parentUsername.trim();
          payload.parent_password = parentPassword;
        }
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === "LOGIN") {
          await SecureStore.setItemAsync("userToken", data.token);
          await SecureStore.setItemAsync("userData", JSON.stringify(data.user));
          router.replace("/(tabs)/dashboard"); 
        } else {
          Alert.alert("Επιτυχία!", "Ο λογαριασμός δημιουργήθηκε.");
          setMode("LOGIN");
        }
      } else {
        Alert.alert("Αποτυχία", data.error || "Ελέγξτε τα στοιχεία σας.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Δεν βρέθηκε ο server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>KippyBank 🏦</Text>
          <Text style={styles.subtitle}>Smart Finance for Families</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setMode("LOGIN")} style={[styles.tab, mode === "LOGIN" && styles.activeTab]}>
            <Text style={[styles.tabLabel, mode === "LOGIN" && styles.activeTabLabel]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("REGISTER_PARENT")} style={[styles.tab, mode === "REGISTER_PARENT" && styles.activeTab]}>
            <Text style={[styles.tabLabel, mode === "REGISTER_PARENT" && styles.activeTabLabel]}>+Γονέας</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("REGISTER_KID")} style={[styles.tab, mode === "REGISTER_KID" && styles.activeTab]}>
            <Text style={[styles.tabLabel, mode === "REGISTER_KID" && styles.activeTabLabel]}>+Παιδί</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          {mode !== "LOGIN" && <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />}
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          {mode === "REGISTER_KID" && (
            <View style={styles.parentSection}>
              <Text style={styles.parentTitle}>ΕΓΚΡΙΣΗ ΓΟΝΕΑ 🛡️</Text>
              <TextInput style={styles.input} placeholder="Username Γονέα" value={parentUsername} onChangeText={setParentUsername} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Password Γονέα" value={parentPassword} onChangeText={setParentPassword} secureTextEntry />
              <TextInput style={styles.input} placeholder="Χαρτζιλίκι (€)" value={allowance} onChangeText={setAllowance} keyboardType="numeric" />
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === "LOGIN" ? "ΕΙΣΟΔΟΣ" : "ΕΓΓΡΑΦΗ"}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa" },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 30 },
  logo: { fontSize: 32, fontWeight: "900", color: "#1a73e8" },
  subtitle: { fontSize: 14, color: "#666" },
  tabContainer: { flexDirection: "row", backgroundColor: "#e0e0e0", borderRadius: 12, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#fff" },
  tabLabel: { fontWeight: "bold", color: "#666", fontSize: 12 },
  activeTabLabel: { color: "#1a73e8" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 5 },
  input: { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 15, marginBottom: 12 },
  parentSection: { backgroundColor: "#f0f7ff", padding: 15, borderRadius: 15, marginBottom: 10 },
  parentTitle: { fontSize: 11, fontWeight: "bold", color: "#1a73e8", marginBottom: 10 },
  button: { backgroundColor: "#1a73e8", padding: 18, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});