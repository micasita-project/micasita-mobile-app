/**
 * @layer app (pages)
 * @description Housing list page with infinite scroll and advanced filters via BottomSheet.
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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { HousingCard } from '@/entities/housing';
import { useProperties, useToggleFavorite } from '@/entities/housing/model/useProperties';
import type { PropertyFilters } from '@/entities/housing/api/housing.api';
import { Colors } from '@/shared/config/colors';
import type { Housing } from '@/shared/types';
import { BottomSheet } from '@/shared/ui/BottomSheet';

// ── Filter defaults ──────────────────────────────────────────────
const EMPTY_FILTERS: PropertyFilters = {};

function filtersAreActive(f: PropertyFilters): boolean {
  return !!(
    f.district || 
    f.bedrooms != null || 
    f.bathrooms != null || 
    f.parking != null || 
    f.min_area_sqm != null ||
    f.min_price != null ||
    f.max_price != null
  );
}

// ── Filter Panel ─────────────────────────────────────────────────
function StepperField({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const dec = () => {
    if (value == null || value <= 1) { onChange(undefined); return; }
    onChange(value - 1);
  };
  const inc = () => onChange((value ?? 0) + 1);
  return (
    <View style={filterStyles.stepperRow}>
      <View style={filterStyles.stepperLabelContainer}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} style={{ marginRight: 10 }} />
        <Text style={filterStyles.stepperLabel}>{label}</Text>
      </View>
      <View style={filterStyles.stepperControls}>
        <TouchableOpacity onPress={dec} style={filterStyles.stepperBtn}>
          <Ionicons name="remove" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={filterStyles.stepperValue}>{value ?? '–'}</Text>
        <TouchableOpacity onPress={inc} style={filterStyles.stepperBtn}>
          <Ionicons name="add" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HousingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Applied filters (sent to API)
  const [filters, setFilters] = useState<PropertyFilters>(EMPTY_FILTERS);
  // Draft filters (being edited in BottomSheet)
  const [draft, setDraft] = useState<PropertyFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useProperties(filters);
  const toggleFavorite = useToggleFavorite();

  const allHousing = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );
  const total = data?.pages[0]?.total ?? 0;
  const activeFilters = filtersAreActive(filters);

  const handleHousingPress = useCallback(
    (housing: Housing) => {
      router.push({ pathname: '/housing-detail', params: { id: housing.id, data: JSON.stringify(housing) } });
    },
    [router]
  );

  const handlePublishPress = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para publicar una vivienda.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => router.push('/login') },
      ]);
      return;
    }
    router.push('/publish-housing');
  }, [isAuthenticated, router]);

  const openFilters = () => {
    setDraft({ ...filters });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...draft });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFilterOpen(false);
  };

  const handleFavoriteToggle = useCallback(
    (id: string, isFavorite: boolean) => {
      if (!isAuthenticated) {
        Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar favoritos.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]);
        return;
      }
      toggleFavorite.mutate({ id, isFavorite });
    },
    [isAuthenticated, router, toggleFavorite]
  );

  const renderHousingItem = useCallback(
    ({ item }: { item: Housing }) => (
      <HousingCard 
        housing={item} 
        onPress={handleHousingPress} 
        onFavoriteToggle={handleFavoriteToggle}
      />
    ),
    [handleHousingPress, handleFavoriteToggle]
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  // ── Loading state ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando viviendas...</Text>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────
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

      {/* Header bar: count + filter button */}
      <View style={styles.headerBar}>
        <Text style={styles.resultCountText}>
          <Text style={styles.resultCountBold}>{total}</Text> vivienda{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          onPress={openFilters}
          style={[styles.filterBtn, activeFilters && styles.filterBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={18} color={activeFilters ? Colors.textOnPrimary : Colors.textPrimary} />
          <Text style={[styles.filterBtnText, activeFilters && styles.filterBtnTextActive]}>Filtros</Text>
          {activeFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={allHousing}
        renderItem={renderHousingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏚️</Text>
            <Text style={styles.emptyText}>No se encontraron viviendas con estos filtros</Text>
            {activeFilters && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* FAB — Publicar vivienda */}
      <TouchableOpacity style={styles.fab} onPress={handlePublishPress} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
        <Text style={styles.fabText}>Publicar</Text>
      </TouchableOpacity>

      {/* Filter BottomSheet */}
      <BottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        maxHeightRatio={0.58}
        expandable
        footer={
          <View style={filterStyles.actions}>
            <TouchableOpacity
              style={[filterStyles.clearBtn, !filtersAreActive(draft) && filterStyles.btnDisabled]}
              onPress={clearFilters}
              disabled={!filtersAreActive(draft)}
            >
              <Text style={filterStyles.clearBtnText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[filterStyles.applyBtn, !filtersAreActive(draft) && filterStyles.btnDisabled]}
              onPress={applyFilters}
              disabled={!filtersAreActive(draft)}
            >
              <Text style={filterStyles.applyBtnText}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={filterStyles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={filterStyles.title}>Filtros de búsqueda</Text>

          {/* District */}
          <Text style={filterStyles.sectionLabel}>Distrito</Text>
          <View style={filterStyles.inputRow}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={filterStyles.input}
              placeholder="Ej. Miraflores, San Isidro..."
              placeholderTextColor={Colors.textMuted}
              value={draft.district ?? ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, district: t || undefined }))}
              autoCapitalize="words"
            />
            {draft.district ? (
              <TouchableOpacity onPress={() => setDraft((d) => ({ ...d, district: undefined }))}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Bedrooms / Bathrooms / Parking */}
          <Text style={filterStyles.sectionLabel}>Características</Text>
          <StepperField
            label="Habitaciones"
            icon="bed-outline"
            value={draft.bedrooms}
            onChange={(v) => setDraft((d) => ({ ...d, bedrooms: v }))}
          />
          <StepperField
            label="Baños"
            icon="water-outline"
            value={draft.bathrooms}
            onChange={(v) => setDraft((d) => ({ ...d, bathrooms: v }))}
          />
          <StepperField
            label="Estacionamientos"
            icon="car-outline"
            value={draft.parking}
            onChange={(v) => setDraft((d) => ({ ...d, parking: v }))}
          />

          {/* Min area */}
          <Text style={filterStyles.sectionLabel}>Área mínima (m²)</Text>
          <View style={filterStyles.inputRow}>
            <Ionicons name="resize-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={filterStyles.input}
              placeholder="Ej. 50"
              placeholderTextColor={Colors.textMuted}
              value={draft.min_area_sqm != null ? String(draft.min_area_sqm) : ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, min_area_sqm: t ? Number(t) : undefined }))}
              keyboardType="numeric"
            />
            {draft.min_area_sqm != null ? (
              <TouchableOpacity onPress={() => setDraft((d) => ({ ...d, min_area_sqm: undefined }))}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Price Range */}
          <Text style={filterStyles.sectionLabel}>Rango de precio ($)</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[filterStyles.inputRow, { flex: 1 }]}>
              <Text style={{ fontSize: 13, color: Colors.textMuted, fontWeight: '600' }}>Min</Text>
              <TextInput
                style={filterStyles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={draft.min_price != null ? String(draft.min_price) : ''}
                onChangeText={(t) => setDraft((d) => ({ ...d, min_price: t ? Number(t) : undefined }))}
                keyboardType="numeric"
              />
              {draft.min_price != null ? (
                <TouchableOpacity onPress={() => setDraft((d) => ({ ...d, min_price: undefined }))}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[filterStyles.inputRow, { flex: 1 }]}>
              <Text style={{ fontSize: 13, color: Colors.textMuted, fontWeight: '600' }}>Max</Text>
              <TextInput
                style={filterStyles.input}
                placeholder="Inf"
                placeholderTextColor={Colors.textMuted}
                value={draft.max_price != null ? String(draft.max_price) : ''}
                onChangeText={(t) => setDraft((d) => ({ ...d, max_price: t ? Number(t) : undefined }))}
                keyboardType="numeric"
              />
              {draft.max_price != null ? (
                <TouchableOpacity onPress={() => setDraft((d) => ({ ...d, max_price: undefined }))}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </BottomSheet>
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
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  resultCountText: { fontSize: 13, color: Colors.textSecondary },
  resultCountBold: { fontWeight: '700', color: Colors.textPrimary },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  filterBtnTextActive: { color: Colors.textOnPrimary },
  filterDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.textOnPrimary, marginLeft: 2,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 16 },
  clearBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
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

const filterStyles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 48,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  stepperLabel: { fontSize: 15, color: Colors.textPrimary },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  stepperValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  applyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
  stepperLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
});
