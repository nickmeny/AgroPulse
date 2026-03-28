import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRole() {
      try {
        const userData = await SecureStore.getItemAsync("userData");
        if (userData) {
          const user = JSON.parse(userData);
          setUserRole(user.role);
        }
      } catch (e) {
        console.error("Layout Role Error:", e);
      } finally {
        setLoading(false);
      }
    }
    getRole();
  }, []);

  // Αν ακόμα φορτώνει ο ρόλος, δείξε ένα spinner για να μη σκάσει το ReferenceError
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fa' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{
      headerShown: false,
      // Κρύβουμε το κάτω bar γιατί χρησιμοποιούμε το δικό μας Side Bar στο Dashboard
      tabBarStyle: { display: 'none' }, 
    }}>
      {/* Κύρια οθόνη */}
      <Tabs.Screen name="dashboard" />
      
      {/* Οθόνες για το Παιδί - href: null για να μην φαίνονται στα tabs */}
      <Tabs.Screen name="pockets" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="spend" options={{ href: null }} />
      <Tabs.Screen name="invest" options={{ href: null }} />
      
      {/* Οθόνες για τον Γονέα */}
      <Tabs.Screen name="transaction" options={{ href: null }} />
      <Tabs.Screen name="popup" options={{ href: null }} />
      
      <Tabs.Screen
        name="accept"
        options={{
          title: "Εγκρίσεις",
          // Τώρα η userRole υπάρχει και η σύγκριση θα δουλέψει!
          href: userRole === 'parent' ? '/accept' : null, 
          tabBarIcon: ({ color }) => <Ionicons name="checkmark-circle" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
  name="quiz"
  options={{
    title: "Quiz",
    // Επιτρέπουμε την πρόσβαση μόνο αν είναι παιδί
    href: userRole === 'kid' ? '/quiz' : null, 
    tabBarIcon: ({ color }) => <Ionicons name="school" size={24} color={color} />,
  }}
/>
    </Tabs>
  );
}