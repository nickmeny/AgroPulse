import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, RefreshControl, Platform, StatusBar, TouchableOpacity
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router"; // Προσθήκη useFocusEffect
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // State για το ρόλο
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      const storedUserString = await SecureStore.getItemAsync("userData");

      if (!token || !storedUserString) {
        router.replace("/");
        return;
      }

      const userObj = JSON.parse(storedUserString);
      setUserRole(userObj.role); // Αποθήκευση του ρόλου (kid ή parent)

      // Κλήση στο Endpoint No 7 για φρέσκα δεδομένα
      const response = await fetch(`${API_URL}/api/transactions/${userObj.id}`, {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUserData(data);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Αυτό το hook τρέχει ΚΑΘΕ ΦΟΡΑ που η οθόνη έρχεται στο προσκήνιο
  // Λύνει το πρόβλημα του Logout/Login
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userData");
    setUserData(null);
    setUserRole(null);
    router.replace("/");
  };

  if (loading && !refreshing) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* SIDE BAR */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIconActive}>
            <Ionicons name="grid" size={24} color="#1a73e8" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        <View style={styles.topHeader}>
          
          {/* ΔΥΝΑΜΙΚΗ ΕΜΦΑΝΙΣΗ COINS: Μόνο αν ο ρόλος είναι 'kid' */}
          <View style={styles.headerLeft}>
            {userRole === 'kid' && (
              <View style={styles.coinBadge}>
                <Text style={styles.coinText}>🪙 {userData?.points || 0}</Text>
              </View>
            )}
          </View>

          <Text style={styles.userTitle}>@{userData?.username || "Φόρτωση..."}</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          {/* BALANCE CARD */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>ΔΙΑΘΕΣΙΜΟ ΥΠΟΛΟΙΠΟ</Text>
            <Text style={styles.balanceAmount}>
              {userData?.balance !== undefined ? userData.balance.toFixed(2) : "0.00"}€
            </Text>
          </View>

          {/* GOAL BOX */}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, justifyContent: "space-between" },
  sideTop: { gap: 30 },
  sideIconActive: { padding: 10, backgroundColor: "#e8f0fe", borderRadius: 15 },
  logoutIcon: { padding: 10 },
  mainContent: { flex: 1 },
  topHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 40 : 15, marginBottom: 20 },
  headerLeft: { minWidth: 80 }, // Για να κρατάει το χώρο
  coinBadge: { backgroundColor: "#fff", padding: 8, borderRadius: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5 },
  coinText: { fontWeight: "bold", color: "#f39c12", fontSize: 14 },
  userTitle: { fontSize: 18, fontWeight: "900", color: "#333" },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  balanceCard: { backgroundColor: "#1a73e8", borderRadius: 25, padding: 30, elevation: 8, shadowColor: "#1a73e8", shadowOpacity: 0.3, shadowRadius: 10, marginBottom: 25 },
  balanceLabel: { color: "#e0e0e0", fontWeight: "bold", fontSize: 10, marginBottom: 5, letterSpacing: 1 },
  balanceAmount: { fontSize: 38, fontWeight: "900", color: "#fff" },
  goalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20, elevation: 2 },
  goalTitle: { fontWeight: "bold", color: "#444", marginBottom: 10 },
  progressBg: { height: 8, backgroundColor: "#eee", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1a73e8" },
  goalDetail: { textAlign: "right", fontSize: 11, color: "#999", marginTop: 5 }
});