import React, { useState, useCallback } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  SafeAreaView, Modal, TextInput, Alert, ActivityIndicator 
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://192.168.199.153:5000";

export default function PocketsScreen() {
  const [pockets, setPockets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const storedUser = await SecureStore.getItemAsync("userData");
      if (!storedUser) return;
      const user = JSON.parse(storedUser);

      const res = await fetch(`${API_URL}/api/transactions/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPockets(data.user.pockets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleCreatePocket = async () => {
    if (!newName || !newTarget) return;
    const token = await SecureStore.getItemAsync("userToken");
    const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");

    const res = await fetch(`${API_URL}/api/pockets/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: user.id, name: newName, target: parseFloat(newTarget) })
    });

    if (res.ok) {
      setModalVisible(false);
      setNewName("");
      setNewTarget("");
      fetchData();
    }
  };

  const handleTransfer = async (pocketId: number, amount: number) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const user = JSON.parse(await SecureStore.getItemAsync("userData") || "{}");

      const res = await fetch(`${API_URL}/api/pockets/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.id, pocket_id: pocketId, amount: amount })
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Σφάλμα", data.error || "Δεν υπάρχουν αρκετά χρήματα");
      } else {
        fetchData();
      }
    } catch (e) {
      Alert.alert("Σφάλμα σύνδεσης");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* SIDE BAR */}
      <View style={styles.sideBar}>
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/dashboard")}>
          <Ionicons name="grid-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/quiz")}>
          <Ionicons name="school-outline" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/goals")}>
          <Ionicons name="trophy-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIconActive}>
          <Ionicons name="wallet" size={24} color="#1a73e8" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/invest")}>
          <Ionicons name="stats-chart-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideIcon} onPress={() => router.push("/spend")}>
          <Ionicons name="cart-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.main}>
        {/* ΔΙΟΡΘΩΣΗ: View αντί για div */}
        <View style={styles.header}>
          <Text style={styles.title}>Κουμπαράδες 🍯</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={35} color="#1a73e8" />
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator size="large" color="#1a73e8" /> : (
          <FlatList 
            data={pockets} 
            keyExtractor={(item: any) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({item}: any) => (
              <View style={styles.card}>
                <View style={{flex: 1}}>
                  <Text style={styles.pName}>{item.name}</Text>
                  <Text style={styles.pSub}>{item.balance.toFixed(2)}€ / {item.target}€</Text>
                  <View style={styles.miniProgressBg}>
                    <View style={[styles.miniProgressFill, { width: `${Math.min((item.balance / (item.target || 1)) * 100, 100)}%` }]} />
                  </View>
                </View>
                
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.minusBtn} onPress={() => handleTransfer(item.id, -5)}>
                    <Text style={styles.btnText}>-5€</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.plusBtn} onPress={() => handleTransfer(item.id, 5)}>
                    <Text style={styles.btnText}>+5€</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )} 
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Νέος Κουμπαράς</Text>
            <TextInput style={styles.input} placeholder="Όνομα (π.χ. Διακοπές)" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="Στόχος (€)" keyboardType="numeric" value={newTarget} onChangeText={setNewTarget} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text>Άκυρο</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreatePocket}><Text style={{color:'#fff', fontWeight:'bold'}}>Δημιουργία</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fa", flexDirection: 'row' },
  sideBar: { width: 70, backgroundColor: "#fff", borderRightWidth: 1, borderRightColor: "#eee", alignItems: "center", paddingVertical: 40, gap: 25 },
  sideIcon: { padding: 12 },
  sideIconActive: { padding: 12, backgroundColor: "#e8f0fe", borderRadius: 15 },
  main: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#333" },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
  pName: { fontWeight: "bold", fontSize: 17, color: "#333" },
  pSub: { color: "#666", fontSize: 13, marginTop: 2 },
  miniProgressBg: { height: 6, backgroundColor: "#eee", borderRadius: 3, marginTop: 10, width: '90%' },
  miniProgressFill: { height: '100%', backgroundColor: "#2ecc71", borderRadius: 3 },
  actions: { flexDirection: 'row', gap: 8 },
  plusBtn: { backgroundColor: "#2ecc71", padding: 10, borderRadius: 12, minWidth: 45, alignItems: 'center' },
  minusBtn: { backgroundColor: "#e74c3c", padding: 10, borderRadius: 12, minWidth: 45, alignItems: 'center' },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '80%', padding: 25, borderRadius: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: "#f0f0f0", padding: 15, borderRadius: 12, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 15 },
  confirmBtn: { backgroundColor: "#1a73e8", padding: 15, borderRadius: 12 }
});