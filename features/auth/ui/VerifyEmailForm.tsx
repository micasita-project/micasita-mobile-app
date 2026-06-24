/**
 * @layer features/auth/ui
 * @description Formulario de verificación de correo por OTP.
 * Tras registrarse, el usuario ingresa el código de 6 dígitos enviado a su email.
 * Composed into app/verify-email.tsx.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/features/auth/model/AuthContext";
import { useGuest } from "@/features/guest";
import { verifyEmail } from "@/features/auth/api/auth.service";
import { OtpInput } from "@/shared/ui/OtpInput";
import { Colors } from "@/shared/config/colors";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // segundos

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const {
    pendingEmail,
    completePendingVerification,
    resendVerification,
    isLoading,
  } = useAuth();
  const { clearGuestData } = useGuest();

  const email = pendingEmail ?? params.email ?? "";

  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cuenta regresiva para reenviar el código
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Evita doble envío cuando el auto-submit y el botón coinciden
  const submittedRef = useRef(false);

  const handleVerify = async (code?: string) => {
    const value = code ?? otp;
    if (value.length !== OTP_LENGTH) {
      Alert.alert("Código incompleto", "Ingresa los 6 dígitos del código.");
      return;
    }
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      if (pendingEmail) {
        // Flujo normal: verifica, inicia sesión y transfiere datos de invitado.
        const result = await completePendingVerification(value);
        if (result.success) {
          await clearGuestData();
          // El guard de routing redirige automáticamente (onboarding / tabs).
        } else {
          Alert.alert("Error", result.error ?? "Código incorrecto o expirado.");
          setOtp("");
        }
      } else {
        // Flujo alterno (sesión perdida): solo verifica y manda a iniciar sesión.
        await verifyEmail(email, value);
        Alert.alert(
          "Correo verificado",
          "Tu cuenta fue verificada. Ahora inicia sesión.",
        );
        router.replace("/login");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ?? "Código incorrecto o expirado.";
      Alert.alert("Error", message);
      setOtp("");
    } finally {
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    const result = await resendVerification(email);
    if (result.success) {
      setCooldown(RESEND_COOLDOWN);
      Alert.alert("Código enviado", "Revisa tu correo (y la carpeta de spam).");
    } else {
      Alert.alert("Error", result.error ?? "No se pudo reenviar el código.");
    }
  };

  const busy = submitting || isLoading;

  return (
    <View style={styles.form}>
      <Text style={styles.label}>
        Enviamos un código de 6 dígitos a:
      </Text>
      <Text style={styles.email}>{email || "tu correo"}</Text>

      <View style={styles.otpWrapper}>
        <OtpInput
          length={OTP_LENGTH}
          value={otp}
          onChange={setOtp}
          onComplete={(code) => handleVerify(code)}
          disabled={busy}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, busy && styles.submitButtonDisabled]}
        onPress={() => handleVerify()}
        disabled={busy}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Verificar</Text>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={cooldown > 0 || busy}
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
  form: { gap: 16 },
  label: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: -8,
  },
  otpWrapper: { marginVertical: 8 },
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
