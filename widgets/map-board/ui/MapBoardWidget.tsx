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
  Image,
} from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Features
import { useAuth } from '@/features/auth';
import { useGuest, GuestSetupModal } from '@/features/guest';
import { AddWorkplaceModal } from '@/widgets/workplace/ui/AddWorkplaceModal';
import { useRouteCalculation } from '@/features/route-calculation';
import { useWorkplaces } from '@/entities/workplace/model/useWorkplaces';
import { usePreferences } from '@/entities/recommendation-preferences';
import { useLatestRecommendations } from '@/features/recommendation/model/useRecommendations';

// Entities
import { HousingMarker } from '@/entities/housing';
import { HousingImages } from '@/entities/housing/api/images';
import { RoutePolyline } from '@/entities/route';

// Shared
import { LIMA_REGION, OSM_TILE_URL } from '@/shared/config/map';
import { Colors } from '@/shared/config/colors';
import { useSelectedWorkplace } from '@/shared/model/SelectedWorkplaceContext';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import type { Housing, TransportMode } from '@/shared/types';

const TRANSPORT_MODES: { id: TransportMode; label: string; icon: 'car' | 'bicycle' | 'walk' }[] = [
  { id: 'driving', label: 'Auto', icon: 'car' },
  { id: 'cycling', label: 'Bici', icon: 'bicycle' },
  { id: 'walking', label: 'A pie', icon: 'walk' },
];

