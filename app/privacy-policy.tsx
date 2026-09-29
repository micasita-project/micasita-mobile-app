/**
 * @layer app (pages)
 * @description Política de Privacidad de MiCasita (texto en features/auth/model/privacyPolicy.ts).
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/shared/config/colors";
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_DATE,
} from "@/features/auth/model/privacyPolicy";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.textOnPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Política de Privacidad</Text>
          <Text style={styles.subtitle}>
            Versión {PRIVACY_POLICY_VERSION} · {PRIVACY_POLICY_DATE}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((p) => (
              <Text key={p} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 20, fontWeight: "800", color: Colors.textOnPrimary },
  subtitle: { fontSize: 13, color: Colors.textOnPrimary + "BB", marginTop: 2 },
  content: { padding: 16, gap: 14 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  paragraph: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
});
