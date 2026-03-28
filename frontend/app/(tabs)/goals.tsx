import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function GoalsScreen() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const router = useRouter();

  const handleGoal = async () => {
    const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");
    const token = await SecureStore.getItemAsync("userToken");
    await fetch(`${API_URL}/api/set_goal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: user.id, goal_name: name, goal_amount: parseFloat(amount) })
    });
    router.replace("/dashboard");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}><Ionicons name="grid-outline" size={24} color="#666" /></TouchableOpacity>
        
        {/* ΠΡΟΣΤΕΘΗΚΕ ΤΟ QUIZ TAB */}
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/quiz")}><Ionicons name="school-outline" size={24} color="#666" /></TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIconActive}><Ionicons name="trophy" size={24} color="#1a73e8" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}><Ionicons name="wallet-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}><Ionicons name="stats-chart-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}><Ionicons name="cart-outline" size={24} color="#666" /></TouchableOpacity>
      </View>
      <View style={{flex:1, padding:25, paddingTop:50}}>
        <Text style={{fontSize:24, fontWeight:'900', marginBottom:20}}>Νέος Στόχος 🚀</Text>
        <TextInput style={styles.input} placeholder="Τι θέλεις;" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Πόσο κάνει;" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <TouchableOpacity style={styles.btn} onPress={handleGoal}><Text style={{color:'#fff', fontWeight:'bold'}}>ΟΡΙΣΜΟΣ</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  input: { backgroundColor: "#fff", padding: 20, borderRadius: 15, marginBottom: 15 },
  btn: { backgroundColor: "#1a73e8", padding: 20, borderRadius: 15, alignItems: 'center' }
});