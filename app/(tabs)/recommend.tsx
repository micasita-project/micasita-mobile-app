/**
 * @layer app (pages)
 * @description Pantalla de Recomendaciones IA.
 * - Autenticados: workplace → lee latest cacheado (API) → genera bajo demanda.
 * - Invitados: lee latest de AsyncStorage → genera/actualiza bajo demanda.
 */

import type { Workplace } from "@/entities/workplace/api/workplace.api";
import { useWorkplaces } from "@/entities/workplace/model/useWorkplaces";
import { useAuth } from "@/features/auth";
import { GuestSetupModal, useGuest } from "@/features/guest";
import type { RecommendationItem } from "@/features/recommendation/api/recommendation.api";
import { WorkplaceSheet } from "@/widgets/workplace/ui/WorkplaceSheet";
import { useIsMutating } from "@tanstack/react-query";
import {
  guestGenerateKey,
  recommendKeys,
  useGenerateRecommendations,
  useGuestRecommendations,
  useLatestRecommendations,
} from "@/features/recommendation/model/useRecommendations";
import { useToggleFavorite } from "@/entities/housing/model/useProperties";
import { Colors } from "@/shared/config/colors";
import { getTransportConfig } from "@/shared/config/transport";
import { useSelectedWorkplace } from "@/shared/model/SelectedWorkplaceContext";
import type { Housing, TransportMode } from "@/shared/types";
import { formatPrice } from "@/shared/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

function MatchRing({ score }: { score: number }) {
  const size = 64;
  const sw = 4.5;
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color =
    score >= 80 ? Colors.success : score >= 60 ? Colors.warning : Colors.error;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={sw}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: Colors.textPrimary,
          lineHeight: 17,
        }}
      >
        {score}%
      </Text>
      <Text style={{ fontSize: 9, color: Colors.textMuted, marginTop: 1 }}>
        match
      </Text>
    </View>
  );
}

