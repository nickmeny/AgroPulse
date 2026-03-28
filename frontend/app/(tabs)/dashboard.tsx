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
  const [pendingCount, setPendingCount] = useState(0); 
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      if (!token || !storedUser) { router.replace("/"); return; }
      
      const userObj = JSON.parse(storedUser);
      setUserRole(userObj.role);

      const response = await fetch(`${API_URL}/api/transactions/${userObj.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setUserData(data.user);

      if (userObj.role === 'parent') {
        const pendingRes = await fetch(`${API_URL}/api/parent/pending_purchases/${userObj.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pendingData = await pendingRes.json();
        if (pendingRes.ok) setPendingCount(pendingData.length);
      }

      if (userObj.role === 'kid') {
        const aiRes = await fetch(`${API_URL}/api/predict_goal/${userObj.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (aiRes.ok) setAiPrediction(await aiRes.json());
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (userRole === 'parent') fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, [userRole]);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  if (loading) return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- SIDE BAR --- */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIconActive}><Ionicons name="grid" size={24} color="#1a73e8" /></TouchableOpacity>
          
          {userRole === 'kid' ? (
            <>
              {/* ΠΡΟΣΤΕΘΗΚΕ ΤΟ QUIZ ΕΔΩ */}
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/quiz")}>
                <Ionicons name="school-outline" size={24} color="#666" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}><Ionicons name="trophy-outline" size={24} color="#666" /></TouchableOpacity>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/pockets")}><Ionicons name="wallet-outline" size={24} color="#666" /></TouchableOpacity>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}><Ionicons name="stats-chart-outline" size={24} color="#666" /></TouchableOpacity>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}><Ionicons name="cart-outline" size={24} color="#666" /></TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/accept")}>
                <View>
                  <Ionicons name="checkmark-circle-outline" size={26} color="#666" />
                  {pendingCount > 0 && <View style={styles.badgeDot} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/transaction")}>
                <Ionicons name="list-outline" size={26} color="#666" />
              </TouchableOpacity>
            </>
          )}
        </View>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.sideIcon}><Ionicons name="log-out-outline" size={24} color="#e74c3c" /></TouchableOpacity>
      </View>

      {/* --- MAIN CONTENT --- */}
      <View style={styles.mainContent}>
        {userRole === 'parent' && pendingCount > 0 && (
          <TouchableOpacity style={styles.notifBanner} onPress={() => router.push("/accept")}>
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text style={styles.notifText}>Έχεις {pendingCount} νέα αιτήματα για έγκριση!</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            {userRole === 'kid' && <View style={styles.coinBadge}><Text style={styles.coinText}>🪙 {userData?.points || 0}</Text></View>}
          </View>
          <Text style={styles.userTitle}>@{userData?.username}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}>
          <View style={styles.balanceCard}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={styles.balanceLabel}>ΔΙΑΘΕΣΙΜΟ ΥΠΟΛΟΙΠΟ</Text>
                {userRole === 'parent' && (
                    <TouchableOpacity onPress={() => router.push("/popup")}>
                        <Ionicons name="add-circle" size={26} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.balanceAmount}>{userData?.balance?.toFixed(2)}€</Text>
          </View>

          {userRole === 'kid' && (
            <View style={[styles.aiCard, aiPrediction?.status === "CRITICAL" && styles.aiCardCritical]}>
              <Text style={styles.aiTag}>AI FINANCE ADVISOR</Text>
              <Text style={styles.aiAdvice}>"{aiPrediction?.advice || "Κάνε μια αγορά για να την αναλύσω!"}"</Text>
            </View>
          )}

          {userData?.goal?.name && (
            <View style={styles.goalBox}>
              <Text style={styles.goalTitle}>Στόχος: {userData.goal.name}</Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min((userData.balance / (userData.goal.amount || 1)) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.goalDetail}>{userData.balance.toFixed(2)}€ / {userData.goal.amount}€</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, justifyContent: "space-between" },
  sideTop: { gap: 25, alignItems: 'center' },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  mainContent: { flex: 1, padding: 20 },
  topHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 40, marginBottom: 20 },
  headerLeft: { minWidth: 60 },
  coinBadge: { backgroundColor: "#fff", padding: 8, borderRadius: 12, elevation: 2 },
  coinText: { fontWeight: "bold", color: "#f39c12" },
  userTitle: { fontSize: 18, fontWeight: "900", color: "#333" },
  balanceCard: { backgroundColor: "#1a73e8", borderRadius: 25, padding: 25, marginBottom: 20 },
  balanceLabel: { color: "#fff", opacity: 0.8, fontSize: 11, fontWeight: "bold" },
  balanceAmount: { fontSize: 34, fontWeight: "bold", color: "#fff", marginTop: 5 },
  aiCard: { backgroundColor: "#1c1c1e", borderRadius: 20, padding: 20, marginBottom: 20 },
  aiCardCritical: { borderLeftWidth: 5, borderLeftColor: "#ff4757" },
  aiTag: { color: "#FFD700", fontSize: 10, fontWeight: "bold", marginBottom: 5 },
  aiAdvice: { color: "#ddd", fontStyle: "italic" },
  goalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20, elevation: 2 },
  goalTitle: { fontWeight: "bold", marginBottom: 10 },
  progressBg: { height: 10, backgroundColor: "#eee", borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: "100%", backgroundColor: "#1a73e8" },
  goalDetail: { textAlign: 'right', fontSize: 12, marginTop: 5, color: "#888" },
  notifBanner: { backgroundColor: "#ff4757", padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  notifText: { color: "#fff", fontWeight: "bold", flex: 1, marginLeft: 10 },
  badgeDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, backgroundColor: '#ff4757', borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' }
});