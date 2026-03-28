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
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      
      if (!token || !storedUser) { 
        router.replace("/"); 
        return; 
      }
      
      const userObj = JSON.parse(storedUser);
      setUserRole(userObj.role);

      // Φόρτωση δεδομένων χρήστη & υπολοίπου
      const response = await fetch(`${API_URL}/api/transactions/${userObj.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setUserData(data.user);

      // Αν είναι παιδί, φόρτωσε την AI πρόβλεψη για τον στόχο
      if (userObj.role === 'kid') {
        const aiRes = await fetch(`${API_URL}/api/predict_goal/${userObj.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) setAiPrediction(aiData);
      }
    } catch (e) { 
      console.error("Fetch Error:", e); 
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- SIDE BAR ΔΥΝΑΜΙΚΟ --- */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIconActive}>
            <Ionicons name="grid" size={24} color="#1a73e8" />
          </TouchableOpacity>

          {userRole === 'kid' && (
            <>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}>
                <Ionicons name="trophy-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}>
                <Ionicons name="wallet-outline" size={24} color="#666" />
              </TouchableOpacity>
              {/* ΤΟ ΠΑΙΔΙ ΠΗΓΑΙΝΕΙ ΣΤΗΝ ΟΘΟΝΗ ΣΠΑΤΑΛΗΣ (SPEND) */}
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}>
                <Ionicons name="cart-outline" size={24} color="#666" />
              </TouchableOpacity>
            </>
          )}

          {userRole === 'parent' && (
            /* Ο ΓΟΝΕΑΣ ΠΗΓΑΙΝΕΙ ΣΤΗΝ ΟΘΟΝΗ ΜΕΤΑΦΟΡΑΣ (TRANSACTION) */
            <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/transaction")}>
              <Ionicons name="swap-horizontal" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.sideIcon}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* --- ΚΥΡΙΩΣ ΠΕΡΙΕΧΟΜΕΝΟ --- */}
      <View style={styles.mainContent}>
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            {userRole === 'kid' && (
              <View style={styles.coinBadge}>
                <Text style={styles.coinText}>🪙 {userData?.points || 0}</Text>
              </View>
            )}
          </View>
          <Text style={styles.userTitle}>@{userData?.username || "Guest"}</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { setRefreshing(true); fetchData(); }} 
            />
          }
        >
          {/* ΚΑΡΤΑ ΥΠΟΛΟΙΠΟΥ */}
          <View style={styles.balanceCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.balanceLabel}>ΔΙΑΘΕΣΙΜΟ ΥΠΟΛΟΙΠΟ</Text>
              {userRole === 'parent' && (
                <TouchableOpacity onPress={() => router.push("/popup")} style={styles.addMoneyBtn}>
                  <Ionicons name="add-circle" size={26} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.balanceAmount}>
              {userData?.balance !== undefined ? userData.balance.toFixed(2) : "0.00"}€
            </Text>
          </View>

          {/* AI ΣΥΜΒΟΥΛΟΣ (ΜΟΝΟ ΓΙΑ ΠΑΙΔΙΑ) */}
          {userRole === 'kid' && (
            <View style={[
              styles.aiCard, 
              aiPrediction?.status === "CRITICAL" && styles.aiCardCritical
            ]}>
              <View style={styles.aiHeader}>
                <Ionicons name="analytics" size={18} color="#FFD700" />
                <Text style={styles.aiTag}>AI FINANCE ADVISOR</Text>
              </View>
              <Text style={styles.aiAdvice}>
                "{aiPrediction?.advice || "Κάνε μια αγορά για να αναλύσω τις συνήθειές σου!"}"
              </Text>
            </View>
          )}

          {/* ΠΡΟΟΔΟΣ ΣΤΟΧΟΥ */}
          {userData?.goal_name && (
            <View style={styles.goalBox}>
              <View style={styles.goalHeaderRow}>
                <Text style={styles.goalTitle}>Στόχος: {userData.goal_name}</Text>
                <Ionicons name="flag-outline" size={18} color="#1a73e8" />
              </View>
              <View style={styles.progressBg}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min((userData.balance / (userData.goal_amount || 1)) * 100, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.goalDetail}>
                {userData.balance.toFixed(2)}€ / {userData.goal_amount}€
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { 
    width: 70, 
    backgroundColor: "#fff", 
    borderRightWidth: 1, 
    borderRightColor: "#eee", 
    alignItems: "center", 
    paddingVertical: 40, 
    justifyContent: "space-between" 
  },
  sideTop: { gap: 30, alignItems: 'center' },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  mainContent: { flex: 1 },
  topHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 10 : 50, 
    marginBottom: 20 
  },
  headerLeft: { minWidth: 80 },
  coinBadge: { 
    backgroundColor: "#fff", 
    padding: 8, 
    borderRadius: 12, 
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  coinText: { fontWeight: "bold", color: "#f39c12" },
  userTitle: { fontSize: 18, fontWeight: "900", color: "#333" },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  balanceCard: { 
    backgroundColor: "#1a73e8", 
    borderRadius: 25, 
    padding: 25, 
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#1a73e8",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontWeight: "bold", fontSize: 11, letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: "900", color: "#fff", marginTop: 5 },
  addMoneyBtn: { padding: 5 },
  aiCard: { backgroundColor: "#1c1c1e", borderRadius: 20, padding: 20, marginBottom: 20 },
  aiCardCritical: { borderLeftWidth: 5, borderLeftColor: "#ff4757" },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTag: { color: "#FFD700", fontSize: 10, fontWeight: "bold", marginLeft: 8, letterSpacing: 1 },
  aiAdvice: { color: "#ddd", fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  goalBox: { 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 22, 
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  goalTitle: { fontWeight: "800", color: "#333", fontSize: 15 },
  progressBg: { height: 12, backgroundColor: "#f0f0f0", borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: "100%", backgroundColor: "#1a73e8", borderRadius: 6 },
  goalDetail: { textAlign: "right", fontSize: 12, marginTop: 8, color: "#888", fontWeight: "600" }
});