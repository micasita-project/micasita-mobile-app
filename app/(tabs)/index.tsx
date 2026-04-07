/**
 * @layer app (pages)
 * @description Map screen with OSM tiles, housing markers, auto-route and savings.
 *
 * FSD Composition:
 * - entities/housing → HousingMarker, HousingCard, getAllHousing
 * - entities/route → RoutePolyline
 * - features/route-calculation → useRouteCalculation, RouteInfoPanel
 * - features/auth → useAuth
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Features
import { useAuth } from '@/features/auth';
import { useRouteCalculation, RouteInfoPanel, TransportModeSelector } from '@/features/route-calculation';

// Entities
import { getAllHousing, HousingMarker, HousingCard } from '@/entities/housing';
import { RoutePolyline } from '@/entities/route';

// Shared
import { LIMA_REGION, OSM_TILE_URL } from '@/shared/config/map';
import { Colors } from '@/shared/config/colors';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import type { Housing, TransportMode } from '@/shared/types';

export default function MapScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const housing = getAllHousing();
  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null);

  // Recommending animation state
  const [priorityMode, setPriorityMode] = useState<TransportMode | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecommending) {
      fadeAnim.setValue(1);
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setIsRecommending(false));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRecommending, fadeAnim]);

  // Find the housing closest to the active workplace (straight-line distance)
  const closestHousingId = React.useMemo(() => {
    if (!user?.workplace.coordinates || housing.length === 0) return null;
    
    let minDistance = Infinity;
    let closestId: string | null = null;
    
    const { latitude: lat1, longitude: lon1 } = user.workplace.coordinates;
    
    for (const h of housing) {
      const { latitude: lat2, longitude: lon2 } = h.coordinates;
      // Simple euclidian distance for local markers
      const distance = Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestId = h.id;
      }
    }
    return closestId;
  }, [user?.workplace.coordinates, housing]);

  // Features
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

  const handlePrioritySelect = useCallback((mode: TransportMode) => {
    setPriorityMode(mode);
    setSelectedMode(mode);
    setIsRecommending(true);
  }, [setSelectedMode]);

  /**
   * On housing selection: auto-calculate route and show savings.
   */
  const handleHousingSelect = useCallback((h: Housing) => {
    setSelectedHousing(h);
    if (user?.workplace.coordinates && user?.currentHome.coordinates) {
      calculateRoutes(
        h.coordinates,
        user.currentHome.coordinates,
        user.workplace.coordinates
      );
      mapRef.current?.fitToCoordinates(
        [h.coordinates, user.workplace.coordinates],
        { edgePadding: { top: 100, right: 50, bottom: 450, left: 50 }, animated: true }
      );
    }
  }, [user, calculateRoutes]);

  const handleCloseDetail = useCallback(() => {
    setSelectedHousing(null);
    clearRoute();
  }, [clearRoute]);

  const handleViewDetail = useCallback(() => {
    if (selectedHousing) {
      router.push({ pathname: '/housing-detail', params: { id: selectedHousing.id } });
    }
  }, [selectedHousing, router]);

  // Center map around workplace area
  const initialRegion = user?.workplace.coordinates
    ? { ...user.workplace.coordinates, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : LIMA_REGION;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        mapType="none"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} tileSize={256} />

        {/* Housing markers */}
        {housing.map((h) => (
          <HousingMarker
            key={h.id}
            housing={h}
            onPress={handleHousingSelect}
            isSelected={selectedHousing?.id === h.id}
            priorityRecommendedMode={h.id === closestHousingId ? (priorityMode || undefined) : undefined}
          />
        ))}

        {/* Workplace marker */}
        {user?.workplace.coordinates && (
          <Marker coordinate={user.workplace.coordinates} title={user.workplace.name}>
            <View style={styles.workMarker}>
              <Ionicons name="briefcase" size={18} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Current home marker */}
        {user?.currentHome.coordinates && (
          <Marker coordinate={user.currentHome.coordinates} title="Tu casa actual">
            <View style={styles.homeMarker}>
              <Ionicons name="home" size={18} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {newHomeRoutes && (
          <RoutePolyline
            coordinates={newHomeRoutes[selectedMode].waypoints}
            color={TRANSPORT_MODE_COLORS[selectedMode]}
          />
        )}
      </MapView>

      {/* Bottom detail panel */}
      {selectedHousing && (
        <View style={styles.detailPanel}>
          <View style={styles.dragHandle} />

          {isCalculating ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="small" color={Colors.primary} />
              {/* <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>Calculando rutas...</Text> */}
            </View>
          ) : newHomeRoutes ? (
            <>
              <TransportModeSelector
                routes={newHomeRoutes}
                selectedMode={selectedMode}
                optimalMode={optimalMode}
                onModeChange={setSelectedMode}
                priorityMode={priorityMode || undefined}
              />
              {savings && (
                <RouteInfoPanel savings={savings} workplaceName={user?.workplace.district} />
              )}
            </>
          ) : null}

          <HousingCard housing={selectedHousing} variant="compact" onPress={() => handleViewDetail()} />

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.detailButton} onPress={handleViewDetail}>
              <Ionicons name="eye-outline" size={18} color={Colors.textOnPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.detailButtonText}>Ver Detalle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseDetail}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Priority Selection Modal */}
      {!priorityMode && (
        <View style={styles.priorityOverlay}>
          <View style={styles.priorityCard}>
            <Text style={styles.priorityTitle}>¿Cómo prefieres movilizarte?</Text>
            <Text style={styles.prioritySubtitle}>
              Usaremos esta prioridad para recomendarte la mejor vivienda.
            </Text>
            
            <View style={styles.priorityOptions}>
              <TouchableOpacity
                style={[styles.priorityButton, { borderColor: TRANSPORT_MODE_COLORS.driving }]}
                onPress={() => handlePrioritySelect('driving')}
              >
                <Ionicons name="car-outline" size={24} color={TRANSPORT_MODE_COLORS.driving} />
                <Text style={[styles.priorityButtonText, { color: TRANSPORT_MODE_COLORS.driving }]}>Auto</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.priorityButton, { borderColor: TRANSPORT_MODE_COLORS.cycling }]}
                onPress={() => handlePrioritySelect('cycling')}
              >
                <Ionicons name="bicycle-outline" size={24} color={TRANSPORT_MODE_COLORS.cycling} />
                <Text style={[styles.priorityButtonText, { color: TRANSPORT_MODE_COLORS.cycling }]}>Bici</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.priorityButton, { borderColor: TRANSPORT_MODE_COLORS.walking }]}
                onPress={() => handlePrioritySelect('walking')}
              >
                <Ionicons name="walk-outline" size={24} color={TRANSPORT_MODE_COLORS.walking} />
                <Text style={[styles.priorityButtonText, { color: TRANSPORT_MODE_COLORS.walking }]}>A pie</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Recommending Overlay */}
      {isRecommending && priorityMode && (
        <Animated.View style={[styles.recommendingOverlay, { opacity: fadeAnim }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.recommendingText}>Analizando tu perfil...</Text>
          <Text style={styles.recommendingSubText}>
            Encontrando las mejores viviendas cerca a tu trabajo
          </Text>
        </Animated.View>
      )}

      {/* Config Button to re-filter */}
      {priorityMode && !isRecommending && (
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => setPriorityMode(null)}
        >
          <Ionicons name="options-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
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
  dragHandle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 8,
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
  recommendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  recommendingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  recommendingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  priorityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  priorityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  priorityTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  prioritySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  priorityButtonText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  configButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 900,
  },
});
