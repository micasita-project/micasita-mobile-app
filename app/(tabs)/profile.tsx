/**
 * @layer app (pages)
 * @description User profile page with current home, workplace info and mini-map.
 *
 * FSD Composition:
 * - features/auth → useAuth
 * - shared/ui → Button
 * - shared/config → Colors, OSM_TILE_URL
 */

import { useAuth } from '@/features/auth';
import { Colors } from '@/shared/config/colors';
import { OSM_TILE_URL } from '@/shared/config/map';
import { Button } from '@/shared/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-circle-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No hay sesión activa</Text>
      </View>
    );
  }

  const workRegion = { ...user.workplace.coordinates, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={36} color={Colors.textOnPrimary} />
        </View>
        <Text style={styles.userName}>{user.name} {user.lastName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Current Home */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Casa Actual</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dirección</Text>
          <Text style={styles.infoValue}>{user.currentHome.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distrito</Text>
          <Text style={styles.infoValue}>{user.currentHome.district}</Text>
        </View>
      </View>

      {/* Workplace */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="briefcase" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Centro de Trabajo</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Empresa</Text>
          <Text style={styles.infoValue}>{user.workplace.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dirección</Text>
          <Text style={styles.infoValue}>{user.workplace.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distrito</Text>
          <Text style={styles.infoValue}>{user.workplace.district}</Text>
        </View>
      </View>

      {/* Mini-map */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Ubicación del Trabajo</Text>
        </View>
        <View style={styles.miniMapContainer}>
          <MapView
            style={styles.miniMap}
            provider={PROVIDER_DEFAULT}
            region={workRegion}
            mapType="none"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} tileSize={256} />
            <Marker coordinate={user.workplace.coordinates}>
              <View style={styles.workMarker}>
                <Ionicons name="briefcase" size={16} color={Colors.textOnPrimary} />
              </View>
            </Marker>
          </MapView>
        </View>
      </View>

      {/* Project info */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="school" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Información del Proyecto</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Proyecto</Text>
          <Text style={styles.infoValue}>MiCasita — Recomendador</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Módulo</Text>
          <Text style={styles.infoValue}>Optimización de Rutas</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ciclo</Text>
          <Text style={styles.infoValue}>9° Ciclo — Ingeniería</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versión</Text>
          <Text style={styles.infoValueMono}>v1.0.0 (Prototipo)</Text>
        </View>
      </View>

      <Button title="Cerrar Sesión" onPress={logout} variant="outline" style={styles.logoutButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, gap: 12,
  },
  emptyText: { fontSize: 16, color: Colors.textMuted },
  profileCard: {
    backgroundColor: Colors.primary, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  avatarContainer: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  userName: { fontSize: 22, fontWeight: '800', color: Colors.textOnPrimary },
  userEmail: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },
  infoValueMono: {
    fontSize: 12, color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 2, textAlign: 'right',
  },
  miniMapContainer: { borderRadius: 12, overflow: 'hidden', height: 180 },
  miniMap: { ...StyleSheet.absoluteFillObject },
  workMarker: {
    backgroundColor: Colors.markerWork, borderRadius: 20,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  logoutButton: { marginTop: 8 },
});
