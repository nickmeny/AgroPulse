import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function SetGoalScreen() {
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSetGoal = async () => {
    if (!goalName || !goalAmount) {
      Alert.alert("Προσοχή! ⚠️", "Πρέπει να γράψεις τι θέλεις να πάρεις και πόσο κάνει!");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      if (!storedUser) return;
      const user = JSON.parse(storedUser);

      const response = await fetch(`${API_URL}/api/set_goal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          goal_name: goalName,
          goal_amount: parseFloat(goalAmount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Τέλεια! 🚀", `Ο στόχος σου για "${goalName}" ορίστηκε! Το AI άρχισε ήδη τους υπολογισμούς.`);
        router.replace("/dashboard");
      } else {
        Alert.alert("Σφάλμα", data.error || "Κάτι πήγε στραβά.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα Σύνδεσης", "Δεν μπόρεσα να επικοινωνήσω με την Kippy Bank.");
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="rocket" size={50} color="#1a73e8" />
          </View>
          <Text style={styles.title}>Θέσε το Στόχο σου!</Text>
          <Text style={styles.subtitle}>Τι μεγάλο θέλεις να αγοράσεις;</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>ΟΝΟΜΑ ΣΤΟΧΟΥ</Text>
            <TextInput
              style={styles.input}
              placeholder="π.χ. Nintendo Switch"
              placeholderTextColor="#aaa"
              value={goalName}
              onChangeText={setGoalName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>ΠΟΣΟ ΠΟΥ ΧΡΕΙΑΖΕΣΑΙ (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={goalAmount}
              onChangeText={setGoalAmount}
            />
          </View>

          <TouchableOpacity 
            style={[styles.mainBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSetGoal}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>ΟΡΙΣΜΟΣ ΣΤΟΧΟΥ</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{marginLeft: 10}} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.aiTip}>
          <Ionicons name="bulb-outline" size={20} color="#f39c12" />
          <Text style={styles.aiTipText}>
            Μόλις ορίσεις το στόχο, το AI θα σου πει πόσες εβδομάδες αποταμίευσης χρειάζεσαι!
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa" },
  scrollContent: { flexGrow: 1, padding: 25, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#fff", justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: "900", color: "#1c1c1e", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 30, padding: 25, elevation: 5, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "bold", color: "#1a73e8", marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: "#f9f9f9", borderRadius: 15, padding: 18, fontSize: 18, color: "#333", borderWidth: 1, borderColor: "#eee" },
  mainBtn: { backgroundColor: "#1a73e8", flexDirection: 'row', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 3 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  aiTip: { flexDirection: 'row', backgroundColor: "#fff8ed", padding: 15, borderRadius: 15, marginTop: 25, alignItems: 'center' },
  aiTipText: { color: "#d68910", fontSize: 12, marginLeft: 10, flex: 1, fontWeight: "600" }
});