import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// --- DYNAMIC IP LOGIC ---
const getApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri; // Παίρνει την IP του PC που τρέχει το Metro
  if (!hostUri) {
    // Fallback για Emulators
    return Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
  }
  const ip = hostUri.split(":")[0];
  return `http://${ip}:5000`;
};

const API_URL = getApiUrl();

type AuthMode = "LOGIN" | "REGISTER_PARENT" | "REGISTER_KID";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [allowance, setAllowance] = useState("10");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Debugging: Δες στην κονσόλα πού προσπαθεί να συνδεθεί
  useEffect(() => {
    console.log("KippyBank Backend Target:", API_URL);
  }, []);

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert("Προσοχή", "Συμπληρώστε username και κωδικό.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "LOGIN" ? "/api/login" : "/api/register";
      
      // Κατασκευή του payload ακριβώς όπως το θέλει το Flask σου
      const payload: any = { 
        username: username.trim(), 
        password: password 
      };

      if (mode !== "LOGIN") {
        payload.email = email.trim() || `${username}@kippy.com`;
        payload.role = mode === "REGISTER_KID" ? "kid" : "parent";
        if (mode === "REGISTER_KID") {
          payload.weekly_allowance = parseFloat(allowance) || 0;
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
          // ΑΠΟΘΗΚΕΥΣΗ JWT & USER DATA
          await SecureStore.setItemAsync("userToken", data.token);
          await SecureStore.setItemAsync("userData", JSON.stringify(data.user));
          
          console.log("Login Success! Token saved.");
          router.replace("/(tabs)"); // Πλοήγηση στο main app
        } else {
          Alert.alert("Επιτυχία", "Ο λογαριασμός δημιουργήθηκε! Συνδεθείτε.");
          setMode("LOGIN");
        }
      } else {
        Alert.alert("Αποτυχία", data.error || "Λάθος στοιχεία.");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert(
        "Σφάλμα Δικτύου",
        `Δεν μπόρεσα να βρω το Kippy API στο ${API_URL}.\n\n1. Τρέχει το Flask?\n2. Είσαι στο ίδιο WiFi;`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>KippyBank 🏦</Text>
          <Text style={styles.infoText}>Connecting to: {API_URL}</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setMode("LOGIN")} style={[styles.tab, mode === "LOGIN" && styles.activeTab]}>
            <Text style={[styles.tabLabel, mode === "LOGIN" && styles.activeTabLabel]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("REGISTER_PARENT")} style={[styles.tab, mode === "REGISTER_PARENT" && styles.activeTab]}>
            <Text style={[styles.tabLabel, mode === "REGISTER_PARENT" && styles.activeTabLabel]}>Γονέας</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("REGISTER_KID")} style={[styles.tab, mode === "REGISTER_KID" && styles.activeTab]}>
            <Text style={[styles.tabLabel, mode === "REGISTER_KID" && styles.activeTabLabel]}>Παιδί</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {mode !== "LOGIN" && (
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {mode === "REGISTER_KID" && (
            <View style={styles.allowanceContainer}>
              <Text style={styles.label}>Weekly Allowance (€)</Text>
              <TextInput
                style={styles.input}
                value={allowance}
                onChangeText={setAllowance}
                keyboardType="numeric"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "LOGIN" ? "ΕΙΣΟΔΟΣ" : "ΕΓΓΡΑΦΗ"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  scrollContent: { padding: 25, flexGrow: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 30 },
  logo: { fontSize: 38, fontWeight: "900", color: "#1a73e8", letterSpacing: -1 },
  infoText: { fontSize: 10, color: "#999", marginTop: 5 },
  tabContainer: { flexDirection: "row", backgroundColor: "#ddd", borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#fff" },
  tabLabel: { fontSize: 13, fontWeight: "600", color: "#666" },
  activeTabLabel: { color: "#1a73e8" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  input: { height: 55, backgroundColor: "#f8f9fa", borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: "#eee", fontSize: 16 },
  label: { fontSize: 14, color: "#555", marginBottom: 5, marginLeft: 5, fontWeight: "600" },
  allowanceContainer: { marginTop: 5 },
  button: { backgroundColor: "#1a73e8", height: 55, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "800" },
});