export function MapBoardWidget() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [showAddWpModal, setShowAddWpModal] = useState(false);

  // Show setup modal once guest data is loaded and incomplete.
  // Wait for auth to initialize so we don't trigger for users whose session is still restoring.
  useEffect(() => {
    if (!isInitialized || !isGuest || !guestInitialized) return;
    if (!guestHome || !guestWorkplace) {
      setShowSetup(true);
    }
  }, [isInitialized, isGuest, guestInitialized, guestHome, guestWorkplace]);

  // ── Authenticated: workplaces + latest recommendations ─────────
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const { selectedWorkplaceId } = useSelectedWorkplace();
  const activeWorkplace = workplaces.find(wp => wp.id === selectedWorkplaceId) || workplaces[0] || null;

  const { data: preferences = [] } = usePreferences(activeWorkplace?.id ?? null);
  const activePreference = preferences[0];

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
    setSelectedMode,
    calculateRoutes,
    clearRoute,
    savings,
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
    : activeWorkplace?.work_address ?? '';

  const showWorkplaceOverlay = isGuest ? !!guestWorkplace : !!activeWorkplace;

  const handleEditWorkplace = useCallback(() => {
    if (isGuest) setShowSetup(true);
    else setShowAddWpModal(true);
  }, [isGuest]);

  return (
    <View style={styles.container}>
      <GuestSetupModal visible={showSetup && isGuest} onClose={() => setShowSetup(false)} />
      <AddWorkplaceModal visible={showAddWpModal} onClose={() => setShowAddWpModal(false)} />
      {/* ── Purple Header ──────────────────────────────────── */}
      <View style={[styles.mapHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.mapHeaderTitle}>Mapa</Text>
        <TouchableOpacity style={styles.searchBar} onPress={handleEditWorkplace} activeOpacity={0.85}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.85)" />
          <Text style={styles.searchBarText} numberOfLines={1}>
            {showWorkplaceOverlay ? workplaceLabel : 'Configura tu búsqueda'}
          </Text>
          <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        <View style={styles.transportChipsRow}>
          {TRANSPORT_MODES.map((mode) => {
            const isActive = (selectedMode ?? 'cycling') === mode.id;
            const timeMin = newHomeRoutes ? Math.round(newHomeRoutes[mode.id].timeMinutes) : null;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.transportChip, isActive && styles.transportChipActive]}
                onPress={() => setSelectedMode(mode.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={mode.icon}
                  size={14}
                  color={isActive ? TRANSPORT_MODE_COLORS[mode.id] : '#fff'}
                />
                <Text style={[styles.transportChipLabel, isActive && { color: TRANSPORT_MODE_COLORS[mode.id] }]}>
                  {mode.label}
                </Text>
                {isActive && timeMin !== null && (
                  <Text style={[styles.transportChipTime, { color: TRANSPORT_MODE_COLORS[mode.id] }]}>
                    · {timeMin}min
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Map Area ───────────────────────────────────────── */}
      <View style={styles.mapContainer}>
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

          {!isGuest && user?.home_lat && user?.home_lon && (
            <Marker coordinate={{ latitude: user.home_lat, longitude: user.home_lon }} title="Mi Casa Actual">
              <View style={styles.homeMarker}><Ionicons name="home" size={20} color={Colors.textOnPrimary} /></View>
            </Marker>
          )}
          {isGuest && guestHome && (
            <Marker coordinate={{ latitude: guestHome.lat, longitude: guestHome.lon }} title="Mi Casa Actual">
              <View style={styles.homeMarker}><Ionicons name="home" size={20} color={Colors.textOnPrimary} /></View>
            </Marker>
          )}
          {!isGuest && activeWorkplace?.work_lat && activeWorkplace?.work_lon && (
            <Marker coordinate={{ latitude: activeWorkplace.work_lat, longitude: activeWorkplace.work_lon }} title={activeWorkplace.work_address}>
              <View style={styles.workMarker}><Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} /></View>
            </Marker>
          )}
          {isGuest && guestWorkplace && (
            <Marker coordinate={{ latitude: guestWorkplace.lat, longitude: guestWorkplace.lon }} title="Mi Trabajo">
              <View style={styles.workMarker}><Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} /></View>
            </Marker>
          )}
          {isGuest && guestWorkplace && (
            <Circle
              center={{ latitude: guestWorkplace.lat, longitude: guestWorkplace.lon }}
              radius={(guestWorkplace.maxDistanceKm ?? 10) * 1000}
              strokeColor={Colors.primary + '70'}
              fillColor={Colors.primary + '12'}
              strokeWidth={2}
            />
          )}
          {!isGuest && activeWorkplace?.work_lat && activeWorkplace?.work_lon && (
            <Circle
              center={{ latitude: activeWorkplace.work_lat, longitude: activeWorkplace.work_lon }}
              radius={(activePreference?.max_distance_km ?? 10) * 1000}
              strokeColor={Colors.primary + '70'}
              fillColor={Colors.primary + '12'}
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
              color={TRANSPORT_MODE_COLORS[selectedMode]}
            />
          )}
        </MapView>

      {/* Floating detail card */}
      {selectedHousing && (() => {
        const selectedRoute = newHomeRoutes?.[selectedMode];
        const timeMinutes = selectedRoute?.timeMinutes;
        const modeIcon = TRANSPORT_MODES.find(m => m.id === selectedMode)?.icon;
        
        return (
          <Animated.View 
            {...panelPanResponder.panHandlers}
            style={[styles.floatingCardContainer, { transform: [{ translateY: panelTranslateY }] }]}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={handleViewDetail} style={styles.floatingCard}>
              {selectedHousing.images && selectedHousing.images.length > 0 ? (
                <Image
                  source={HousingImages[selectedHousing.images[0]]}
                  style={styles.cardImage}
                />
              ) : (
                <View style={[styles.cardImage, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="home-outline" size={24} color={Colors.textMuted} />
                </View>
              )}
              <View style={styles.cardRight}>
                <Text style={styles.cardPrice}>
                  S/ {selectedHousing.price.toLocaleString('es-PE')} <Text style={styles.cardPriceUnit}>/mes</Text>
                </Text>
                <Text style={styles.cardSpecs} numberOfLines={1}>
                  {selectedHousing.district} · {selectedHousing.bedrooms} hab · {selectedHousing.total_area_sqm} m²
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.cardTimePill}>
                    <Ionicons 
                      name={modeIcon === 'car' ? 'car-outline' : modeIcon === 'bicycle' ? 'bicycle-outline' : 'walk-outline'} 
                      size={13} 
                      color="#10B981" 
                    />
                    <Text style={styles.cardTimeText}>{timeMinutes ?? '--'} min</Text>
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
          </Animated.View>
        );
      })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // ── Header ──────────────────────────────────────────────
  mapHeader: {
    backgroundColor: Colors.primary,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  mapHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  searchBarText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  transportChipsRow: { flexDirection: 'row', gap: 8 },
  transportChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  transportChipActive: { backgroundColor: '#fff', borderColor: 'transparent' },
  transportChipLabel: { fontSize: 12, fontWeight: '600', color: '#fff' },
  transportChipTime: { fontSize: 11, fontWeight: '500' },
  // ── Map container ────────────────────────────────────────
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  // ── FABs ─────────────────────────────────────────────────
  fabFilters: {
    position: 'absolute', top: 16, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  fabFiltersBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.error,
  },
  fabLocate: {
    position: 'absolute', bottom: 32, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
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
  floatingCardContainer: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    zIndex: 100,
  },
  floatingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImage: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#bcaecc',
  },
  cardRight: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  cardPriceUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  cardSpecs: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 6,
  },
  cardTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  cardTimeText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  cardTimeSuffix: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  cardSavingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardSavingsText: {
    color: '#d97706',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 2,
  },
});
