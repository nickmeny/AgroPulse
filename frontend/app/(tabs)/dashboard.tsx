import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, RefreshControl, Platform, StatusBar, TouchableOpacity
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

const API_URL = "http://192.168.199.153:5000";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUserString = await SecureStore.getItemAsync("userData");

      if (!token || !storedUserString) {
        router.replace("/"); 
        return;
      }

      const userObj = JSON.parse(storedUserString);
      const response = await fetch(`${API_URL}/api/transactions/${userObj.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) setUserData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onLogout = async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userData");
    router.replace("/");
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <View style={styles.badge}><Text style={styles.badgeText}>🪙 {userData?.points || 0}</Text></View>
        <TouchableOpacity onPress={onLogout} style={styles.userBadge}>
          <Text style={styles.userText}>@{userData?.username}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ΔΙΑΘΕΣΙΜΟ ΥΠΟΛΟΙΠΟ</Text>
          <Text style={styles.balanceAmount}>{userData?.balance?.toFixed(2)}€</Text>
        </View>

        {userData?.goal?.name && (
          <View style={styles.goalBox}>
            <Text style={styles.goalTitle}>Στόχος: {userData.goal.name}</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.min((userData.balance / userData.goal.amount) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.goalDetail}>{userData.goal.amount}€</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 40 : 10, alignItems: "center" },
  badge: { backgroundColor: "#fff", padding: 8, borderRadius: 15, elevation: 2 },
  badgeText: { fontWeight: "bold", color: "#f39c12" },
  userBadge: { backgroundColor: "#1a73e8", padding: 8, borderRadius: 15 },
  userText: { color: "#fff", fontWeight: "bold" },
  scrollContent: { padding: 20, flexGrow: 1, justifyContent: "center" },
  balanceCard: { backgroundColor: "#fff", borderRadius: 30, padding: 40, alignItems: "center", elevation: 5, marginBottom: 30 },
  balanceLabel: { color: "#999", fontWeight: "bold", fontSize: 11, marginBottom: 10 },
  balanceAmount: { fontSize: 48, fontWeight: "900", color: "#1a73e8" },
  goalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20, elevation: 2 },
  goalTitle: { fontWeight: "bold", color: "#444", marginBottom: 10 },
  progressBg: { height: 8, backgroundColor: "#eee", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1a73e8" },
  goalDetail: { textAlign: "right", fontSize: 11, color: "#999", marginTop: 5 }
});