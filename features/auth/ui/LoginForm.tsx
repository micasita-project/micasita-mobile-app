/**
 * @layer features/auth/ui
 * @description Auth form con toggle Login / Registro — modern minimal design.
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
import { useGuest } from '@/features/guest';
import { Colors } from '@/shared/config/colors';

type AuthMode = 'login' | 'register';

export function LoginForm() {
  const { login, register, isLoading } = useAuth();
  const { guestHome, guestWorkplace, clearGuestData } = useGuest();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden.');
        return;
      }
      const result = await register(
        email.trim(),
        password,
        {
          home: guestHome ? { lat: guestHome.lat, lon: guestHome.lon, address: guestHome.address } : undefined,
          workplace: guestWorkplace ? {
            lat: guestWorkplace.lat,
            lon: guestWorkplace.lon,
            budget: guestWorkplace.budget,
            transport: guestWorkplace.transport,
            address: guestWorkplace.address,
          } : undefined,
        },
        name.trim() || undefined,
        lastName.trim() || undefined,
      );
      if (result.success) {
        await clearGuestData();
      } else {
        Alert.alert('Error al registrar', result.error ?? 'Intenta con otro email.');
      }
    } else {
      const success = await login(email.trim(), password);
      if (success) {
        await clearGuestData();
      } else {
        Alert.alert('Error', 'Email o contraseña incorrectos.');
      }
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setConfirmPassword('');
    setName('');
    setLastName('');
  };

  return (
    <>
      <View style={styles.form}>
        {/* Nombre y apellido (solo registro) */}
        {mode === 'register' && (
          <View style={styles.nameRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="given-name"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <TextInput
                style={[styles.input, { paddingLeft: 16 }]}
                placeholder="Apellido"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </View>
          </View>
        )}

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

        {/* Confirm Password (only on register) */}
        {mode === 'register' && (
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>
        )}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Text>
              <Ionicons
                name={mode === 'login' ? 'arrow-forward' : 'person-add'}
                size={20}
                color={Colors.primary}
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Toggle mode */}
      <TouchableOpacity onPress={toggleMode} style={styles.toggleContainer} activeOpacity={0.7}>
        <Text style={styles.toggleText}>
          {mode === 'login'
            ? '¿No tienes cuenta? '
            : '¿Ya tienes cuenta? '}
        </Text>
        <Text style={styles.toggleAction}>
          {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, marginBottom: 24 },
  nameRow: { flexDirection: 'row', gap: 10 },
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
  submitButton: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    fontSize: 16, fontWeight: '700', color: Colors.primary,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  toggleAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
