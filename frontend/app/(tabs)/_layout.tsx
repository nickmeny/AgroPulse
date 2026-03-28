import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      // Κρύβουμε το κάτω bar γιατί χρησιμοποιούμε το Side Bar μας
      tabBarStyle: { display: 'none' }, 
    }}>
      {/* Κύρια οθόνη */}
      <Tabs.Screen name="dashboard" />
      
      {/* Οθόνες για το Παιδί */}
      <Tabs.Screen name="pockets" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="spend" options={{ href: null }} />
      <Tabs.Screen name="invest" options={{ href: null }} /> {/* <--- Προστέθηκε το Invest */}
      
      {/* Οθόνες για τον Γονέα */}
      <Tabs.Screen name="transaction" options={{ href: null }} />
      <Tabs.Screen name="popup" options={{ href: null }} />
    </Tabs>
  );
}