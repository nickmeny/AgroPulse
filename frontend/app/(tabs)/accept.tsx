import React, { useEffect, useState, useCallback } from "react";
import { 
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator, 
  FlatList, TouchableOpacity, Alert, StatusBar 
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router"; 
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function AcceptScreen() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const router = useRouter();

  const fetchPending = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      if (!storedUser) return;
      
      const userObj = JSON.parse(storedUser);
      
      const res = await fetch(`${API_URL}/api/parent/pending_purchases/${userObj.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPending(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPending(); }, []));

  const handleDecision = async (transactionId: number, decision: 'approved' | 'rejected') => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const res = await fetch(`${API_URL}/api/parent/authorize_purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transaction_id: transactionId, decision: decision })
      });
      
      if (res.ok) {
        Alert.alert(decision === 'approved' ? "Εγκρίθηκε! ✅" : "Απορρίφθηκε ❌");
        fetchPending();
      }
    } catch (e) {
      Alert.alert("Σφάλμα", "Αποτυχία σύνδεσης.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* --- SIDE BAR (Parent Mode) --- */}
      <View style={styles.sideBar}>
        <View style={styles.sideTop}>
          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
            <Ionicons name="grid-outline" size={24} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sideIconActive}>
            <View>
              <Ionicons name="checkmark-circle" size={26} color="#1a73e8" />
              {pending.length > 0 && <View style={styles.badgeDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/transaction")}>
            <Ionicons name="swap-horizontal" size={26} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.sideIcon}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* --- MAIN CONTENT --- */}
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Αιτήματα 🔔</Text>
          {pending.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{pending.length}</Text>
            </View>
          )}
        </View>

        <FlatList
          data={pending}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{flex: 1}}>
                <Text style={styles.amount}>{Math.abs(item.amount).toFixed(2)}€</Text>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.desc}>{item.description || "Αγορά"}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnApprove} onPress={() => handleDecision(item.id, 'approved')}>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnReject} onPress={() => handleDecision(item.id, 'rejected')}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>Όλα τα αιτήματα έχουν ελεγχθεί!</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Side Bar Styles
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, justifyContent: "space-between" },
  sideTop: { gap: 25, alignItems: 'center' },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  badgeDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, backgroundColor: '#ff4757', borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },
  
  // Main Content Styles
  mainContent: { flex: 1, paddingHorizontal: 20 },
  header: { paddingVertical: 25, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: "900", color: "#1c1c1e" },
  countBadge: { backgroundColor: "#ff4757", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  amount: { fontSize: 22, fontWeight: "bold", color: "#333" },
  category: { color: "#1a73e8", fontWeight: "bold", fontSize: 11, textTransform: 'uppercase', marginTop: 2 },
  desc: { color: "#666", fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  btnApprove: { backgroundColor: "#2ecc71", padding: 12, borderRadius: 15 },
  btnReject: { backgroundColor: "#e74c3c", padding: 12, borderRadius: 15 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: "#999", marginTop: 10, fontSize: 16 }
});