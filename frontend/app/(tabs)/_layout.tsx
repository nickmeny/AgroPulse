import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { display: 'none' }, // Εξαφανίζει το κάτω Tab Bar τελείως
    }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="index" /> 
    </Tabs>
  );
}