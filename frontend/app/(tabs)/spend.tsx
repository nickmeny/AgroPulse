import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function SpendScreen() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSpend = async () => {
    if (!amount) return;
    setLoading(true);
    const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");
    const token = await SecureStore.getItemAsync("userToken");
    const res = await fetch(`${API_URL}/api/update_balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: user.id, amount: -parseFloat(amount), category })
    });
    if (res.ok) {
      Alert.alert("Έγινε! 💸", "Η αγορά καταγράφηκε.");
      router.replace("/dashboard");
    } else {
      Alert.alert("Σφάλμα", "Υπόλοιπο μη επαρκές.");
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}><Ionicons name="grid-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}><Ionicons name="trophy-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}><Ionicons name="wallet-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}><Ionicons name="stats-chart-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIconActive}><Ionicons name="cart" size={24} color="#1a73e8" /></TouchableOpacity>
      </View>
      <ScrollView style={{flex:1, padding:25, paddingTop:50}}>
        <Text style={styles.title}>Νέα Αγορά 🛍️</Text>
        <TextInput style={styles.input} placeholder="Ποσό €" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <TouchableOpacity style={styles.btn} onPress={handleSpend}>{loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>ΚΑΤΑΧΩΡΗΣΗ</Text>}</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 20 },
  input: { backgroundColor: "#fff", padding: 20, borderRadius: 15, fontSize: 20, marginBottom: 20 },
  btn: { backgroundColor: "#1c1c1e", padding: 20, borderRadius: 15, alignItems: 'center' },
  btnText: { color: "#fff", fontWeight: "bold" }
});