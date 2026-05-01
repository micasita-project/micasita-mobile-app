/**
 * @layer app (pages)
 * @description Pantalla de Recomendaciones IA.
 * Muestra recomendaciones cacheadas del workplace seleccionado.
 * Botón sutil de "actualizar" para re-ejecutar XGBoost.
 *
 * FSD Composition:
 * - entities/workplace → useWorkplaces
 * - features/recommendation → useLatestRecommendations, useGenerateRecommendations, useGuestRecommendations
 * - entities/housing → HousingCard
 * - features/auth → useAuth
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { HousingCard } from '@/entities/housing';
import { useWorkplaces } from '@/entities/workplace/model/useWorkplaces';
import {
  useLatestRecommendations,
  useGenerateRecommendations,
  useGuestRecommendations,
} from '@/features/recommendation/model/useRecommendations';
import { Colors } from '@/shared/config/colors';
import type { Housing } from '@/shared/types';
import type { RecommendationItem } from '@/features/recommendation/api/recommendation.api';

type TransportOption = 'Auto' | 'Bicicleta' | 'Caminando';
const TRANSPORT_OPTIONS: TransportOption[] = ['Auto', 'Bicicleta', 'Caminando'];
const TRANSPORT_ICONS: Record<TransportOption, string> = {
  Auto: 'car-outline',
  Bicicleta: 'bicycle-outline',
  Caminando: 'walk-outline',
};

export default function RecommendScreen() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Logged user: workplace selection
  const { data: workplaces = [], isLoading: loadingWorkplaces } = useWorkplaces(isAuthenticated);
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<number | null>(null);
  
  // Read cached recommendations (no IA)
  const {
    data: cachedResults,
    isLoading: loadingCached,
  } = useLatestRecommendations(selectedWorkplaceId);

  // Generate new recommendations (runs IA)
  const generateRecs = useGenerateRecommendations();

  // Guest: manual input
  const [guestLat, setGuestLat] = useState('');
  const [guestLon, setGuestLon] = useState('');
  const [guestBudget, setGuestBudget] = useState('');
  const [guestTransport, setGuestTransport] = useState<TransportOption>('Auto');
  const guestMutation = useGuestRecommendations();

  const handleGuestSubmit = useCallback(() => {
    const lat = parseFloat(guestLat);
    const lon = parseFloat(guestLon);
    const budget = parseFloat(guestBudget);
    if (isNaN(lat) || isNaN(lon) || isNaN(budget)) return;

    guestMutation.mutate({
      work_lat: lat,
      work_lon: lon,
      budget,
      preferred_transportation: guestTransport,
    });
  }, [guestLat, guestLon, guestBudget, guestTransport, guestMutation]);

  const handleHousingPress = useCallback((housing: Housing) => {
    router.push({ pathname: '/housing-detail', params: { id: housing.id } });
  }, [router]);

  const handleRefresh = useCallback(() => {
    if (!selectedWorkplaceId) return;
    Alert.alert(
      'Actualizar recomendaciones',
      'Esto ejecutará nuevamente el motor de IA. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: () => generateRecs.mutate(selectedWorkplaceId),
        },
      ]
    );
  }, [selectedWorkplaceId, generateRecs]);

  // Determine which results to show
  const results: RecommendationItem[] = isAuthenticated
    ? (cachedResults ?? [])
    : (guestMutation.data ?? []);
  const isLoadingResults = isAuthenticated
    ? (loadingCached || generateRecs.isPending)
    : guestMutation.isPending;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={28} color={Colors.textOnPrimary} />
          </View>
          <Text style={styles.headerTitle}>Recomendaciones IA</Text>
          <Text style={styles.headerSubtitle}>
            Nuestro motor XGBoost analiza distancia, presupuesto y transporte para encontrar tu vivienda ideal.
          </Text>
        </View>

        {/* ── Logged User: Select Workplace ──────────────────── */}
        {isAuthenticated ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Tu lugar de trabajo</Text>
            </View>

            {loadingWorkplaces ? (
              <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} />
            ) : workplaces.length === 0 ? (
              <View style={styles.emptyWorkplaces}>
                <Ionicons name="add-circle-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No tienes lugares de trabajo.</Text>
              </View>
            ) : (
              <View style={styles.workplaceList}>
                {workplaces.map((wp) => (
                  <TouchableOpacity
                    key={wp.id}
                    style={[
                      styles.workplaceChip,
                      selectedWorkplaceId === wp.id && styles.workplaceChipActive,
                    ]}
                    onPress={() => setSelectedWorkplaceId(
                      selectedWorkplaceId === wp.id ? null : wp.id
                    )}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location"
                      size={16}
                      color={selectedWorkplaceId === wp.id ? Colors.textOnPrimary : Colors.primary}
                    />
                    <View style={styles.workplaceChipText}>
                      <Text
                        style={[
                          styles.workplaceAlias,
                          selectedWorkplaceId === wp.id && styles.workplaceAliasActive,
                        ]}
                        numberOfLines={1}
                      >
                        {wp.alias}
                      </Text>
                      <Text
                        style={[
                          styles.workplaceMeta,
                          selectedWorkplaceId === wp.id && styles.workplaceMetaActive,
                        ]}
                      >
                        S/{wp.budget} · {wp.preferred_transportation}
                      </Text>
                    </View>
                    {selectedWorkplaceId === wp.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.textOnPrimary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* ── Guest: Manual Input ───────────────────────────── */
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="search" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Ingresa tus datos</Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Latitud trabajo</Text>
                  <TextInput
                    style={styles.input}
                    value={guestLat}
                    onChangeText={setGuestLat}
                    placeholder="-12.0975"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Longitud trabajo</Text>
                  <TextInput
                    style={styles.input}
                    value={guestLon}
                    onChangeText={setGuestLon}
                    placeholder="-77.0365"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Presupuesto mensual (S/)</Text>
              <TextInput
                style={styles.input}
                value={guestBudget}
                onChangeText={setGuestBudget}
                placeholder="1500"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Transporte preferido</Text>
              <View style={styles.transportRow}>
                {TRANSPORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.transportChip,
                      guestTransport === opt && styles.transportChipActive,
                    ]}
                    onPress={() => setGuestTransport(opt)}
                  >
                    <Ionicons
                      name={TRANSPORT_ICONS[opt] as any}
                      size={18}
                      color={guestTransport === opt ? Colors.textOnPrimary : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.transportText,
                        guestTransport === opt && styles.transportTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  guestMutation.isPending && styles.submitButtonDisabled,
                ]}
                onPress={handleGuestSubmit}
                disabled={guestMutation.isPending}
                activeOpacity={0.8}
              >
                {guestMutation.isPending ? (
                  <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={Colors.textOnPrimary} />
                    <Text style={styles.submitButtonText}>Recomendar con IA</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── Loading ────────────────────────────────────────── */}
        {isLoadingResults && (
          <View style={styles.loadingResults}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {generateRecs.isPending ? 'XGBoost analizando viviendas...' : 'Cargando recomendaciones...'}
            </Text>
          </View>
        )}

        {/* ── Results ──────────────────────────────────────────── */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Ionicons name="trophy" size={20} color={Colors.warning} />
              <Text style={styles.resultsTitle}>
                {results.length} vivienda{results.length !== 1 ? 's' : ''} recomendada{results.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Subtle refresh button */}
            {isAuthenticated && selectedWorkplaceId && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={generateRecs.isPending}
                activeOpacity={0.6}
              >
                <Ionicons name="refresh-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.refreshText}>Actualizar resultados</Text>
              </TouchableOpacity>
            )}

            {results.map((item, index) => (
              <View key={item.property.id} style={styles.resultCard}>
                {/* Rank badge */}
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>

                {/* Score bar */}
                <View style={styles.scoreRow}>
                  <View style={styles.scoreBarBackground}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        { width: `${Math.min(item.match_score, 100)}%` },
                        item.match_score >= 70
                          ? styles.scoreHigh
                          : item.match_score >= 40
                          ? styles.scoreMedium
                          : styles.scoreLow,
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreValue}>{item.match_score}%</Text>
                </View>

                {/* Time chip */}
                <View style={styles.timeChip}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.timeText}>~{item.predicted_time_min} min al trabajo</Text>
                </View>

                {/* Housing card */}
                <HousingCard housing={item.property} onPress={handleHousingPress} />
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!isLoadingResults && results.length === 0 && selectedWorkplaceId !== null && !loadingCached && (
          <View style={styles.emptyResults}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyResultsText}>Sin recomendaciones guardadas</Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => selectedWorkplaceId && generateRecs.mutate(selectedWorkplaceId)}
              disabled={generateRecs.isPending}
            >
              <Ionicons name="sparkles" size={16} color={Colors.textOnPrimary} />
              <Text style={styles.generateButtonText}>Generar recomendaciones</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  headerCard: {
    backgroundColor: Colors.primary, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textOnPrimary, marginBottom: 6 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },

  // Section cards
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  // Workplace chips
  workplaceList: { gap: 10 },
  workplaceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  workplaceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  workplaceChipText: { flex: 1 },
  workplaceAlias: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  workplaceAliasActive: { color: Colors.textOnPrimary },
  workplaceMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  workplaceMetaActive: { color: 'rgba(255,255,255,0.7)' },
  emptyWorkplaces: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },

  // Guest form
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  transportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  transportChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.border,
  },
  transportChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  transportText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },
  submitButton: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },

  // Loading
  loadingResults: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },

  // Results
  resultsSection: { marginTop: 8 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultsTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginBottom: 12,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  refreshText: { fontSize: 12, color: Colors.textMuted },
  resultCard: {
    marginBottom: 20, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  rankBadge: {
    position: 'absolute', top: -8, left: 12,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 10, zIndex: 10,
  },
  rankText: { fontSize: 12, fontWeight: '800', color: Colors.textOnPrimary },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 8 },
  scoreBarBackground: {
    flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceElevated, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreHigh: { backgroundColor: Colors.success },
  scoreMedium: { backgroundColor: Colors.warning },
  scoreLow: { backgroundColor: Colors.error },
  scoreValue: { fontSize: 16, fontWeight: '800', color: Colors.primary, width: 48, textAlign: 'right' },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '10', alignSelf: 'flex-start',
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, marginBottom: 10,
  },
  timeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Empty results
  emptyResults: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyResultsText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  generateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  generateButtonText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },
});
