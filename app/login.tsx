/**
 * @layer app (pages)
 * @description Login screen — layout component that composes the LoginForm feature.
 * Strictly adheres to FSD: pages should be thin and compose widgets/features.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LoginForm } from '@/features/auth';
import { Colors } from '@/shared/config/colors';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="home" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>MiCasita</Text>
            <Text style={styles.subtitle}>
              Encuentra tu hogar ideal{'\n'}cerca de tu trabajo
            </Text>
          </View>

          {/* Feature: Login Form */}
          <LoginForm />
          
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 60,
  },
  header: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  appName: {
    fontSize: 34, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 22,
  },
});
