import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, RefreshControl, Platform, StatusBar, TouchableOpacity
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router"; 
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); 
  const [aiPrediction, setAiPrediction] = useState<any>(null); // ΠΡΟΣΘΗΚΗ: State για το AI
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
      setUserRole(userObj.role); 

      // 1. Φέρνουμε τα Transactions (Όπως πριν)
      const response = await fetch(`${API_URL}/api/transactions/${userObj.id}`, {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      const data = await response.json();

      // 2. ΠΡΟΣΘΗΚΗ: Φέρνουμε την Πρόβλεψη του Behavioral AI
      const aiResponse = await fetch(`${API_URL}/api/predict_goal/${userObj.id}`, {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      const aiData = await aiResponse.json();

      if (response.ok) {
        setUserData(data);
      }
      if (aiResponse.ok) {
        setAiPrediction(aiData); // Αποθηκεύουμε την ανάλυση του NN
      }

    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
      
      {/* SIDE BAR (ΠΡΟΣΕΧΤΗΚΕ: Παραμένει ίδιο) */}
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
          {/* BALANCE CARD (Παραμένει ίδιο) */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>ΔΙΑΘΕΣΙΜΟ ΥΠΟΛΟΙΠΟ</Text>
            <Text style={styles.balanceAmount}>
              {userData?.balance !== undefined ? userData.balance.toFixed(2) : "0.00"}€
            </Text>
          </View>

          {/* ΝΕΟ: AI BEHAVIORAL INSIGHT CARD */}
          {userRole === 'kid' && (
            <View style={[styles.aiCard, aiPrediction?.status === "CRITICAL" && styles.aiCardCritical]}>
              <View style={styles.aiHeader}>
                <Ionicons name="analytics" size={18} color="#FFD700" />
                <Text style={styles.aiTag}>BEHAVIORAL AI ANALYSIS</Text>
              </View>
              
              {aiPrediction?.error ? (
                <Text style={styles.aiAdvice}>Κάνε μερικές αγορές για να αναλύσω τη συμπεριφορά σου! 🦉</Text>
              ) : (
                <>
                  <Text style={styles.aiPredictionText}>
                    Πρόβλεψη Στόχου: <Text style={styles.aiWeeks}>{aiPrediction?.weeks_left}</Text> εβδομάδες
                  </Text>
                  <Text style={styles.aiAdvice}>"{aiPrediction?.advice}"</Text>
                </>
              )}
            </View>
          )}

          {/* GOAL BOX (Παραμένει ίδιο) */}
          {userData?.goal?.name && (
            <View style={styles.goalBox}>
              <Text style={styles.goalTitle}>Στόχος: {userData.goal.name}</Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min((userData.balance / userData.goal.amount) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.goalDetail}>{userData.balance}€ / {userData.goal.amount}€</Text>
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
  headerLeft: { minWidth: 80 },
  coinBadge: { backgroundColor: "#fff", padding: 8, borderRadius: 12, elevation: 2 },
  coinText: { fontWeight: "bold", color: "#f39c12", fontSize: 14 },
  userTitle: { fontSize: 18, fontWeight: "900", color: "#333" },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  balanceCard: { backgroundColor: "#1a73e8", borderRadius: 25, padding: 30, marginBottom: 20, elevation: 5 },
  balanceLabel: { color: "#e0e0e0", fontWeight: "bold", fontSize: 10, marginBottom: 5, letterSpacing: 1 },
  balanceAmount: { fontSize: 38, fontWeight: "900", color: "#fff" },

  // ΣΤΥΛ ΓΙΑ ΤΗ ΝΕΑ AI ΚΑΡΤΑ
  aiCard: { backgroundColor: "#1c1c1e", borderRadius: 20, padding: 20, marginBottom: 20, borderLeftWidth: 5, borderLeftColor: "#FFD700" },
  aiCardCritical: { borderLeftColor: "#ff4757" },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiTag: { color: "#FFD700", fontSize: 10, fontWeight: "bold", marginLeft: 8, letterSpacing: 0.5 },
  aiPredictionText: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 6 },
  aiWeeks: { color: "#00d1b2", fontSize: 24, fontWeight: "900" },
  aiAdvice: { color: "#aaa", fontSize: 13, fontStyle: "italic", lineHeight: 18 },

  goalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20, elevation: 2 },
  goalTitle: { fontWeight: "bold", color: "#444", marginBottom: 10 },
  progressBg: { height: 8, backgroundColor: "#eee", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1a73e8" },
  goalDetail: { textAlign: "right", fontSize: 11, color: "#999", marginTop: 5 }
});