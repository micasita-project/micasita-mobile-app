/**
 * @layer app (pages)
 * @description User profile page with current home, workplace info and mini-map.
 */

import { useAuth } from "@/features/auth";
import { Colors } from "@/shared/config/colors";
import { HomeSheet } from "@/widgets/home/ui/HomeSheet";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ── Edit Home ────────────────────────────────────────────────────
  const [isEditHomeVisible, setIsEditHomeVisible] = useState(false);
  const openEditHome = useCallback(() => setIsEditHomeVisible(true), []);
  const closeEditHome = useCallback(() => setIsEditHomeVisible(false), []);

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconBg}>
            <Ionicons name="person-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.guestTitle}>¡Bienvenido a MiCasita!</Text>
          <Text style={styles.guestSubtitle}>
            Crea una cuenta o inicia sesión para guardar tus lugares de trabajo,
            ver tu historial y acceder a recomendaciones personalizadas.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="log-in-outline"
              size={20}
              color={Colors.textOnPrimary}
            />
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() =>
              router.push({ pathname: "/login", params: { tab: "register" } })
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name="person-add-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.registerBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.guestBenefits}>
          {[
            { icon: "bookmark-outline", text: "Guarda tus lugares de trabajo" },
            {
              icon: "analytics-outline",
              text: "Historial de recomendaciones IA",
            },
            { icon: "home-outline", text: "Configura tu vivienda actual" },
          ].map((item) => (
            <View key={item.icon} style={styles.benefitRow}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile header card */}
        <View style={styles.profileHeader}>
          <View style={styles.profileMainInfo}>
            <View style={styles.avatarInitials}>
              <Text style={styles.avatarInitialsText}>
                {user.name
                  ? `${user.name[0]}${user.last_name?.[0] ?? ""}`.toUpperCase()
                  : user.email[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {user.name
                  ? `${user.name} ${user.last_name ?? ""}`.trim()
                  : "Usuario"}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileEditBtn}
              onPress={() => router.push("/edit-profile")}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick Stats Dashboard */}
          <View style={styles.statsDashboard}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push("/favorites" as any)}
            >
              <View style={[styles.statIconBg, { backgroundColor: '#FFEDF0' }]}>
                <Ionicons name="heart" size={20} color="#FF4B6E" />
              </View>
              <Text style={styles.statLabel}>Favoritos</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push("/my-listings" as any)}
            >
              <View style={[styles.statIconBg, { backgroundColor: '#E8F5FF' }]}>
                <Ionicons name="home" size={20} color="#0091FF" />
              </View>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mi vivienda actual */}
        <View style={styles.listSection}>
          <Text style={styles.listSectionLabel}>MI VIVIENDA ACTUAL</Text>
          <View style={[styles.listCard, { marginTop: 8 }]}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={openEditHome}
              activeOpacity={0.7}
            >
              <View style={styles.listRowIcon}>
                <Ionicons name="home" size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listRowTitle} numberOfLines={1}>
                  {user.home_address || "No configurada"}
                </Text>
                <Text style={styles.listRowMeta}>Toca para editar</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={16} color={Colors.error} />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
        <Text style={styles.footerVersion}>MiCasita · v1.0.0</Text>
      </ScrollView>

      {/* ══ Edit Home ══════════════════════════════════════════════ */}
      <HomeSheet visible={isEditHomeVisible} onClose={closeEditHome} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Guest
  guestContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: "center",
  },
  guestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  guestIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "12",
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  registerBtnText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  guestBenefits: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitText: { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },

  // Profile header
  profileHeader: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  profileMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatarInitials: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  profileName: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profileEditBtn: { 
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Dashboard
  statsDashboard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },

  // List sections
  listSection: { marginBottom: 14 },
  listSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  listSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  listSectionAdd: { flexDirection: "row", alignItems: "center", gap: 4 },
  listSectionAddText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowIconPrimary: { backgroundColor: Colors.primary },
  listRowTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  listRowMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  primaryBadge: {
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: "600", color: Colors.success },
  listEmptyRow: { padding: 16, alignItems: "center" },
  listEmptyText: { fontSize: 13, color: Colors.textMuted },
  settingDetail: { fontSize: 13, color: Colors.textSecondary, marginRight: 4 },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },
  logoutBtnText: { fontSize: 14, fontWeight: "600", color: Colors.error },
  footerVersion: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 20,
  },
});
