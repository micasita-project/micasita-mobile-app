/**
 * @layer widgets/map-board/ui
 * @description Map board widget. Supports both authenticated users and guests.
 * Guests see a setup modal on first visit; data is persisted in AsyncStorage.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Features
import { useAuth } from '@/features/auth';
import { useGuest, GuestSetupModal } from '@/features/guest';
import { useRouteCalculation, RouteInfoPanel, TransportModeSelector } from '@/features/route-calculation';
import { useWorkplaces } from '@/entities/workplace/model/useWorkplaces';
import { useLatestRecommendations } from '@/features/recommendation/model/useRecommendations';

// Entities
import { HousingMarker, HousingCard } from '@/entities/housing';
import { RoutePolyline } from '@/entities/route';

// Shared
import { LIMA_REGION, OSM_TILE_URL } from '@/shared/config/map';
import { Colors } from '@/shared/config/colors';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import type { Housing, TransportMode } from '@/shared/types';

export function MapBoardWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // ── Detail panel slide animation ───────────────────────────────
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
    })
  ).current;

  const isGuest = !user;

  // ── Guest data ─────────────────────────────────────────────────
  const { guestHome, guestWorkplace, guestRecommendations, isInitialized: guestInitialized } = useGuest();
  const [showSetup, setShowSetup] = useState(false);

  // Show setup modal once guest data is loaded and incomplete
  useEffect(() => {
    if (!isGuest || !guestInitialized) return;
    if (!guestHome || !guestWorkplace) {
      setShowSetup(true);
    }
  }, [isGuest, guestInitialized, guestHome, guestWorkplace]);

  // ── Authenticated: workplaces + latest recommendations ─────────
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const activeWorkplace = workplaces[0] || null;

  const {
    data: authRecommendations = [],
    isLoading: isLoadingAuth,
  } = useLatestRecommendations(!isGuest ? (activeWorkplace?.id ?? null) : null);

  // ── Guest: read stored recommendations (set from recommend tab) ─
  const recommendations = isGuest ? (guestRecommendations ?? []) : (authRecommendations ?? []);
  const isLoadingRecommendations = isGuest ? false : isLoadingAuth;

  // ── Housing selection + routing ────────────────────────────────
  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null);

  const {
    newHomeRoutes,
    selectedMode,
    optimalMode,
    savings,
    isCalculating,
    setSelectedMode,
    calculateRoutes,
    clearRoute,
  } = useRouteCalculation();

  const handleHousingSelect = useCallback((h: Housing) => {
    setSelectedHousing(h);

    const workLat = isGuest ? guestWorkplace?.lat : activeWorkplace?.work_lat;
    const workLon = isGuest ? guestWorkplace?.lon : activeWorkplace?.work_lon;
    const homeLat = isGuest ? guestHome?.lat : user?.home_lat;
    const homeLon = isGuest ? guestHome?.lon : user?.home_lon;

    if (workLat && workLon && homeLat && homeLon) {
      calculateRoutes(
        { latitude: h.latitude, longitude: h.longitude },
        { latitude: homeLat, longitude: homeLon },
        { latitude: workLat, longitude: workLon }
      );
    }
  }, [isGuest, guestWorkplace, guestHome, activeWorkplace, user, calculateRoutes]);

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

  const handleViewDetail = useCallback(() => {
    if (selectedHousing) {
      router.push({ pathname: '/housing-detail', params: { id: selectedHousing.id, data: JSON.stringify(selectedHousing) } });
    }
  }, [selectedHousing, router]);

  const workplaceLabel = isGuest
    ? guestWorkplace?.address.split(',')[0] ?? 'Tu trabajo'
    : activeWorkplace?.alias ?? '';

  const showWorkplaceOverlay = isGuest ? !!guestWorkplace : !!activeWorkplace;

  return (
    <View style={styles.container}>
      {/* Guest setup modal */}
      <GuestSetupModal visible={showSetup} onClose={() => setShowSetup(false)} />

      {isLoadingRecommendations && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando recomendaciones...</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={LIMA_REGION}
        mapType="none"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} tileSize={256} />

        {/* Home marker — authenticated */}
        {!isGuest && user?.home_lat && user?.home_lon && (
          <Marker
            coordinate={{ latitude: user.home_lat, longitude: user.home_lon }}
            title="Mi Casa Actual"
          >
            <View style={styles.homeMarker}>
              <Ionicons name="home" size={20} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Home marker — guest */}
        {isGuest && guestHome && (
          <Marker
            coordinate={{ latitude: guestHome.lat, longitude: guestHome.lon }}
            title="Mi Casa Actual"
          >
            <View style={styles.homeMarker}>
              <Ionicons name="home" size={20} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Workplace marker — authenticated */}
        {!isGuest && activeWorkplace?.work_lat && activeWorkplace?.work_lon && (
          <Marker
            coordinate={{ latitude: activeWorkplace.work_lat, longitude: activeWorkplace.work_lon }}
            title={activeWorkplace.alias}
          >
            <View style={styles.workMarker}>
              <Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Workplace marker — guest */}
        {isGuest && guestWorkplace && (
          <Marker
            coordinate={{ latitude: guestWorkplace.lat, longitude: guestWorkplace.lon }}
            title="Mi Trabajo"
          >
            <View style={styles.workMarker}>
              <Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Radius circle — guest */}
        {isGuest && guestWorkplace && (
          <Circle
            center={{ latitude: guestWorkplace.lat, longitude: guestWorkplace.lon }}
            radius={(guestWorkplace.maxDistanceKm ?? 10) * 1000}
            strokeColor={Colors.primary + '70'}
            fillColor={Colors.primary + '12'}
            strokeWidth={2}
          />
        )}

        {/* Housing recommendation markers */}
        {recommendations.map((rec) => (
          <HousingMarker
            key={rec.property.id}
            housing={rec.property}
            onPress={handleHousingSelect}
            isSelected={selectedHousing?.id === rec.property.id}
          />
        ))}

        {/* Route polyline */}
        {newHomeRoutes && selectedMode && (
          <RoutePolyline
            coordinates={newHomeRoutes[selectedMode].waypoints}
            color={TRANSPORT_MODE_COLORS[selectedMode]}
          />
        )}
      </MapView>

      {/* Floating workplace chip */}
      {showWorkplaceOverlay && (
        <View style={styles.workplaceOverlay}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.workplaceText} numberOfLines={1}>
            Viendo cerca a: <Text style={{ fontWeight: '700' }}>{workplaceLabel}</Text>
          </Text>
          {isGuest && (
            <TouchableOpacity onPress={() => setShowSetup(true)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Guest CTA when no data yet */}
      {isGuest && guestInitialized && !guestWorkplace && !showSetup && (
        <TouchableOpacity style={styles.guestCta} onPress={() => setShowSetup(true)} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={18} color={Colors.textOnPrimary} />
          <Text style={styles.guestCtaText}>Configura tu búsqueda</Text>
        </TouchableOpacity>
      )}

      {/* Bottom detail panel */}
      {selectedHousing && (
        <Animated.View style={[styles.detailPanel, { transform: [{ translateY: panelTranslateY }] }]}>
          <View {...panelPanResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          {isCalculating ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : newHomeRoutes ? (
            <>
              <TransportModeSelector
                routes={newHomeRoutes}
                selectedMode={selectedMode}
                optimalMode={optimalMode}
                onModeChange={setSelectedMode}
              />
              {savings && (
                <RouteInfoPanel savings={savings} workplaceName={workplaceLabel} />
              )}
            </>
          ) : null}

          <HousingCard housing={selectedHousing} variant="compact" onPress={handleViewDetail} />

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.detailButton} onPress={handleViewDetail}>
              <Ionicons name="eye-outline" size={18} color={Colors.textOnPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.detailButtonText}>Ver Detalle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseDetail}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, fontWeight: '600', color: Colors.primary },
  workplaceOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 40,
    left: 20,
    right: 20,
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  workplaceText: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  guestCta: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  guestCtaText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
  workMarker: {
    backgroundColor: Colors.markerWork, borderRadius: 22,
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  homeMarker: {
    backgroundColor: Colors.accent, borderRadius: 22,
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  detailPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2,
  },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  detailButton: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
  },
  detailButtonText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
  closeButton: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
});
