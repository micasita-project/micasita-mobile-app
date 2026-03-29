/**
 * @layer features/auth/ui
 * @description Formulario de inicio de sesión extraído como feature UI.
 * Contiene la lógica de validación y el layout del formulario.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '../model/AuthContext';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Colors } from '@/shared/config/colors';

/**
 * Formulario de login autocontenido.
 * Interactúa directamente con el AuthContext.
 */
export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!email.includes('@')) {
      newErrors.email = 'Ingresa un correo válido';
    }
    if (!password.trim()) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 4) {
      newErrors.password = 'Mínimo 4 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    const success = await login(email.trim(), password);
    if (!success) {
      Alert.alert(
        'Error de autenticación',
        'Credenciales incorrectas. Usa:\n\n📧 demo@micasita.pe\n🔑 123456',
        [{ text: 'Entendido' }]
      );
    }
  };

  return (
    <View style={styles.formSection}>
      <Text style={styles.formTitle}>Iniciar Sesión</Text>

      <Input
        label="Correo electrónico"
        placeholder="demo@micasita.pe"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        icon={<Text style={styles.inputIcon}>📧</Text>}
      />

      <Input
        label="Contraseña"
        placeholder="••••••"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="password"
        icon={<Text style={styles.inputIcon}>🔑</Text>}
      />

      <Button
        title={isLoading ? 'Verificando...' : 'Ingresar'}
        onPress={handleLogin}
        loading={isLoading}
        style={styles.loginButton}
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formSection: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputIcon: { fontSize: 18 },
  loginButton: { marginTop: 8 },
});
