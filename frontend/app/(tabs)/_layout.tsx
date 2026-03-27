import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#1a73e8',
      tabBarStyle: { height: 60, paddingBottom: 10 },
    }}>
      <Tabs.Screen name="dashboard" options={{
          title: 'Αρχική',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
      }} />
      <Tabs.Screen name="history" options={{
          title: 'Κινήσεις',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
      }} />
    </Tabs>
  );
}