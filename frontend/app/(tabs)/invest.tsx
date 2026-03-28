import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, RefreshControl } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function InvestScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [market, setMarket] = useState<any>({});
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = async () => {
    const token = await SecureStore.getItemAsync("userToken");
    const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");
    
    const uRes = await fetch(`${API_URL}/api/transactions/${user.id}`, { headers: { Authorization: `Bearer ${token}` }});
    const pRes = await fetch(`${API_URL}/api/invest/prices`, { headers: { Authorization: `Bearer ${token}` }});
    const portRes = await fetch(`${API_URL}/api/invest/portfolio/${user.id}`, { headers: { Authorization: `Bearer ${token}` }});
    
    const uData = await uRes.json();
    setUserData(uData.user);
    setMarket(await pRes.json());
    const portData = await portRes.json();
    setPortfolio(portData.active_investments);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const buy = async (asset: string, price: number) => {
    if (userData.points < 50) { Alert.alert("Όχι αρκετά Coins!"); return; }
    const token = await SecureStore.getItemAsync("userToken");
    await fetch(`${API_URL}/api/invest/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userData.id, asset_name: asset, coins: 50, current_price: price })
    });
    fetchData();
  };

  if (loading) return <ActivityIndicator style={{flex:1}} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}><Ionicons name="grid-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}><Ionicons name="trophy-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}><Ionicons name="wallet-outline" size={24} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIconActive}><Ionicons name="stats-chart" size={24} color="#1a73e8" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}><Ionicons name="cart-outline" size={24} color="#666" /></TouchableOpacity>
      </View>
      <ScrollView style={{flex:1, padding:20, paddingTop:50}}>
        <Text style={styles.title}>Invest Coins 📈</Text>
        <Text style={{marginBottom:20}}>Διαθέσιμα: 🪙 {userData.points}</Text>
        {Object.entries(market).map(([name, price]: any) => (
          <TouchableOpacity key={name} style={styles.card} onPress={() => buy(name, price)}>
            <Text style={{fontWeight:'bold'}}>{name}</Text>
            <Text style={{color:'#1a73e8'}}>{price}€ / Buy: 50🪙</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  title: { fontSize: 24, fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 }
});