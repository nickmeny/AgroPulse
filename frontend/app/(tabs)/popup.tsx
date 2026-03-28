import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_URL = "http://192.168.199.153:5000";

export default function PopUpScreen() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await SecureStore.getItemAsync("userData");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.role !== 'parent') {
          router.replace("/dashboard");
          return;
        }
        setUser(parsed);
      }
    };
    loadUser();
  }, []);

  const handleAddMoney = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const response = await fetch(`${API_URL}/api/update_balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: parseInt(user.id),
          amount: parseFloat(amount),
          category: "Deposit",
          description: "Parent Top-up"
        }),
      });

      if (response.ok) {
        Alert.alert("Επιτυχία!", "Τα χρήματα προστέθηκαν.");
        router.push("/dashboard");
      } else {
        Alert.alert("Σφάλμα", "Αποτυχία ενημέρωσης.");
      }
    } catch (error) {
      Alert.alert("Σφάλμα", "Σφάλμα σύνδεσης.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={30} color="#333" />
      </TouchableOpacity>
      <Ionicons name="wallet-outline" size={80} color="#1a73e8" />
      <Text style={styles.title}>Κατάθεση Χρημάτων</Text>
      <View style={styles.inputWrapper}>
        <Text style={styles.euro}>€</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleAddMoney} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ΠΡΟΣΘΗΚΗ</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: 'center', alignItems: 'center', padding: 20 },
  closeBtn: { position: 'absolute', top: 50, right: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginVertical: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1a73e8', marginBottom: 30 },
  euro: { fontSize: 30, color: '#1a73e8', marginRight: 10 },
  input: { fontSize: 40, width: 150, textAlign: 'center' },
  btn: { backgroundColor: "#1a73e8", padding: 20, borderRadius: 15, width: '100%', alignItems: 'center' },
  btnText: { color: "#fff", fontWeight: "bold" }
});