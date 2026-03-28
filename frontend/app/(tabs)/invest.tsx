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
    try {
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const buy = async (asset: string, price: number) => {
    if (userData.points < 50) { Alert.alert("Προσοχή", "Δεν έχεις αρκετά Coins! Χρειάζεσαι 50 🪙."); return; }
    const token = await SecureStore.getItemAsync("userToken");
    const res = await fetch(`${API_URL}/api/invest/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userData.id, asset_name: asset, coins: 50, current_price: price })
    });
    if (res.ok) {
      Alert.alert("Επιτυχία! 📈", `Επένδυσες 50 Coins στο ${asset}`);
      fetchData();
    }
  };

  if (loading) return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* SIDE BAR */}
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
          <Ionicons name="grid-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        {/* ΠΡΟΣΤΕΘΗΚΕ ΤΟ QUIZ TAB */}
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/quiz")}>
          <Ionicons name="school-outline" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}>
          <Ionicons name="trophy-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}>
          <Ionicons name="wallet-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIconActive}>
          <Ionicons name="stats-chart" size={24} color="#1a73e8" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}>
          <Ionicons name="cart-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{flex:1, padding:20, paddingTop:50}}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} />}
      >
        <Text style={styles.title}>Invest Coins 📈</Text>
        <Text style={styles.balanceText}>Διαθέσιμα: 🪙 {userData?.points || 0}</Text>
        
        <Text style={styles.sectionTitle}>Αγορά</Text>
        {Object.entries(market).map(([name, price]: any) => (
          <TouchableOpacity key={name} style={styles.card} onPress={() => buy(name, price)}>
            <View style={styles.cardContent}>
              <View>
                <Text style={styles.assetName}>{name}</Text>
                <Text style={styles.assetPrice}>{price.toFixed(2)}€ / μετοχή</Text>
              </View>
              <View style={styles.buyBadge}>
                <Text style={styles.buyText}>Buy: 50🪙</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {portfolio.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>Το Χαρτοφυλάκιό μου</Text>
            {portfolio.map((item: any, index: number) => (
              <View key={index} style={styles.portfolioCard}>
                <Text style={styles.assetName}>{item.asset_name}</Text>
                <Text style={styles.assetPrice}>Επένδυση: {item.invested_coins}🪙</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  title: { fontSize: 26, fontWeight: "900", color: "#1c1c1e" },
  balanceText: { fontSize: 16, color: "#f39c12", fontWeight: "bold", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#888", marginBottom: 10, textTransform: 'uppercase' },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetName: { fontSize: 18, fontWeight: "bold", color: "#333" },
  assetPrice: { color: "#666", marginTop: 2 },
  buyBadge: { backgroundColor: "#1a73e8", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  buyText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  portfolioCard: { backgroundColor: "#e8f0fe", padding: 15, borderRadius: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: "#1a73e8" }
});