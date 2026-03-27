import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Αυτό είναι το Login (app/index.tsx) */}
      <Stack.Screen name="index" /> 
      {/* Αυτό είναι το group των Tabs */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}