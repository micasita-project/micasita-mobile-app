/**
 * @layer app (pages)
 * @description Pantalla de verificación de correo (OTP). Compone VerifyEmailForm.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VerifyEmailForm } from "@/features/auth/ui/VerifyEmailForm";
import { Colors } from "@/shared/config/colors";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const canGoBack = router.canGoBack();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {canGoBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={16}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="mail-unread" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Verifica tu correo</Text>
            <Text style={styles.subtitle}>
              Confirma tu cuenta para empezar a usar MiCasita.
            </Text>
          </View>

          <VerifyEmailForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
    paddingTop: Platform.OS === "ios" ? 110 : 90,
  },
  header: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
  },
});
