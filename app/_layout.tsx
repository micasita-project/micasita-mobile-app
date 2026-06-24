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


import { useWorkplaces } from '@/entities/workplace/model/useWorkplaces';

function useProtectedRoute() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);

  const isNormalUserWithHome = !!isAuthenticated && user?.role !== 'admin' && !!user?.home_address;
  const { data: workplaces, isLoading: isWorkplacesLoading, isFetching: isWorkplacesFetching } = useWorkplaces(isNormalUserWithHome);

  useEffect(() => {
    if (!isInitialized) return;

    const inLoginPage = segments[0] === 'login';
    const inVerifyEmail = segments[0] === 'verify-email';
    const inOnboarding = segments[0] === 'onboarding';
    const inAdmin = segments[0] === '(admin)';
    const inHousingDetail = segments[0] === 'housing-detail';

    // -- Flujo para Administradores --
    if (isAuthenticated && user?.role === 'admin') {
      if (!hasNavigated) setHasNavigated(true);
      if (!inAdmin && !inHousingDetail) {
        router.replace('/(admin)');
      }
      return;
    }

    // -- Flujo para Usuarios Normales --
    if (isAuthenticated && user?.role !== 'admin') {
      if (inAdmin) {
        if (!hasNavigated) setHasNavigated(true);
        router.replace('/(tabs)');
        return;
      }

      // 1. Verificación síncrona: si no tiene casa, falta onboarding
      if (!user?.home_address) {
        if (!hasNavigated) setHasNavigated(true);
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }

      // 2. Esperar a que la consulta de workplaces termine
      if (isWorkplacesLoading || isWorkplacesFetching) return;

      if (!hasNavigated) setHasNavigated(true);

      const hasWorkplaces = workplaces && workplaces.length > 0;

      // Si definitivamente no tiene workplaces, ir al onboarding
      if (!hasWorkplaces) {
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }

      // Si todo está bien y viene de login o verificación, mandarlo a tabs
      if (inLoginPage || inVerifyEmail) {
        router.replace('/(tabs)');
      }
      return;
    }

    // -- Flujo para Invitados (No Autenticados) --
    if (!isAuthenticated) {
      if (!hasNavigated) setHasNavigated(true);
      if (inOnboarding || inAdmin) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isInitialized, hasNavigated, segments, router, user, workplaces, isWorkplacesLoading, isWorkplacesFetching]);
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
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="edit-profile" />
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
