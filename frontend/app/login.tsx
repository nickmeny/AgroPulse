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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- ΡΥΘΜΙΣΗ IP (Βεβαιώσου ότι είναι η σωστή IP του WSL σου) ---
const API_URL = "http://192.168.199.153:5000"; 

type AuthMode = "LOGIN" | "REGISTER_PARENT" | "REGISTER_KID";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- ΣΤΟΙΧΕΙΑ ΧΡΗΣΤΗ (Γονέα ή Παιδιού) ---
  const [username, setUsername] = useState(""); // Εδώ μπαίνει το όνομα παιδιού ή γονέα
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(""); // Απαραίτητο για τη βάση

  // --- ΣΤΟΙΧΕΙΑ ΠΑΙΔΙΟΥ ---
  const [allowance, setAllowance] = useState("10");
  const [isKidLogin, setIsKidLogin] = useState(false);

  // --- ΣΤΟΙΧΕΙΑ ΓΟΝΕΑ (Για επιβεβαίωση) ---
  const [parentUsername, setParentUsername] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  const handleAuth = async () => {
    // Βασικός έλεγχος κενών πεδίων
    if (!username || !password) {
      Alert.alert("Σφάλμα", "Συμπληρώστε όνομα και κωδικό.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "LOGIN" ? "/api/login" : "/api/register";
      
      // Κατασκευή του αντικειμένου που θα σταλεί (Payload)
      let payload: any = {
        username: username.trim(),
        password: password,
      };

      if (mode === "LOGIN") {
        // Αν είναι Login παιδιού, στέλνουμε και τα στοιχεία γονέα για έγκριση
        if (isKidLogin) {
          payload.parent_username = parentUsername.trim();
          payload.parent_password = parentPassword;
        }
      } else {
        // --- REGISTER LOGIC ---
        payload.role = mode === "REGISTER_KID" ? "kid" : "parent";
        
        // SOS: Το email είναι nullable=False στη βάση, οπότε πρέπει να στείλουμε κάτι οπωσδήποτε
        payload.email = email.trim() || `${username}@kippybank.com`;

        if (mode === "REGISTER_KID") {
          payload.weekly_allowance = parseFloat(allowance) || 0;
          payload.parent_username = parentUsername.trim(); // Για να βρει ο σερβερ το parent_id
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
          router.replace("/(tabs)"); 
        } else {
          Alert.alert("Επιτυχία!", "Ο λογαριασμός δημιουργήθηκε. Κάντε είσοδο.");
          setMode("LOGIN");
        }
      } else {
        Alert.alert("Αποτυχία", data.error || "Ελέγξτε τα στοιχεία σας.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Σφάλμα Δικτύου", "Δεν βρέθηκε ο σερβερ. Τρέχει το Flask;");
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

        {/* Tab Selection */}
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
          {/* Αν είναι Login, ρωτάμε αν είναι παιδί */}
          {mode === "LOGIN" && (
            <View style={styles.switchRow}>
              <Text style={styles.label}>Είσοδος ως Παιδί;</Text>
              <Switch value={isKidLogin} onValueChange={setIsKidLogin} trackColor={{ true: '#1a73e8' }} />
            </View>
          )}

          <Text style={styles.inputLabel}>{mode === "REGISTER_KID" ? "Όνομα Παιδιού" : "Username"}</Text>
          <TextInput style={styles.input} placeholder="π.χ. stelios_jr" value={username} onChangeText={setUsername} autoCapitalize="none" />

          {mode !== "LOGIN" && (
            <>
              <Text style={styles.inputLabel}>Email {mode === "REGISTER_KID" && "(Προαιρετικό)"}</Text>
              <TextInput style={styles.input} placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </>
          )}

          <Text style={styles.inputLabel}>Κωδικός {mode === "REGISTER_KID" ? "Παιδιού" : ""}</Text>
          <TextInput style={styles.input} placeholder="********" value={password} onChangeText={setPassword} secureTextEntry />

          {/* ΠΕΔΙΑ ΓΟΝΕΑ (Εμφανίζονται στην Εγγραφή Παιδιού ή στο Kid Login) */}
          {(mode === "REGISTER_KID" || (mode === "LOGIN" && isKidLogin)) && (
            <View style={styles.parentSection}>
              <Text style={styles.parentSectionTitle}>ΕΓΚΡΙΣΗ ΓΟΝΕΑ 🛡️</Text>
              <TextInput style={styles.input} placeholder="Username Γονέα" value={parentUsername} onChangeText={setParentUsername} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Password Γονέα" value={parentPassword} onChangeText={setParentPassword} secureTextEntry />
              
              {mode === "REGISTER_KID" && (
                <>
                  <Text style={styles.inputLabel}>Εβδομαδιαίο Χαρτζιλίκι (€)</Text>
                  <TextInput style={styles.input} value={allowance} onChangeText={setAllowance} keyboardType="numeric" />
                </>
              )}
            </View>
          )}

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === "LOGIN" ? "ΕΠΙΒΕΒΑΙΩΣΗ" : "ΔΗΜΙΟΥΡΓΙΑ"}</Text>}
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
  tabLabel: { fontWeight: "bold", color: "#666" },
  activeTabLabel: { color: "#1a73e8" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 5, color: "#444" },
  input: { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 15, marginBottom: 15 },
  parentSection: { backgroundColor: "#f0f7ff", padding: 15, borderRadius: 15, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: "#1a73e8" },
  parentSectionTitle: { fontSize: 12, fontWeight: "bold", color: "#1a73e8", marginBottom: 10 },
  button: { backgroundColor: "#1a73e8", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600" }
});