import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_URL = "http://192.168.199.153:5000";

export default function PopUpScreen() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await SecureStore.getItemAsync("userData");
      if (storedUser) {
        setUserId(JSON.parse(storedUser).id);
      }
    };
    loadUser();
  }, []);

  const handleAddMoney = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Προσοχή", "Βάλτε ένα έγκυρο ποσό.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      
      const response = await fetch(`${API_URL}/api/update_balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          amount: parseFloat(amount), // Θετικό ποσό για κατάθεση
          category: "Top-up",
          description: "Χειροκίνητη προσθήκη χρημάτων"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Επιτυχία!", `Προστέθηκαν ${amount}€ στο υπόλοιπό σας.`);
        setAmount("");
        router.push("/dashboard"); // Επιστροφή για να δεις τα λεφτά
      } else {
        Alert.alert("Σφάλμα", data.error || "Αποτυχία κατάθεσης.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Δεν υπάρχει σύνδεση με το backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Ionicons name="wallet-outline" size={80} color="#1a73e8" />
        <Text style={styles.title}>Προσθήκη Χρημάτων</Text>
        <Text style={styles.subtitle}>Γέμισε το υπόλοιπό σου για να ξεκινήσεις!</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.currency}>€</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleAddMoney}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ΚΑΤΑΘΕΣΗ ΤΩΡΑ</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Ακύρωση</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  title: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 20 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 40 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#1a73e8", marginBottom: 40, paddingHorizontal: 20 },
  currency: { fontSize: 30, fontWeight: "bold", color: "#1a73e8", marginRight: 10 },
  input: { fontSize: 40, fontWeight: "bold", width: 150, color: "#333", textAlign: "center" },
  button: { backgroundColor: "#1a73e8", width: "100%", padding: 18, borderRadius: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelText: { color: "#999", marginTop: 25, fontSize: 14 }
});