export default function RecommendScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // ── Guest ───────────────────────────────────────────────────────
  const {
    guestHome,
    guestWorkplace,
    guestRecommendations,
    saveGuestRecommendations,
  } = useGuest();
  const [showSetup, setShowSetup] = useState(false);

  // Mutation (manual trigger only — preserves the "generate once, read many" pattern)
  const guestMutation = useGuestRecommendations();
  const isGuestGenerating = useIsMutating({ mutationKey: guestGenerateKey }) > 0;
  // Detects generation fired from ANY component (WorkplaceSheet, recommend screen, etc.)
  const isAuthGenerating = useIsMutating({ mutationKey: recommendKeys.generate }) > 0;

  const handleGuestGenerate = useCallback(async () => {
    if (!guestWorkplace) {
      setShowSetup(true);
      return;
    }
    const hasExisting = guestRecommendations && guestRecommendations.results.length > 0;
    const run = async () => {
      const items = await guestMutation.mutateAsync({
        work_lat: guestWorkplace.lat,
        work_lon: guestWorkplace.lon,
        budget: guestWorkplace.budget,
        preferred_transportation: guestWorkplace.transport,
        max_distance_km: guestWorkplace.maxDistanceKm,
        home_lat: guestHome?.lat,
        home_lon: guestHome?.lon,
      });
      await saveGuestRecommendations(items);
    };

    if (hasExisting) {
      Alert.alert(
        "Actualizar recomendaciones",
        "Esto ejecutará nuevamente el motor de IA. ¿Continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Actualizar", onPress: run },
        ],
      );
    } else {
      run();
    }
  }, [
    guestWorkplace,
    guestRecommendations,
    guestMutation,
    saveGuestRecommendations,
  ]);

  // ── Authenticated ───────────────────────────────────────────────
  const [editingWp, setEditingWp] = useState<Workplace | null>(null);
  const [showWorkplaceSheet, setShowWorkplaceSheet] = useState(false);

  const { data: workplaces = [], isLoading: loadingWorkplaces } =
    useWorkplaces(isAuthenticated);
  const { selectedWorkplaceId, setSelectedWorkplaceId } =
    useSelectedWorkplace();

  // Auto-selecciona el primer workplace si no hay ninguno seleccionado, o si el
  // seleccionado ya no existe (p. ej. se borraron todos y se agregó otro → el
  // contexto conserva un id obsoleto y ningún chip quedaría activo).
  useEffect(() => {
    if (!isAuthenticated || workplaces.length === 0) return;
    const stillExists = workplaces.some((wp) => wp.id === selectedWorkplaceId);
    if (!stillExists) {
      setSelectedWorkplaceId(workplaces[0].id);
    }
  }, [
    isAuthenticated,
    workplaces,
    selectedWorkplaceId,
    setSelectedWorkplaceId,
  ]);

  const { data: cachedResults, isLoading: loadingCached } =
    useLatestRecommendations(selectedWorkplaceId);
  const generateRecs = useGenerateRecommendations();
  const toggleFavorite = useToggleFavorite();

  const handleRefresh = useCallback(() => {
    if (!selectedWorkplaceId) return;
    Alert.alert(
      "Actualizar recomendaciones",
      "Esto ejecutará nuevamente el motor de IA. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Actualizar",
          onPress: () =>
            generateRecs.mutate({ workplaceId: selectedWorkplaceId }),
        },
      ],
    );
  }, [selectedWorkplaceId, generateRecs]);

  const handleHousingPress = useCallback(
    (item: RecommendationItem) => {
      router.push({
        pathname: "/housing-detail",
        params: {
          id: item.property.id,
          data: JSON.stringify(item.property),
          reco: JSON.stringify({
            predicted_time_min: item.predicted_time_min,
            time_saved_mins: item.time_saved_mins,
          }),
        },
      });
    },
    [router],
  );

  const handleInsightPress = useCallback(
    (item: RecommendationItem) => {
      router.push({
        pathname: "/recommendation-insight",
        params: { data: JSON.stringify(item) },
      });
    },
    [router],
  );

  const results: RecommendationItem[] = isAuthenticated
    ? (cachedResults?.results ?? [])
    : (guestRecommendations?.results ?? []);
  const isLoadingResults = isAuthenticated
    ? loadingCached || isAuthGenerating
    : isGuestGenerating;

  return (
    <View style={styles.container}>
      <GuestSetupModal
        visible={showSetup}
        onClose={() => setShowSetup(false)}
      />
      <WorkplaceSheet
        visible={showWorkplaceSheet}
        workplace={editingWp}
        allowDelete={!!editingWp}
        onClose={() => {
          setShowWorkplaceSheet(false);
          setEditingWp(null);
        }}
        onSuccess={(workplaceId) => {
          setShowWorkplaceSheet(false);
          setEditingWp(null);
          // Auto-select the new workplace so results load immediately
          if (workplaceId && !editingWp) {
            setSelectedWorkplaceId(workplaceId);
          }
        }}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Ionicons name="sparkles" size={22} color={Colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Resultados personalizados</Text>
            <Text style={styles.heroSubtitle}>
              Ranking por distancia al trabajo, presupuesto y modo de
              transporte.
            </Text>
          </View>
        </View>

        {/* ── Authenticated: Select Workplace ─────────────────── */}
        {isAuthenticated ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Tu lugar de trabajo</Text>
            </View>

            {loadingWorkplaces ? (
              <ActivityIndicator
                color={Colors.primary}
                style={{ padding: 20 }}
              />
            ) : workplaces.length === 0 ? (
              <View style={styles.emptyWorkplaces}>
                <Ionicons
                  name="add-circle-outline"
                  size={32}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  No tienes lugares de trabajo.
                </Text>
              </View>
            ) : (
              <View style={styles.workplaceList}>
                {workplaces.map((wp) => {
                  const isActive = selectedWorkplaceId === wp.id;
                  return (
                    <View
                      key={wp.id}
                      style={[styles.workplaceChip, isActive && styles.workplaceChipActive]}
                    >
                      <TouchableOpacity
                        style={styles.wpSelectArea}
                        onPress={() => setSelectedWorkplaceId(wp.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="location"
                          size={16}
                          color={isActive ? Colors.textOnPrimary : Colors.primary}
                        />
                        <View style={styles.workplaceChipText}>
                          <Text
                            style={[styles.workplaceAlias, isActive && styles.workplaceAliasActive]}
                            numberOfLines={1}
                          >
                            {wp.work_address}
                          </Text>
                          <Text style={[styles.workplaceMeta, isActive && styles.workplaceMetaActive]}>
                            Lugar de trabajo
                          </Text>
                        </View>
                        {isActive && (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.textOnPrimary} />
                        )}
                      </TouchableOpacity>
                      <View style={[styles.wpDivider, isActive && styles.wpDividerActive]} />
                      <TouchableOpacity
                        style={styles.wpEditBtn}
                        onPress={() => {
                          setEditingWp(wp);
                          setShowWorkplaceSheet(true);
                        }}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={15}
                          color={isActive ? "rgba(255,255,255,0.7)" : Colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={styles.addWpBtn}
                  onPress={() => {
                    setEditingWp(null);
                    setShowWorkplaceSheet(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.addWpBtnText}>
                    Agregar lugar de trabajo
                  </Text>
                </TouchableOpacity>
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
                {/* Section header with Editar link */}
                <View style={styles.searchCardHeader}>
                  <Text style={styles.searchCardLabel}>TU BÚSQUEDA</Text>
                  <TouchableOpacity
                    onPress={() => setShowSetup(true)}
                    style={styles.editLink}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={12}
                      color={Colors.primary}
                    />
                    <Text style={styles.editLinkText}>Editar</Text>
                  </TouchableOpacity>
                </View>
                {/* 3-column grid */}
                <View style={styles.searchGrid}>
                  <View style={styles.searchCell}>
                    <Text style={styles.searchCellLabel}>TRABAJO</Text>
                    <Text style={styles.searchCellValue} numberOfLines={1}>
                      {guestWorkplace.address.split(",")[0]}
                    </Text>
                  </View>
                  <View style={styles.searchCell}>
                    <Text style={styles.searchCellLabel}>PRESUP.</Text>
                    <Text style={styles.searchCellValue}>
                      {formatPrice(guestWorkplace.budget, "PEN")}
                    </Text>
                  </View>
                  <View style={styles.searchCell}>
                    <Text style={styles.searchCellLabel}>MODO</Text>
                    {(() => {
                      const cfg = getTransportConfig(guestWorkplace.transport as TransportMode);
                      return (
                        <View style={styles.transportBadge}>
                          <Ionicons name={cfg.iconOutline} size={13} color={cfg.color} />
                          <Text style={[styles.searchCellValue, { color: cfg.color }]}>
                            {cfg.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>

                {/* Generate / Update button */}
                <TouchableOpacity
                  style={[
                    styles.generateGuestBtn,
                    isGuestGenerating && styles.btnDisabled,
                  ]}
                  onPress={handleGuestGenerate}
                  disabled={isGuestGenerating}
                  activeOpacity={0.85}
                >
                  {isGuestGenerating ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name={guestRecommendations ? "refresh" : "sparkles"}
                        size={18}
                        color={Colors.textOnPrimary}
                      />
                      <Text style={styles.generateGuestBtnText}>
                        {guestRecommendations
                          ? "Actualizar resultados"
                          : "Generar recomendaciones"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Inline empty-state message — visible without scrolling */}
                {guestRecommendations !== null &&
                  guestRecommendations.results.length === 0 &&
                  !isGuestGenerating && (
                    <View style={styles.inlineEmptyState}>
                      <Ionicons name="home-outline" size={32} color={Colors.textMuted} />
                      <Text style={styles.inlineEmptyText}>
                        {guestRecommendations.message ?? "No encontramos viviendas con esos criterios."}
                      </Text>
                      {guestRecommendations.min_price_in_area !== null && (
                        <Text style={styles.inlineEmptyHint}>
                          Las más económicas parten desde{" "}
                          <Text style={{ fontWeight: "700" }}>
                            S/ {guestRecommendations.min_price_in_area.toLocaleString("es-PE")}
                          </Text>
                        </Text>
                      )}
                      <TouchableOpacity
                        style={styles.changeConfigBtn}
                        onPress={() => setShowSetup(true)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="settings-outline" size={14} color={Colors.textOnPrimary} />
                        <Text style={styles.changeConfigBtnText}>Cambiar configuración</Text>
                      </TouchableOpacity>
                    </View>
                  )}
              </>
            ) : (
              <View style={styles.emptyWorkplaces}>
                <Ionicons
                  name="search-outline"
                  size={32}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  Configura tu trabajo y presupuesto para obtener
                  recomendaciones.
                </Text>
                <TouchableOpacity
                  style={styles.setupBtn}
                  onPress={() => setShowSetup(true)}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={Colors.textOnPrimary}
                  />
                  <Text style={styles.setupBtnText}>Configurar búsqueda</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoadingResults && (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconBg}>
              <Ionicons name="sparkles" size={24} color={Colors.textOnPrimary} />
            </View>
            <Text style={styles.loadingTitle}>Analizando viviendas...</Text>
            <Text style={styles.loadingSubtitle}>
              La IA está calculando el mejor match para ti
            </Text>
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginTop: 4 }}
            />
          </View>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {!isLoadingResults && results.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Ionicons name="trophy" size={20} color={Colors.warning} />
              <Text style={styles.resultsTitle}>
                {results.length} vivienda{results.length !== 1 ? "s" : ""}{" "}
                recomendada{results.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {isAuthenticated && selectedWorkplaceId && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={generateRecs.isPending}
                activeOpacity={0.6}
              >
                <Ionicons
                  name="refresh-outline"
                  size={14}
                  color={Colors.textMuted}
                />
                <Text style={styles.refreshText}>Actualizar resultados</Text>
              </TouchableOpacity>
            )}

            {results.map((item, index) => {
              const img = item.property.images?.[0];
              const thumbSrc = img ? { uri: img } : null;
              return (
                <View key={item.property.id} style={styles.resultCard}>
                  {/* Rank badge */}
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  {/* Main area → housing detail */}
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => handleHousingPress(item)}
                    activeOpacity={0.85}
                  >
                    {/* Thumbnail */}
                    {thumbSrc ? (
                      <Image
                        source={thumbSrc}
                        style={styles.cardThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[styles.cardThumb, styles.cardThumbPlaceholder]}
                      >
                        <Ionicons
                          name="home-outline"
                          size={24}
                          color={Colors.textMuted}
                        />
                      </View>
                    )}
                    {/* Info */}
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardPrice}>
                        {formatPrice(item.property.price, item.property.currency)}
                        <Text style={styles.cardPriceUnit}> /mes</Text>
                      </Text>
                      <Text style={styles.cardAddr} numberOfLines={1}>
                        {item.property.district}
                      </Text>
                      <Text style={styles.cardSpecs} numberOfLines={1}>
                        {item.property.bedrooms}h · {item.property.bathrooms}b ·{" "}
                        {item.property.total_area_sqm}m²
                      </Text>
                      <View style={styles.timeChip}>
                        <Ionicons
                          name="time-outline"
                          size={11}
                          color={Colors.accent}
                        />
                        <Text style={styles.timeText}>
                          ~{item.predicted_time_min} min al trabajo
                        </Text>
                      </View>
                      {item.time_saved_mins !== null &&
                        item.time_saved_mins !== 0 && (
                          <View
                            style={[
                              styles.timeSavedChip,
                              item.time_saved_mins > 0
                                ? styles.timeSavedPos
                                : styles.timeSavedNeg,
                            ]}
                          >
                            <Ionicons
                              name={
                                item.time_saved_mins > 0
                                  ? "trending-down"
                                  : "trending-up"
                              }
                              size={11}
                              color={
                                item.time_saved_mins > 0
                                  ? Colors.success
                                  : Colors.error
                              }
                            />
                            <Text
                              style={[
                                styles.timeSavedText,
                                item.time_saved_mins > 0
                                  ? styles.timeSavedTextPos
                                  : styles.timeSavedTextNeg,
                              ]}
                            >
                              {item.time_saved_mins > 0
                                ? `Ahorras ${item.time_saved_mins} min`
                                : `${Math.abs(item.time_saved_mins)} min más`}
                            </Text>
                          </View>
                        )}
                    </View>
                  </TouchableOpacity>
                  {/* Match ring → insight screen */}
                  <TouchableOpacity
                    style={styles.ringBtn}
                    onPress={() => handleInsightPress(item)}
                    activeOpacity={0.7}
                  >
                    <MatchRing score={item.match_score} />
                    <Text style={styles.ringHint}>Ver análisis</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state for authenticated */}
        {isAuthenticated &&
          !isLoadingResults &&
          results.length === 0 &&
          selectedWorkplaceId !== null &&
          !loadingCached && (
            <View style={styles.emptyResults}>
              <Ionicons
                name="search-outline"
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyResultsText}>
                {generateRecs.data?.message ??
                  cachedResults?.message ??
                  "Sin recomendaciones guardadas"}
              </Text>
              {(generateRecs.data?.min_price_in_area ??
                cachedResults?.min_price_in_area) != null && (
                <Text style={styles.emptyResultsHint}>
                  Las más económicas en la zona parten desde{" "}
                  <Text style={{ fontWeight: "700" }}>
                    S/{" "}
                    {(
                      generateRecs.data?.min_price_in_area ??
                      cachedResults?.min_price_in_area ??
                      0
                    ).toLocaleString("es-PE")}
                  </Text>
                </Text>
              )}
              {/* Generar solo cuando no hay historial (workplace nuevo) */}
              {cachedResults === null && (
                <TouchableOpacity
                  style={styles.setupBtn}
                  onPress={() =>
                    selectedWorkplaceId &&
                    generateRecs.mutate({ workplaceId: selectedWorkplaceId })
                  }
                  disabled={isAuthGenerating}
                >
                  <Ionicons name="sparkles" size={16} color={Colors.textOnPrimary} />
                  <Text style={styles.setupBtnText}>Generar recomendaciones</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.changeConfigBtn}
                onPress={() => {
                  const wp = workplaces.find((w) => w.id === selectedWorkplaceId) ?? null;
                  setEditingWp(wp);
                  setShowWorkplaceSheet(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={14} color={Colors.textOnPrimary} />
                <Text style={styles.changeConfigBtnText}>Cambiar preferencias</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Empty state for guests — backend message explains why */}
        {!isAuthenticated &&
          !isLoadingResults &&
          guestRecommendations !== null &&
          results.length === 0 && (
            <View style={styles.emptyResults}>
              <Ionicons
                name="home-outline"
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyResultsText}>
                {guestRecommendations.message ?? "No encontramos viviendas con esos criterios."}
              </Text>
              {guestRecommendations.min_price_in_area !== null && (
                <Text style={styles.emptyResultsHint}>
                  Las más económicas en la zona parten desde{" "}
                  <Text style={{ fontWeight: "700" }}>
                    S/ {guestRecommendations.min_price_in_area.toLocaleString("es-PE")}
                  </Text>
                </Text>
              )}
              <TouchableOpacity
                style={styles.changeConfigBtn}
                onPress={() => setShowSetup(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={14} color={Colors.textOnPrimary} />
                <Text style={styles.changeConfigBtnText}>Cambiar configuración</Text>
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

  // Compact hero
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 15, fontWeight: "700", color: Colors.textOnPrimary },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 18,
    marginTop: 2,
  },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },

  workplaceList: { gap: 10 },
  workplaceChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  workplaceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  workplaceChipText: { flex: 1 },
  workplaceAlias: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  workplaceAliasActive: { color: Colors.textOnPrimary },
  workplaceMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  workplaceMetaActive: { color: "rgba(255,255,255,0.7)" },
  emptyWorkplaces: { alignItems: "center", paddingVertical: 20, gap: 10 },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Guest search card
  searchCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  searchCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  editLinkText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  searchGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  searchCell: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
  },
  searchCellLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  searchCellValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 2,
  },

  generateGuestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateGuestBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  btnDisabled: { opacity: 0.6 },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  setupBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },

  loadingResults: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },

  resultsSection: { marginTop: 8 },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  resultsTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refreshText: { fontSize: 12, color: Colors.textMuted },

  // Result cards
  resultCard: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  rankBadge: {
    position: "absolute",
    top: -6,
    left: 10,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    zIndex: 10,
  },
  rankText: { fontSize: 10, fontWeight: "700", color: Colors.textOnPrimary },
  cardThumb: { width: 76, height: 76, borderRadius: 10 },
  cardThumbPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ringBtn: { alignItems: "center", gap: 3 },
  ringHint: { fontSize: 9, fontWeight: "600", color: Colors.primary, opacity: 0.75 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardPrice: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  cardPriceUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  cardAddr: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cardSpecs: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent + "14",
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    marginTop: 5,
  },
  timeText: { fontSize: 11, fontWeight: "600", color: Colors.accent },
  timeSavedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    marginTop: 3,
  },
  timeSavedPos: { backgroundColor: Colors.success + "18" },
  timeSavedNeg: { backgroundColor: Colors.error + "18" },
  timeSavedText: { fontSize: 11, fontWeight: "600" },
  timeSavedTextPos: { color: Colors.success },
  timeSavedTextNeg: { color: Colors.error },
  emptyResults: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyResultsText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  emptyResultsHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  inlineEmptyState: {
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  inlineEmptyText: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  inlineEmptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  wpSelectArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 8,
  },
  wpDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  wpDividerActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  wpEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addWpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.primary + "60",
  },
  addWpBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Loading card (replaces plain loadingResults)
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },

  // Change-config CTA (secondary button style)
  transportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  changeConfigBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 2,
  },
  changeConfigBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
});
