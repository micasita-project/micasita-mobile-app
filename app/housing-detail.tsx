/**
 * @layer app (pages)
 * @description Housing detail modal page with route savings comparison.
 *
 * FSD Composition:
 * - features/auth → useAuth
 * - features/guest → useGuest
 * - entities/workplace → useWorkplaces
 * - entities/route → calculateHaversineDistance, formatDistance, formatTravelTime, estimateTravelTime
 */

import { fetchPropertyById } from "@/entities/housing/api/housing.api";
import {
  calculateHaversineDistance,
  fetchMultiModeRoutes,
} from "@/entities/route";
import { useToggleFavorite } from "@/entities/housing/model/useProperties";
import { useWorkplaces } from "@/entities/workplace/model/useWorkplaces";
import { useAuth } from "@/features/auth";
import { useGuest } from "@/features/guest";
import { Colors } from "@/shared/config/colors";
import { TRANSPORT_MODE_CONFIG } from "@/shared/config/transport";
import { useSelectedWorkplace } from "@/shared/model/SelectedWorkplaceContext";
import type { Housing, MultiModeRoutes } from "@/shared/types";
import { ImageLightbox } from "@/shared/ui/ImageLightbox";
import { getCurrencySymbol } from "@/shared/utils/currency";
import { getImageSource } from "@/shared/utils/image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HousingDetailScreen() {
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const { user } = useAuth();
  const { guestWorkplace } = useGuest();
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const { selectedWorkplaceId } = useSelectedWorkplace();
  const activeWorkplace =
    workplaces.find((wp) => wp.id === selectedWorkplaceId) ||
    workplaces[0] ||
    null;
  const workLat = user ? activeWorkplace?.work_lat : guestWorkplace?.lat;
  const workLon = user ? activeWorkplace?.work_lon : guestWorkplace?.lon;
  const workName = user
    ? (activeWorkplace?.work_address ?? "")
    : (guestWorkplace?.address.split(",")[0] ?? "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topOffset = Platform.OS === "android" ? insets.top : 0;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const toggleFavorite = useToggleFavorite();

  const initialHousing = useMemo(() => {
    if (data) {
      try {
        return JSON.parse(data) as Housing;
      } catch {}
    }
    return undefined;
  }, [data]);

  const { data: housing, isLoading: isLoadingHousing } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchPropertyById(Number(id)),
    initialData: initialHousing,
    enabled: !!id,
  });

  const routeInfo = useMemo(() => {
    // TODO: Integrar Workplace del backend para calcular distancias
    if (!housing) return null;
    return null;
  }, [housing]);

  const [realTravelTimes, setRealTravelTimes] =
    useState<MultiModeRoutes | null>(null);

  useEffect(() => {
    if (!housing || !workLat || !workLon) return;
    const fetchRoutes = async () => {
      try {
        const routes = await fetchMultiModeRoutes(
          { latitude: housing.latitude, longitude: housing.longitude },
          { latitude: workLat, longitude: workLon },
        );
        setRealTravelTimes(routes);
      } catch (err) {
        console.warn("Failed to fetch real routes", err);
      }
    };
    fetchRoutes();
  }, [housing, workLat, workLon]);

  const travelTimes = useMemo(() => {
    if (realTravelTimes) {
      return {
        driving: realTravelTimes.driving.timeMinutes,
        cycling: realTravelTimes.cycling.timeMinutes,
        walking: realTravelTimes.walking.timeMinutes,
      };
    }
    if (!housing || !workLat || !workLon) return null;
    const dist = calculateHaversineDistance(
      { latitude: housing.latitude, longitude: housing.longitude },
      { latitude: workLat, longitude: workLon },
    );
    return {
      driving: Math.round((dist / 30) * 60), // ~30 km/h average in city
      cycling: Math.round((dist / 15) * 60), // ~15 km/h cycling
      walking: Math.round((dist / 5) * 60), // ~5 km/h walking
    };
  }, [housing, workLat, workLon, realTravelTimes]);

  if (isLoadingHousing) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.errorText}>Cargando vivienda...</Text>
      </View>
    );
  }

  if (!housing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={Colors.textMuted}
        />
        <Text style={styles.errorText}>Vivienda no encontrada</Text>
      </View>
    );
  }

  const handleViewOnMap = () => router.back();

  const handleFavoriteToggle = () => {
    if (!housing) return;
    if (!user) {
      Alert.alert("Inicia sesión", "Debes iniciar sesión para guardar favoritos.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Iniciar sesión", onPress: () => router.push("/login") },
      ]);
      return;
    }
    const newStatus = !housing.isFavorite;
    toggleFavorite.mutate({ id: housing.id, isFavorite: newStatus });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Image carousel ───────────────────────────────── */}
        <View style={styles.carouselWrapper}>
          <FlatList
            data={housing.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
              );
              setActiveImageIndex(index);
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => setLightboxIndex(index)}
              >
                <Image
                  source={getImageSource(item)}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={[styles.heroImage, styles.noImagePlaceholder]}>
                <Ionicons
                  name="image-outline"
                  size={48}
                  color={Colors.textMuted}
                />
              </View>
            }
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backButton, { top: 16 + topOffset }]}
            onPress={handleViewOnMap}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Right overlay buttons */}
          <View style={[styles.galleryRightBtns, { top: 16 + topOffset }]}>
            <TouchableOpacity style={styles.overlayBtn}>
              <Ionicons
                name="share-outline"
                size={18}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.overlayBtn}
              onPress={handleFavoriteToggle}
            >
              <Ionicons 
                name={housing.isFavorite ? "heart" : "heart-outline"} 
                size={18} 
                color={Colors.error} 
              />
            </TouchableOpacity>
          </View>

          {/* Type badge */}
          <View style={[styles.typeBadge, { top: 66 + topOffset }]}>
            <Text style={styles.typeBadgeText}>{housing.property_type}</Text>
          </View>

          {/* Dot indicators */}
          {housing.images.length > 1 && (
            <View style={styles.dots}>
              {housing.images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Main info ─────────────────────────────────────── */}
        <View style={styles.mainInfo}>
          <Text style={styles.title}>{housing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={Colors.textSecondary}
            />
            <Text style={styles.locationText}>
              {housing.address}, {housing.district}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.currencyLabel}>
              {getCurrencySymbol(housing.currency)}
            </Text>
            <Text style={styles.priceValue}>
              {" "}
              {housing.price.toLocaleString("es-PE")}
            </Text>
            <Text style={styles.priceUnit}>/mes</Text>
          </View>
        </View>

        {/* ── Stats grid ───────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="bed-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{housing.bedrooms}</Text>
            <Text style={styles.statLabel}>Hab.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="water-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{housing.bathrooms}</Text>
            <Text style={styles.statLabel}>Baños</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="resize-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{housing.total_area_sqm}</Text>
            <Text style={styles.statLabel}>m² total</Text>
          </View>
          {housing.parking !== undefined && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="car-outline" size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{housing.parking}</Text>
                <Text style={styles.statLabel}>Est.</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Tiempo a tu trabajo ────────────────────────── */}
        {travelTimes && (
          <View style={styles.travelSection}>
            <View style={styles.travelSectionHeader}>
              <Text style={styles.sectionTitle}>Tiempo a tu trabajo</Text>
              {workName ? (
                <Text style={styles.travelWorkName} numberOfLines={1}>
                  {workName}
                </Text>
              ) : null}
            </View>
            <View style={styles.travelCards}>
              {TRANSPORT_MODE_CONFIG.map((cfg) => (
                <View key={cfg.id} style={styles.travelCard}>
                  <View
                    style={[styles.travelIcon, { backgroundColor: cfg.color }]}
                  >
                    <Ionicons name={cfg.icon} size={16} color="#fff" />
                  </View>
                  <Text style={styles.travelMins}>
                    {travelTimes[cfg.id]}
                    <Text style={styles.travelUnit}> min</Text>
                  </Text>
                  <Text style={styles.travelLabel}>{cfg.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Extra details chips ───────────────────────────── */}
        <View style={styles.chipsRow}>
          {housing.covered_area_sqm && (
            <View style={styles.chip}>
              <Ionicons
                name="square-outline"
                size={13}
                color={Colors.primary}
              />
              <Text style={styles.chipText}>
                {housing.covered_area_sqm} m² cubiertos
              </Text>
            </View>
          )}
          {housing.antiquity !== undefined && (
            <View style={styles.chip}>
              <Ionicons name="time-outline" size={13} color={Colors.primary} />
              <Text style={styles.chipText}>
                {housing.antiquity === 0
                  ? "Estreno"
                  : `${housing.antiquity} año${housing.antiquity !== 1 ? "s" : ""}`}
              </Text>
            </View>
          )}
        </View>

        {/* ── Description ───────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{housing.description}</Text>
        </View>

        {/* ── Features ─────────────────────────────────────── */}
        {housing.features.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Características</Text>
            <View style={styles.featuresList}>
              {housing.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={Colors.success}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Agente ──────────────────────────────────────── */}
        <View style={styles.agentCard}>
          <View style={styles.agentAvatar}>
            <Ionicons name="person" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>Propietario / Agente</Text>
            <Text style={styles.agentMeta}>Responde en 24h</Text>
          </View>
          <TouchableOpacity style={styles.agentMsgBtn}>
            <Text style={styles.agentMsgText}>Mensaje</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {lightboxIndex !== null && housing.images.length > 0 && (
        <ImageLightbox
          sources={housing.images
            .map(getImageSource)
            .filter((s): s is { uri: string } => s !== undefined)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ── Sticky CTA ──────────────────────────────────── */}
      <View style={styles.stickyCta}>
        <TouchableOpacity style={styles.ctaPhone}>
          <Ionicons name="call-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaBook} activeOpacity={0.88}>
          <Text style={styles.ctaBookText}>Agendar visita</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  errorText: { fontSize: 16, color: Colors.textMuted },

  // Image carousel
  carouselWrapper: { position: "relative" },
  heroImage: { width: SCREEN_WIDTH, height: 250 },
  noImagePlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  galleryRightBtns: {
    position: "absolute",
    top: 16,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  overlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadge: {
    position: "absolute",
    top: 66,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  typeBadgeText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  dots: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: Colors.textOnPrimary, width: 18 },

  // Main info
  mainInfo: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  priceContainer: { flexDirection: "row", alignItems: "baseline" },
  currencyLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  priceValue: { fontSize: 28, fontWeight: "800", color: Colors.primary },
  priceUnit: { fontSize: 16, color: Colors.textSecondary, marginLeft: 2 },

  // Stats
  statsGrid: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.borderLight },

  // Travel times
  travelSection: { marginHorizontal: 16, marginBottom: 12 },
  travelSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  travelWorkName: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  travelCards: { flexDirection: "row", gap: 8 },
  travelCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  travelIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  travelMins: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  travelUnit: { fontSize: 11, fontWeight: "500", color: Colors.textSecondary },
  travelLabel: { fontSize: 11, color: Colors.textMuted },

  // Chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "12",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  chipText: { fontSize: 12, fontWeight: "500", color: Colors.primary },

  // Sections
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  featuresList: { gap: 8 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 14, color: Colors.textPrimary },

  // Agent
  agentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  agentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  agentName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  agentMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  agentMsgBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  agentMsgText: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  // Sticky CTA
  stickyCta: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  ctaPhone: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBook: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaBookText: { fontSize: 15, fontWeight: "600", color: Colors.textOnPrimary },

  // Route (kept for future use)
  routeCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight + "30",
  },
  routeDetails: { gap: 10, marginBottom: 12 },
  routeDetailItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeDetailLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  routeDetailValue: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  savingsBadge: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingPositive: { backgroundColor: "#e8f8ef" },
  savingNegative: { backgroundColor: "#fdf2e9" },
  savingsText: { fontSize: 13, fontWeight: "700", flex: 1 },
  savingsTextPos: { color: "#27ae60" },
  savingsTextNeg: { color: "#e67e22" },
});
