/**
 * @layer app (pages)
 * @description Pantalla de mapa. Soporta usuarios autenticados e invitados.
 * Movido desde widgets/map-board — el widget era la page completa, sin reutilización.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppMapView, AppMarker, AppCircle, AppUrlTile } from "@/shared/ui/map";
import type { AppMapViewHandle } from "@/shared/ui/map";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePreferences } from "@/entities/recommendation-preferences";
import { useWorkplaces } from "@/entities/workplace/model/useWorkplaces";
import { useAuth } from "@/features/auth";
import { GuestSetupModal, useGuest } from "@/features/guest";
import { useLatestRecommendations } from "@/features/recommendation/model/useRecommendations";
import { useRouteCalculation } from "@/features/route-calculation";
import { WorkplaceSheet } from "@/widgets/workplace/ui/WorkplaceSheet";

import { HousingMarker } from "@/entities/housing";
import { RoutePolyline } from "@/entities/route";

import { Colors } from "@/shared/config/colors";
import { LIMA_REGION, OSM_TILE_URL } from "@/shared/config/map";
import { TRANSPORT_MODE_CONFIG, getTransportConfig } from "@/shared/config/transport";
import { useSelectedWorkplace } from "@/shared/model/SelectedWorkplaceContext";
import type { Housing, MultiModeRoutes, TransportMode } from "@/shared/types";
import { formatPrice } from "@/shared/utils/currency";

// ── Local component: floating housing card ────────────────────────
// Exclusive to this page — no need for a separate file.

function HousingFloatingCard({
  housing,
  routes,
  mode,
  savings,
  onPress,
}: {
  housing: Housing;
  routes: MultiModeRoutes | null;
  mode: TransportMode | null;
  savings: { savedMinutes: number } | null;
  onPress: () => void;
}) {
  const img = housing.images?.[0];
  const imgSrc = img ? { uri: img } : null;

  const selectedRoute = routes?.[mode ?? "driving"];
  const timeMinutes = selectedRoute?.timeMinutes;
  const modeCfg = mode ? getTransportConfig(mode) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.floatingCard}
    >
      {imgSrc ? (
        <Image source={imgSrc} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name="home-outline" size={24} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>
          {formatPrice(housing.price, housing.currency)}{" "}
          <Text style={styles.cardPriceUnit}>/mes</Text>
        </Text>
        <Text style={styles.cardSpecs} numberOfLines={1}>
          {housing.district} · {housing.bedrooms} hab · {housing.total_area_sqm} m²
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={styles.cardTimePill}>
            <Ionicons
              name={modeCfg?.iconOutline ?? "car-outline"}
              size={13}
              color="#10B981"
            />
            <Text style={styles.cardTimeText}>{timeMinutes ?? "--"} min</Text>
            <Text style={styles.cardTimeSuffix}> al trabajo</Text>
          </View>
          {savings && savings.savedMinutes > 0 && (
            <View style={styles.cardSavingsPill}>
              <Ionicons name="flash" size={12} color="#f59e0b" />
              <Text style={styles.cardSavingsText}>-{savings.savedMinutes} min</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MapScreen() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<AppMapViewHandle>(null);
  // Evita re-auto-seleccionar el mismo set de recomendaciones en cada render.
  const autoFocusKeyRef = useRef<string | null>(null);

  const panelTranslateY = useRef(new Animated.Value(500)).current;
  const closePanelRef = useRef<() => void>(() => {});

  const panelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 4,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) panelTranslateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 1.2) {
          closePanelRef.current();
        } else {
          Animated.spring(panelTranslateY, {
            toValue: 0,
            damping: 30,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const isGuest = !user;

  const {
    guestHome,
    guestWorkplace,
    guestRecommendations,
    isInitialized: guestInitialized,
  } = useGuest();
  const [showSetup, setShowSetup] = useState(false);
  const [showWorkplaceSheet, setShowWorkplaceSheet] = useState(false);

  useEffect(() => {
    if (!isInitialized || !isGuest || !guestInitialized) return;
    if (!guestHome || !guestWorkplace) {
      setShowSetup(true);
    }
  }, [isInitialized, isGuest, guestInitialized, guestHome, guestWorkplace]);

  const { data: workplaces = [] } = useWorkplaces(!!user);
  const { selectedWorkplaceId } = useSelectedWorkplace();
  const activeWorkplace =
    workplaces.find((wp) => wp.id === selectedWorkplaceId) ||
    workplaces[0] ||
    null;

  const { data: preferences = [] } = usePreferences(
    activeWorkplace?.id ?? null,
  );
  const activePreference = preferences[0];

  const { data: authRecommendations = null, isLoading: isLoadingAuth } =
    useLatestRecommendations(!isGuest ? (activeWorkplace?.id ?? null) : null);

  const recommendations = useMemo(
    () =>
      isGuest
        ? (guestRecommendations?.results ?? [])
        : (authRecommendations?.results ?? []),
    [isGuest, guestRecommendations, authRecommendations],
  );
  const isLoadingRecommendations = isGuest ? false : isLoadingAuth;

  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null);

  const {
    newHomeRoutes,
    selectedMode,
    setSelectedMode,
    calculateRoutes,
    clearRoute,
    savings,
  } = useRouteCalculation();

  const handleHousingSelect = useCallback(
    (h: Housing) => {
      setSelectedHousing(h);
      const workLat = isGuest ? guestWorkplace?.lat : activeWorkplace?.work_lat;
      const workLon = isGuest ? guestWorkplace?.lon : activeWorkplace?.work_lon;
      const homeLat = isGuest ? guestHome?.lat : user?.home_lat;
      const homeLon = isGuest ? guestHome?.lon : user?.home_lon;
      if (workLat && workLon && homeLat && homeLon) {
        calculateRoutes(
          { latitude: h.latitude, longitude: h.longitude },
          { latitude: homeLat, longitude: homeLon },
          { latitude: workLat, longitude: workLon },
        );
      }
    },
    [isGuest, guestWorkplace, guestHome, activeWorkplace, user, calculateRoutes],
  );

  const handleCloseDetail = useCallback(() => {
    Animated.timing(panelTranslateY, {
      toValue: 500,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setSelectedHousing(null);
      clearRoute();
    });
  }, [clearRoute, panelTranslateY]);

  useEffect(() => {
    closePanelRef.current = handleCloseDetail;
  }, [handleCloseDetail]);

  useEffect(() => {
    if (selectedHousing) {
      panelTranslateY.setValue(500);
      Animated.spring(panelTranslateY, {
        toValue: 0,
        damping: 28,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedHousing, panelTranslateY]);

  // Al entrar al mapa con recomendaciones listas, selecciona y hace zoom a la
  // vivienda con mejor match_score (top 1). Se ejecuta una vez por cada set de
  // recomendaciones (se vuelve a disparar si cambian, p. ej. tras regenerar).
  useEffect(() => {
    if (isLoadingRecommendations) return;
    if (recommendations.length === 0) {
      autoFocusKeyRef.current = null;
      // Sin resultados: limpia también la selección, la tarjeta flotante y la
      // ruta del set anterior (los marcadores ya desaparecen al venir de la lista).
      setSelectedHousing(null);
      clearRoute();
      return;
    }

    const top = recommendations.reduce((best, r) =>
      r.match_score > best.match_score ? r : best,
    );
    const setKey = `${isGuest ? "guest" : activeWorkplace?.id ?? "none"}:${top.property.id}`;
    if (autoFocusKeyRef.current === setKey) return;
    autoFocusKeyRef.current = setKey;

    handleHousingSelect(top.property);
    // Pequeño delay para asegurar que el mapa esté montado antes de animar.
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: top.property.latitude,
          longitude: top.property.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        },
        700,
      );
    }, 350);
    return () => clearTimeout(t);
  }, [
    recommendations,
    isLoadingRecommendations,
    isGuest,
    activeWorkplace?.id,
    handleHousingSelect,
    clearRoute,
  ]);

  const handleViewDetail = useCallback(() => {
    if (selectedHousing) {
      router.push({
        pathname: "/housing-detail",
        params: { id: selectedHousing.id, data: JSON.stringify(selectedHousing) },
      });
    }
  }, [selectedHousing, router]);

  const workplaceLabel = isGuest
    ? (guestWorkplace?.address.split(",")[0] ?? "Tu trabajo")
    : (activeWorkplace?.work_address ?? "");

  const showWorkplaceOverlay = isGuest ? !!guestWorkplace : !!activeWorkplace;

  const handleEditWorkplace = useCallback(() => {
    if (isGuest) setShowSetup(true);
    else setShowWorkplaceSheet(true);
  }, [isGuest]);

  return (
    <View style={styles.container}>
      <GuestSetupModal
        visible={showSetup && isGuest}
        onClose={() => setShowSetup(false)}
      />
      <WorkplaceSheet
        visible={showWorkplaceSheet}
        workplace={activeWorkplace}
        onClose={() => setShowWorkplaceSheet(false)}
      />

      <View style={[styles.mapHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.mapHeaderTitle}>Mapa</Text>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={handleEditWorkplace}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.85)" />
          <Text style={styles.searchBarText} numberOfLines={1}>
            {showWorkplaceOverlay ? workplaceLabel : "Configura tu búsqueda"}
          </Text>
          <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        <View style={styles.transportChipsRow}>
          {TRANSPORT_MODE_CONFIG.map((cfg) => {
            const isActive = (selectedMode ?? "cycling") === cfg.id;
            const timeMin = newHomeRoutes
              ? Math.round(newHomeRoutes[cfg.id].timeMinutes)
              : null;
            return (
              <TouchableOpacity
                key={cfg.id}
                style={[
                  styles.transportChip,
                  isActive && styles.transportChipActive,
                ]}
                onPress={() => setSelectedMode(cfg.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cfg.icon}
                  size={14}
                  color={isActive ? cfg.color : "#fff"}
                />
                <Text
                  style={[
                    styles.transportChipLabel,
                    isActive && { color: cfg.color },
                  ]}
                >
                  {cfg.label}
                </Text>
                {isActive && timeMin !== null && (
                  <Text
                    style={[
                      styles.transportChipTime,
                      { color: cfg.color },
                    ]}
                  >
                    · {timeMin}min
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.mapContainer}>
        {isLoadingRecommendations && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando recomendaciones...</Text>
          </View>
        )}

        <AppMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={LIMA_REGION}
          mapType="none"
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          <AppUrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} tileSize={256} />

          {!isGuest && user?.home_lat && user?.home_lon && (
            <AppMarker
              coordinate={{ latitude: user.home_lat, longitude: user.home_lon }}
              title="Mi Casa Actual"
            >
              <View style={styles.homeMarker}>
                <Ionicons name="home" size={20} color={Colors.textOnPrimary} />
              </View>
            </AppMarker>
          )}
          {isGuest && guestHome && (
            <AppMarker
              coordinate={{ latitude: guestHome.lat, longitude: guestHome.lon }}
              title="Mi Casa Actual"
            >
              <View style={styles.homeMarker}>
                <Ionicons name="home" size={20} color={Colors.textOnPrimary} />
              </View>
            </AppMarker>
          )}
          {!isGuest && activeWorkplace?.work_lat && activeWorkplace?.work_lon && (
            <AppMarker
              coordinate={{
                latitude: activeWorkplace.work_lat,
                longitude: activeWorkplace.work_lon,
              }}
              title={activeWorkplace.work_address}
            >
              <View style={styles.workMarker}>
                <Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} />
              </View>
            </AppMarker>
          )}
          {isGuest && guestWorkplace && (
            <AppMarker
              coordinate={{ latitude: guestWorkplace.lat, longitude: guestWorkplace.lon }}
              title="Mi Trabajo"
            >
              <View style={styles.workMarker}>
                <Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} />
              </View>
            </AppMarker>
          )}
          {isGuest && guestWorkplace && (
            <AppCircle
              center={{ latitude: guestWorkplace.lat, longitude: guestWorkplace.lon }}
              radius={(guestWorkplace.maxDistanceKm ?? 10) * 1000}
              strokeColor={Colors.primary + "70"}
              fillColor={Colors.primary + "12"}
              strokeWidth={2}
            />
          )}
          {!isGuest && activeWorkplace?.work_lat && activeWorkplace?.work_lon && (
            <AppCircle
              center={{
                latitude: activeWorkplace.work_lat,
                longitude: activeWorkplace.work_lon,
              }}
              radius={(activePreference?.max_distance_km ?? 10) * 1000}
              strokeColor={Colors.primary + "70"}
              fillColor={Colors.primary + "12"}
              strokeWidth={2}
            />
          )}
          {recommendations.map((rec) => (
            <HousingMarker
              key={rec.property.id}
              housing={rec.property}
              onPress={handleHousingSelect}
              isSelected={selectedHousing?.id === rec.property.id}
            />
          ))}
          {newHomeRoutes && selectedMode && (
            <RoutePolyline
              coordinates={newHomeRoutes[selectedMode].waypoints}
              color={getTransportConfig(selectedMode).color}
            />
          )}
        </AppMapView>

        {selectedHousing && (
          <Animated.View
            {...panelPanResponder.panHandlers}
            style={[
              styles.floatingCardContainer,
              { transform: [{ translateY: panelTranslateY }] },
            ]}
          >
            <HousingFloatingCard
              housing={selectedHousing}
              routes={newHomeRoutes}
              mode={selectedMode}
              savings={savings}
              onPress={handleViewDetail}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapHeader: {
    backgroundColor: Colors.primary,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  mapHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  searchBar: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  searchBarText: { flex: 1, fontSize: 14, color: "rgba(255,255,255,0.85)" },
  transportChipsRow: { flexDirection: "row", gap: 8 },
  transportChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  transportChipActive: { backgroundColor: "#fff", borderColor: "transparent" },
  transportChipLabel: { fontSize: 12, fontWeight: "600", color: "#fff" },
  transportChipTime: { fontSize: 11, fontWeight: "500" },
  mapContainer: { flex: 1, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, fontWeight: "600", color: Colors.primary },
  workMarker: {
    backgroundColor: Colors.markerWork,
    borderRadius: 22,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  homeMarker: {
    backgroundColor: Colors.accent,
    borderRadius: 22,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingCardContainer: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  floatingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImage: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: "#bcaecc",
  },
  cardRight: { flex: 1, marginLeft: 14, justifyContent: "center" },
  cardPrice: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  cardPriceUnit: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  cardSpecs: { fontSize: 14, color: "#6b7280", marginTop: 2, marginBottom: 6 },
  cardTimePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  cardTimeText: { color: "#10B981", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  cardTimeSuffix: { color: "#9ca3af", fontSize: 13, fontWeight: "500" },
  cardSavingsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardSavingsText: { color: "#d97706", fontWeight: "700", fontSize: 12, marginLeft: 2 },
});
