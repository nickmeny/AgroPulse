import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, SafeAreaView } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function PocketsScreen() {
  const [pockets, setPockets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const router = useRouter();

  const fetchPockets = async () => {
    const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");
    const res = await fetch(`${API_URL}/api/transactions/${user.id}`, {
      headers: { Authorization: `Bearer ${await SecureStore.getItemAsync("userToken")}` }
    });
    const data = await res.json();
    if (res.ok) setPockets(data.user.pockets || []);
  };

  useFocusEffect(useCallback(() => { fetchPockets(); }, []));

  const handleTransfer = async (pId: number, amt: number) => {
    const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");
    await fetch(`${API_URL}/api/pockets/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await SecureStore.getItemAsync("userToken")}` },
      body: JSON.stringify({ user_id: user.id, pocket_id: pId, amount: amt })
    });
    fetchPockets();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}><Ionicons name="grid-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}><Ionicons name="trophy-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIconActive}><Ionicons name="wallet" size={24} color="#1a73e8" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/transaction")}><Ionicons name="cart-outline" size={24} color="#666" /></TouchableOpacity>
      </View>

      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.title}>Κουμπαράδες</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}><Ionicons name="add-circle" size={35} color="#1a73e8" /></TouchableOpacity>
        </View>
        <FlatList data={pockets} renderItem={({item}) => (
          <View style={styles.card}>
            <View style={{flex:1}}><Text style={styles.pName}>{item.name}</Text><Text>{item.balance}€ / {item.target_amount}€</Text></View>
            <TouchableOpacity style={styles.plus} onPress={() => handleTransfer(item.id, 5)}><Text style={{color:'#fff'}}>+5€</Text></TouchableOpacity>
          </View>
        )} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  main: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pName: { fontWeight: "bold", fontSize: 16 },
  plus: { backgroundColor: "#2ecc71", padding: 10, borderRadius: 10 }
});