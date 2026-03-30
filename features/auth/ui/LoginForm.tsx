/**
 * @layer features/auth/ui
 * @description Login form feature UI — modern minimal design.
 * Composed into the app/login.tsx page.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/model/AuthContext';
import { Colors } from '@/shared/config/colors';
import { ENV } from '@/shared/config/env';

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const demoEmail = ENV.DEMO_EMAIL;
  const demoPassword = ENV.DEMO_PASSWORD;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    const success = await login(email.trim(), password);
    if (!success) {
      Alert.alert('Error', 'Credenciales incorrectas.');
    }
  };

  return (
    <>
      <View style={styles.form}>
        {/* Email */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="rgba(255,255,255,0.5)"
            />
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Text style={styles.loginButtonText}>Ingresar</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Credentials hint */}
      <View style={styles.hintContainer}>
        <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.45)" />
        <Text style={styles.hintText}>
          {demoEmail}  ·  {demoPassword}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  inputIcon: { paddingLeft: 16 },
  input: {
    flex: 1, paddingVertical: 16, paddingHorizontal: 12,
    fontSize: 15, color: '#FFFFFF',
  },
  eyeButton: { paddingRight: 16, paddingVertical: 16 },
  loginButton: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    fontSize: 16, fontWeight: '700', color: Colors.primary,
  },
  hintContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
