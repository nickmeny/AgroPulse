import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const storedUser = await SecureStore.getItemAsync("userData");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setRole(user.role);
      }
    };
    checkRole();
  }, []);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { display: 'none' }, // Κρυφό κάτω μέρος
    }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="transaction" />
      <Tabs.Screen name="popup" />
      <Tabs.Screen name="index" /> 
    </Tabs>
  );
}