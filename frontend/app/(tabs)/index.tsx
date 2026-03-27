import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// --- DYNAMIC IP LOGIC ---
const getApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
  }
  const ip = hostUri.split(":")[0];
  return `http://${ip}:5000`;
};

const API_URL = "http://192.168.199.153:5000";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [mode, setMode] = useState<"parent" | "kid">("parent");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [allowance, setAllowance] = useState("10");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Έλεγχος αν υπάρχει ήδη token για αυτόματο redirect (προαιρετικό)
  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync("userToken");
      if (token) {
        // router.replace("/(tabs)"); // Αν θες να μπαίνει αυτόματα αν έχει ξανασυνδεθεί
      }
    };
    checkToken();
  }, []);

  const handleAuth = async () => {
    if (!username || !password || (!isLogin && !email)) {
      Alert.alert("Προσοχή", "Συμπληρώστε όλα τα απαραίτητα πεδία.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      
      const payload: any = { 
        username: username.trim(), 
        password: password 
      };

      if (!isLogin) {
        payload.email = email.trim();
        payload.role = mode;
        if (mode === "kid") {
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
        if (isLogin) {
          // ΑΠΟΘΗΚΕΥΣΗ TOKEN ΚΑΙ REDIRECT
          await SecureStore.setItemAsync("userToken", data.token);
          await SecureStore.setItemAsync("userData", JSON.stringify(data.user));
          
          console.log("Login Success!");
          router.replace("/(tabs)"); 
        } else {
          Alert.alert("Επιτυχία", "Ο λογαριασμός δημιουργήθηκε! Κάντε είσοδο.");
          setIsLogin(true);
        }
      } else {
        Alert.alert("Αποτυχία", data.error || "Λάθος στοιχεία.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα Δικτύου", `Αδυναμία σύνδεσης στο ${API_URL}. Ελέγξτε αν τρέχει ο server.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logoText}>KippyBank</Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Καλώς ορίσατε ξανά" : "Δημιουργήστε λογαριασμό"}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              
              <View style={styles.rolePicker}>
                <TouchableOpacity 
                  style={[styles.roleBtn, mode === 'parent' && styles.roleBtnActive]} 
                  onPress={() => setMode('parent')}
                >
                  <Text style={mode === 'parent' ? styles.roleTextActive : styles.roleText}>Γονέας</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleBtn, mode === 'kid' && styles.roleBtnActive]} 
                  onPress={() => setMode('kid')}
                >
                  <Text style={mode === 'kid' ? styles.roleTextActive : styles.roleText}>Παιδί</Text>
                </TouchableOpacity>
              </View>

              {mode === 'kid' && (
                <TextInput
                  style={styles.input}
                  placeholder="Εβδομαδιαίο χαρτζιλίκι (€)"
                  value={allowance}
                  onChangeText={setAllowance}
                  keyboardType="numeric"
                />
              )}
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Κωδικός πρόσβασης"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.mainButton, loading && { opacity: 0.7 }]} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Είσοδος" : "Εγγραφή"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "Δεν έχετε λογαριασμό; Εγγραφείτε"
                : "Έχετε ήδη λογαριασμό; Σύνδεση"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerIp}>Connecting to: {API_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  inner: { flexGrow: 1, justifyContent: "center", padding: 25 },
  header: { alignItems: "center", marginBottom: 35 },
  logoText: { fontSize: 36, fontWeight: "900", color: "#1a73e8" },
  subtitle: { fontSize: 16, color: "#6c757d", marginTop: 5 },
  form: { width: "100%" },
  input: {
    backgroundColor: "#fff",
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  rolePicker: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#eee', borderRadius: 12, padding: 4 },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  roleBtnActive: { backgroundColor: '#fff' },
  roleText: { color: '#666', fontWeight: '600' },
  roleTextActive: { color: '#1a73e8', fontWeight: '700' },
  mainButton: { backgroundColor: "#1a73e8", height: 55, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 10, elevation: 3 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  switchButton: { marginTop: 20, alignItems: "center" },
  switchText: { color: "#1a73e8", fontSize: 14, fontWeight: "500" },
  footerIp: { textAlign: 'center', marginTop: 30, fontSize: 10, color: '#bbb' }
});