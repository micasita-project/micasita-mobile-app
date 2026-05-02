/**
 * @layer app (pages)
 * @description Root Layout.
 * Guards: guests land on tabs; authenticated users check workplaces → onboarding or tabs.
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/features/auth';
import { GuestProvider } from '@/features/guest';
import { SelectedWorkplaceProvider } from '@/shared/model/SelectedWorkplaceContext';
import { queryClient } from '@/shared/api';
import { Colors } from '@/shared/config/colors';
import { apiClient } from '@/shared/api';

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
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && inOnboarding) {
      // Guests can't access onboarding
      router.replace('/(tabs)');
    } else if (isAuthenticated && inLoginPage) {
      // Authenticated user in login → check workplaces
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
          router.replace('/(tabs)');
        });
    }
    // Guests on tabs or login → allow freely
  }, [isAuthenticated, isInitialized, hasNavigated, segments, router]);
}

function RootNavigator() {
  useProtectedRoute();

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="(tabs)"
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
        <GuestProvider>
          <SelectedWorkplaceProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </SelectedWorkplaceProvider>
        </GuestProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
