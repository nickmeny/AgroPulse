import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { display: 'none' }, 
    }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="pockets" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="transaction" options={{ href: null }} />
      <Tabs.Screen name="spend" options={{ href: null }} />
      <Tabs.Screen name="popup" options={{ href: null }} />
    </Tabs>
  );
}