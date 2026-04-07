/**
 * @layer app (pages)
 * @description Root Layout.
 * Uses useEffect + router.replace with mount guard for auth navigation.
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth';
import { Colors } from '@/shared/config/colors';

function useProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    // Skip the very first render — Stack needs to mount first
    if (!hasNavigated) {
      setHasNavigated(true);
      return;
    }

    const inLoginPage = segments[0] === 'login';

    if (!isAuthenticated && !inLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && inLoginPage) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, hasNavigated, segments, router]);
}

function RootNavigator() {
  useProtectedRoute();

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="login"
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="housing-detail"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Detalle de Vivienda',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
