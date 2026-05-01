/**
 * @layer app (pages)
 * @description Housing list page with district filters.
 * - Publish FAB and "Mis publicaciones" only visible for authenticated users.
 * - Guests can browse all properties freely.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { HousingCard } from '@/entities/housing';
import { useProperties } from '@/entities/housing/model/useProperties';
import { Colors } from '@/shared/config/colors';
import type { Housing } from '@/shared/types';

export default function HousingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: allHousing = [], isLoading, isError, refetch } = useProperties();

  const districts = useMemo(() => {
    const set = new Set(allHousing.map((h) => h.district));
    return Array.from(set).sort();
  }, [allHousing]);

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const filteredHousing = useMemo(() => {
    if (!selectedDistrict) return allHousing;
    return allHousing.filter((h) => h.district === selectedDistrict);
  }, [selectedDistrict, allHousing]);

  const handleHousingPress = useCallback((housing: Housing) => {
    router.push({ pathname: '/housing-detail', params: { id: housing.id } });
  }, [router]);

  const handlePublishPress = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Inicia sesión',
        'Necesitas una cuenta para publicar una vivienda.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]
      );
      return;
    }
    router.push('/publish-housing');
  }, [isAuthenticated, router]);

  const renderHousingItem = useCallback(({ item }: { item: Housing }) => (
    <HousingCard housing={item} onPress={handleHousingPress} />
  ), [handleHousingPress]);

  // ── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando viviendas...</Text>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────
  if (isError) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.errorText}>No se pudo conectar al servidor</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Ionicons name="refresh-outline" size={16} color={Colors.textOnPrimary} />
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* "Mis publicaciones" — only for authenticated users */}
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.myListingsBanner}
          onPress={() => router.push('/my-listings')}
          activeOpacity={0.85}
        >
          <View style={styles.myListingsBannerLeft}>
            <Ionicons name="list-outline" size={18} color={Colors.primary} />
            <Text style={styles.myListingsBannerText}>Mis publicaciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* District filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filtrar por distrito:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedDistrict && styles.filterChipActive]}
            onPress={() => setSelectedDistrict(null)}
          >
            <Text style={[styles.filterChipText, !selectedDistrict && styles.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {districts.map((district) => (
            <TouchableOpacity
              key={district}
              style={[styles.filterChip, selectedDistrict === district && styles.filterChipActive]}
              onPress={() => setSelectedDistrict(selectedDistrict === district ? null : district)}
            >
              <Text style={[styles.filterChipText, selectedDistrict === district && styles.filterChipTextActive]}>
                {district}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {filteredHousing.length} vivienda{filteredHousing.length !== 1 ? 's' : ''} disponible{filteredHousing.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredHousing}
        renderItem={renderHousingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏚️</Text>
            <Text style={styles.emptyText}>No se encontraron viviendas en este distrito</Text>
          </View>
        }
      />

      {/* FAB — Publicar vivienda (visible for all, requires auth) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePublishPress}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
        <Text style={styles.fabText}>Publicar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: Colors.background,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  errorText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 20, marginTop: 4,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },

  myListingsBanner: {
    backgroundColor: Colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  myListingsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myListingsBannerText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  filterSection: {
    backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  filterScroll: { gap: 8 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.textOnPrimary },

  resultCount: { paddingHorizontal: 16, paddingVertical: 10 },
  resultCountText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
});
