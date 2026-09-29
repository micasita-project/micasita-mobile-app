/**
 * @layer features/auth/ui
 * @description Ventana bloqueante para cuentas anteriores a la política de privacidad:
 * el usuario debe aceptarla para seguir usando la app, o cerrar sesión.
 */

import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../model/AuthContext';
import { needsConsent } from '../model/consent';
import { acceptPrivacyPolicy } from '../api/auth.service';
import { Colors } from '@/shared/config/colors';

export function ConsentModal() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (!needsConsent(user)) return null;

  const handleAccept = async () => {
    setSaving(true);
    try {
      await acceptPrivacyPolicy();
      await refreshUser();
    } catch {
      Alert.alert('Error', 'No se pudo registrar tu aceptación. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Política de Privacidad</Text>
          <Text style={styles.body}>
            Actualizamos cómo tratamos tus datos personales. Para seguir usando MiCasita, revisa y
            acepta la Política de Privacidad.
          </Text>

          <TouchableOpacity onPress={() => router.push('/privacy-policy')} activeOpacity={0.7}>
            <Text style={styles.link}>Leer la Política de Privacidad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptBtn, saving && styles.disabled]}
            onPress={handleAccept}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.acceptText}>Acepto</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} disabled={saving} activeOpacity={0.7}>
            <Text style={styles.decline}>No acepto y cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 22, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  body: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  link: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  acceptBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  acceptText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
  decline: { fontSize: 13, fontWeight: '600', color: Colors.error, textAlign: 'center' },
});
