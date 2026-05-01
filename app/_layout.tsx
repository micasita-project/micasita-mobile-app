/**
 * @layer app (pages)
 * @description Root Layout.
 * Guards: login → onboarding (if no workplaces) → main app.
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/features/auth';
import { queryClient } from '@/shared/api';
import { Colors } from '@/shared/config/colors';
import { apiClient } from '@/shared/api';

function useProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [checkingWorkplaces, setCheckingWorkplaces] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    // Skip the very first render — Stack needs to mount first
    if (!hasNavigated) {
      setHasNavigated(true);
      return;
    }

    const inLoginPage = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && inLoginPage) {
      // Check if user has workplaces before sending to main app
      setCheckingWorkplaces(true);
      apiClient
        .get('/workplaces/')
        .then((response) => {
          const workplaces = response.data;
          if (!workplaces || workplaces.length === 0) {
            router.replace('/onboarding');
          } else {
            router.replace('/(tabs)');
          }
        })
        .catch(() => {
          // If the request fails, send to tabs anyway
          router.replace('/(tabs)');
        })
        .finally(() => setCheckingWorkplaces(false));
    } else if (isAuthenticated && inOnboarding) {
      // Allow staying in onboarding
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
      <Stack.Screen name="onboarding" />
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
      <Stack.Screen
        name="publish-housing"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="my-listings"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Mis publicaciones',
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
