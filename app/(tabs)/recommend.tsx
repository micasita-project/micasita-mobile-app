/**
 * @layer app (pages)
 * @description Pantalla de Recomendaciones IA.
 * - Autenticados: workplace → lee latest cacheado (API) → genera bajo demanda.
 * - Invitados: lee latest de AsyncStorage → genera/actualiza bajo demanda.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { useGuest, GuestSetupModal } from '@/features/guest';
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

export default function RecommendScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // ── Guest ───────────────────────────────────────────────────────
  const { guestHome, guestWorkplace, guestRecommendations, saveGuestRecommendations } = useGuest();
  const [showSetup, setShowSetup] = useState(false);

  // Mutation (manual trigger only — preserves the "generate once, read many" pattern)
  const guestMutation = useGuestRecommendations();

  const handleGuestGenerate = useCallback(async () => {
    if (!guestWorkplace) { setShowSetup(true); return; }
    const hasExisting = guestRecommendations && guestRecommendations.length > 0;
    const run = async () => {
      const items = await guestMutation.mutateAsync({
        work_lat: guestWorkplace.lat,
        work_lon: guestWorkplace.lon,
        budget: guestWorkplace.budget,
        preferred_transportation: guestWorkplace.transport,
        max_distance_km: guestWorkplace.maxDistanceKm,
        limit: guestWorkplace.limit,
        home_lat: guestHome?.lat,
        home_lon: guestHome?.lon,
      });
      await saveGuestRecommendations(items);
    };

    if (hasExisting) {
      Alert.alert(
        'Actualizar recomendaciones',
        'Esto ejecutará nuevamente el motor de IA. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Actualizar', onPress: run },
        ]
      );
    } else {
      run();
    }
  }, [guestWorkplace, guestRecommendations, guestMutation, saveGuestRecommendations]);

  // ── Authenticated ───────────────────────────────────────────────
  const { data: workplaces = [], isLoading: loadingWorkplaces } = useWorkplaces(isAuthenticated);
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<number | null>(null);

  const { data: cachedResults, isLoading: loadingCached } = useLatestRecommendations(selectedWorkplaceId);
  const generateRecs = useGenerateRecommendations();

  const handleRefresh = useCallback(() => {
    if (!selectedWorkplaceId) return;
    Alert.alert(
      'Actualizar recomendaciones',
      'Esto ejecutará nuevamente el motor de IA. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Actualizar', onPress: () => generateRecs.mutate({ workplaceId: selectedWorkplaceId }) },
      ]
    );
  }, [selectedWorkplaceId, generateRecs]);

  const handleHousingPress = useCallback((housing: Housing) => {
    router.push({ pathname: '/housing-detail', params: { id: housing.id, data: JSON.stringify(housing) } });
  }, [router]);

  const results: RecommendationItem[] = isAuthenticated
    ? (cachedResults ?? [])
    : (guestRecommendations ?? []);
  const isLoadingResults = isAuthenticated
    ? (loadingCached || generateRecs.isPending)
    : guestMutation.isPending;

  return (
    <View style={styles.container}>
      <GuestSetupModal visible={showSetup} onClose={() => setShowSetup(false)} />

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
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

        {/* ── Authenticated: Select Workplace ─────────────────── */}
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
                    style={[styles.workplaceChip, selectedWorkplaceId === wp.id && styles.workplaceChipActive]}
                    onPress={() => setSelectedWorkplaceId(selectedWorkplaceId === wp.id ? null : wp.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location"
                      size={16}
                      color={selectedWorkplaceId === wp.id ? Colors.textOnPrimary : Colors.primary}
                    />
                    <View style={styles.workplaceChipText}>
                      <Text style={[styles.workplaceAlias, selectedWorkplaceId === wp.id && styles.workplaceAliasActive]} numberOfLines={1}>
                        {wp.alias}
                      </Text>
                      <Text style={[styles.workplaceMeta, selectedWorkplaceId === wp.id && styles.workplaceMetaActive]}>
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
          /* ── Guest: stored workplace + generate/update control ── */
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Tu búsqueda</Text>
            </View>

            {guestWorkplace ? (
              <>
                <View style={styles.guestInfo}>
                  <View style={styles.guestInfoRow}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <Text style={styles.guestInfoText} numberOfLines={2}>
                      {guestWorkplace.address.split(',').slice(0, 2).join(',')}
                    </Text>
                  </View>
                  <View style={styles.guestInfoRow}>
                    <Ionicons name="cash-outline" size={16} color={Colors.primary} />
                    <Text style={styles.guestInfoText}>S/ {guestWorkplace.budget} mensual</Text>
                  </View>
                  <View style={styles.guestInfoRow}>
                    <Ionicons name="bus-outline" size={16} color={Colors.primary} />
                    <Text style={styles.guestInfoText}>{guestWorkplace.transport}</Text>
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setShowSetup(true)}>
                    <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                    <Text style={styles.editBtnText}>Cambiar datos</Text>
                  </TouchableOpacity>
                </View>

                {/* Generate / Update button */}
                <TouchableOpacity
                  style={[styles.generateGuestBtn, guestMutation.isPending && styles.btnDisabled]}
                  onPress={handleGuestGenerate}
                  disabled={guestMutation.isPending}
                  activeOpacity={0.85}
                >
                  {guestMutation.isPending ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name={guestRecommendations ? 'refresh' : 'sparkles'}
                        size={18}
                        color={Colors.textOnPrimary}
                      />
                      <Text style={styles.generateGuestBtnText}>
                        {guestRecommendations ? 'Actualizar resultados' : 'Generar recomendaciones'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyWorkplaces}>
                <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>
                  Configura tu trabajo y presupuesto para obtener recomendaciones.
                </Text>
                <TouchableOpacity style={styles.setupBtn} onPress={() => setShowSetup(true)}>
                  <Ionicons name="sparkles" size={16} color={Colors.textOnPrimary} />
                  <Text style={styles.setupBtnText}>Configurar búsqueda</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoadingResults && (
          <View style={styles.loadingResults}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>XGBoost analizando viviendas...</Text>
          </View>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {!isLoadingResults && results.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Ionicons name="trophy" size={20} color={Colors.warning} />
              <Text style={styles.resultsTitle}>
                {results.length} vivienda{results.length !== 1 ? 's' : ''} recomendada{results.length !== 1 ? 's' : ''}
              </Text>
            </View>

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
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreBarBackground}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        { width: `${Math.min(item.match_score, 100)}%` },
                        item.match_score >= 70 ? styles.scoreHigh : item.match_score >= 40 ? styles.scoreMedium : styles.scoreLow,
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreValue}>{item.match_score}%</Text>
                </View>
                <View style={styles.timeChip}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.timeText}>~{item.predicted_time_min} min al trabajo</Text>
                </View>
                {item.time_saved_mins !== null && item.time_saved_mins !== 0 && (
                  <View style={[styles.timeSavedChip, item.time_saved_mins > 0 ? styles.timeSavedPos : styles.timeSavedNeg]}>
                    <Ionicons
                      name={item.time_saved_mins > 0 ? 'trending-down' : 'trending-up'}
                      size={14}
                      color={item.time_saved_mins > 0 ? Colors.success : Colors.error}
                    />
                    <Text style={[styles.timeSavedText, item.time_saved_mins > 0 ? styles.timeSavedTextPos : styles.timeSavedTextNeg]}>
                      {item.time_saved_mins > 0
                        ? `Ahorras ${item.time_saved_mins} min vs viaje actual`
                        : `${Math.abs(item.time_saved_mins)} min más que tu viaje actual`}
                    </Text>
                  </View>
                )}
                <HousingCard housing={item.property} onPress={handleHousingPress} />
              </View>
            ))}
          </View>
        )}

        {/* Empty state for authenticated */}
        {isAuthenticated && !isLoadingResults && results.length === 0 && selectedWorkplaceId !== null && !loadingCached && (
          <View style={styles.emptyResults}>
            <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyResultsText}>Sin recomendaciones guardadas</Text>
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => selectedWorkplaceId && generateRecs.mutate({ workplaceId: selectedWorkplaceId })}
              disabled={generateRecs.isPending}
            >
              <Ionicons name="sparkles" size={16} color={Colors.textOnPrimary} />
              <Text style={styles.setupBtnText}>Generar recomendaciones</Text>
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

  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  workplaceList: { gap: 10 },
  workplaceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.border,
  },
  workplaceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  workplaceChipText: { flex: 1 },
  workplaceAlias: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  workplaceAliasActive: { color: Colors.textOnPrimary },
  workplaceMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  workplaceMetaActive: { color: 'rgba(255,255,255,0.7)' },
  emptyWorkplaces: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  guestInfo: { gap: 10, marginBottom: 14 },
  guestInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  guestInfoText: { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: Colors.primary + '15', borderRadius: 10,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  generateGuestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, marginTop: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  generateGuestBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
  btnDisabled: { opacity: 0.6 },
  setupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 20, marginTop: 4,
  },
  setupBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },

  loadingResults: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },

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
  timeSavedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 20, marginBottom: 10,
  },
  timeSavedPos: { backgroundColor: Colors.success + '18' },
  timeSavedNeg: { backgroundColor: Colors.error + '18' },
  timeSavedText: { fontSize: 12, fontWeight: '600' },
  timeSavedTextPos: { color: Colors.success },
  timeSavedTextNeg: { color: Colors.error },
  emptyResults: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyResultsText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
});
