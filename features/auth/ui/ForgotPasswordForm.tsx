/**
 * @layer features/auth/ui
 * @description Flujo de recuperación de contraseña en 2 pasos:
 *  1. Solicitar código (email) → POST /auth/forgot-password
 *  2. Ingresar OTP + nueva contraseña → POST /auth/reset-password
 * Composed into app/forgot-password.tsx.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { forgotPassword, resetPassword } from "@/features/auth/api/auth.service";
import { OtpInput } from "@/shared/ui/OtpInput";
import { Colors } from "@/shared/config/colors";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

type Step = "request" | "reset";

export function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleRequest = async () => {
    if (!email.trim()) {
      Alert.alert("Campo requerido", "Ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setStep("reset");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      // El backend responde genérico; ante error de red mostramos aviso.
      Alert.alert("Error", "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await forgotPassword(email.trim());
      setCooldown(RESEND_COOLDOWN);
      Alert.alert("Código enviado", "Revisa tu correo (y la carpeta de spam).");
    } catch {
      Alert.alert("Error", "No se pudo reenviar el código.");
    }
  };

  const handleReset = async () => {
    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Código incompleto", "Ingresa los 6 dígitos del código.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Contraseña muy corta", "Debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), otp, password);
      Alert.alert(
        "Contraseña actualizada",
        "Ya puedes iniciar sesión con tu nueva contraseña.",
      );
      router.replace("/login");
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ?? "Código incorrecto o expirado.";
      Alert.alert("Error", message);
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 1: solicitar código ───────────────────────────────────
  if (step === "request") {
    return (
      <View style={styles.form}>
        <Text style={styles.label}>
          Ingresa tu correo y te enviaremos un código para restablecer tu
          contraseña.
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="rgba(255,255,255,0.5)"
            style={styles.inputIcon}
          />
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

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleRequest}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Enviar código</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Paso 2: OTP + nueva contraseña ─────────────────────────────
  return (
    <View style={styles.form}>
      <Text style={styles.label}>
        Enviamos un código de 6 dígitos a:
      </Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.otpWrapper}>
        <OtpInput
          length={OTP_LENGTH}
          value={otp}
          onChange={setOtp}
          disabled={loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="rgba(255,255,255,0.5)"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Nueva contraseña"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="rgba(255,255,255,0.5)"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons
          name="shield-checkmark-outline"
          size={20}
          color="rgba(255,255,255,0.5)"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleReset}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Restablecer contraseña</Text>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={cooldown > 0}
        style={styles.resendContainer}
        activeOpacity={0.7}
      >
        <Text style={styles.resendText}>
          {cooldown > 0
            ? `Reenviar código en ${cooldown}s`
            : "¿No recibiste el código? Reenviar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  label: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: -6,
  },
  otpWrapper: { marginVertical: 6 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  inputIcon: { paddingLeft: 16 },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  eyeButton: { paddingRight: 16, paddingVertical: 16 },
  submitButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  resendContainer: { alignItems: "center", marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
});
