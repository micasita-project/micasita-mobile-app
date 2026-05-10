/**
 * @layer app (pages)
 * @description Root Layout.
 * Guards: guests land on tabs; authenticated users check workplaces → onboarding or tabs.
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/features/auth';
import { GuestProvider } from '@/features/guest';
import { SelectedWorkplaceProvider } from '@/shared/model/SelectedWorkplaceContext';
import { queryClient } from '@/shared/api';
import { Colors } from '@/shared/config/colors';
import { apiClient } from '@/shared/api';

function useProtectedRoute() {
  const { isAuthenticated, isInitialized, user } = useAuth();
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
    const inAdmin = segments[0] === '(admin)';
    const inHousingDetail = segments[0] === 'housing-detail';

    // -- Flujo para Administradores --
    if (isAuthenticated && user?.role === 'admin') {
      if (!inAdmin && !inHousingDetail) {
        router.replace('/(admin)');
      }
      return;
    }

    // -- Flujo para Usuarios Normales --
    if (isAuthenticated && user?.role !== 'admin') {
      if (inAdmin) {
        router.replace('/(tabs)');
        return;
      }
      if (inLoginPage) {
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
      return;
    }

    // -- Flujo para Invitados (No Autenticados) --
    if (!isAuthenticated) {
      if (inOnboarding || inAdmin) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isInitialized, hasNavigated, segments, router, user]);
}

function RootNavigator() {
  useProtectedRoute();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="(tabs)"
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen
        name="housing-detail"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="publish-housing"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="my-listings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="recommendation-insight"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="favorites"
        options={{
          headerShown: false,
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
