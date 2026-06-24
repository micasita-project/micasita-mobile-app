/**
 * @layer app (pages)
 * @description Página de edición de cuenta: datos personales + cambio de contraseña.
 * Reemplaza el antiguo BottomSheet de "Editar Perfil" del tab de perfil.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth";
import { updateProfile, changePassword } from "@/features/auth/api/auth.service";
import { Colors } from "@/shared/config/colors";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  // ── Datos personales ─────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Contraseña ───────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      await refreshUser();
      Alert.alert("Listo", "Tu perfil fue actualizado.");
    } catch {
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Campo requerido", "Ingresa tu contraseña actual.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Contraseña muy corta", "La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Listo", "Tu contraseña fue actualizada.");
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ?? "No se pudo cambiar la contraseña.";
      Alert.alert("Error", message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textOnPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Editar perfil</Text>
            <Text style={styles.headerSubtitle}>Datos personales y seguridad</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Información personal ─────────────────────────────── */}
          <Text style={styles.sectionLabel}>INFORMACIÓN PERSONAL</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Correo</Text>
            <View style={[styles.fieldInput, styles.fieldDisabled]}>
              <Text style={styles.fieldDisabledText} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Nombre"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Apellido</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Apellido"
              placeholderTextColor={Colors.textMuted}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, savingProfile && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Seguridad ───────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>SEGURIDAD</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Contraseña actual</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Contraseña actual"
                placeholderTextColor={Colors.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nueva contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={Colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity
                onPress={() => setShowNew((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Confirmar nueva contraseña</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Repite la nueva contraseña"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNew}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, savingPassword && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
              activeOpacity={0.85}
            >
              {savingPassword ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerBackBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: Colors.textOnPrimary },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textOnPrimary + "BB",
    marginTop: 2,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  fieldDisabled: { justifyContent: "center" },
  fieldDisabledText: { fontSize: 15, color: Colors.textMuted },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeBtn: { paddingHorizontal: 14 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: Colors.textOnPrimary },
  btnDisabled: { opacity: 0.7 },
});
