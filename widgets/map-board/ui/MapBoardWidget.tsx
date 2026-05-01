/**
 * @layer widgets/map-board/ui
 * @description Map board widget that orchestrates housing markers, 
 * routing lines, priority selections, and animations.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Features
import { useAuth } from '@/features/auth';
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

  const { data: workplaces = [] } = useWorkplaces(!!user);
  const activeWorkplace = workplaces[0] || null;

  const {
    data: recommendations = [],
    isLoading: isLoadingRecommendations,
  } = useLatestRecommendations(activeWorkplace?.id ?? null);

  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null);

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

  /**
   * On housing selection: show the card and calculate routes.
   */
  const handleHousingSelect = useCallback((h: Housing) => {
    setSelectedHousing(h);
    if (activeWorkplace && user?.home_lat && user?.home_lon) {
      calculateRoutes(
        { latitude: h.latitude, longitude: h.longitude },
        { latitude: user.home_lat, longitude: user.home_lon },
        { latitude: activeWorkplace.work_lat, longitude: activeWorkplace.work_lon }
      );
    }
  }, [activeWorkplace, user, calculateRoutes]);

  const handleCloseDetail = useCallback(() => {
    setSelectedHousing(null);
    clearRoute();
  }, [clearRoute]);

  const handleViewDetail = useCallback(() => {
    if (selectedHousing) {
      router.push({ pathname: '/housing-detail', params: { id: selectedHousing.id } });
    }
  }, [selectedHousing, router]);

  const initialRegion = LIMA_REGION;

  return (
    <View style={styles.container}>
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
        initialRegion={initialRegion}
        mapType="none"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} tileSize={256} />

        {/* Current Home Marker */}
        {user?.home_lat && user?.home_lon && (
          <Marker
            coordinate={{ latitude: user.home_lat, longitude: user.home_lon }}
            title="Mi Casa Actual"
          >
            <View style={styles.homeMarker}>
              <Ionicons name="home" size={20} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Workplace Marker */}
        {activeWorkplace?.work_lat && activeWorkplace?.work_lon && (
          <Marker
            coordinate={{ latitude: activeWorkplace.work_lat, longitude: activeWorkplace.work_lon }}
            title={activeWorkplace.alias}
          >
            <View style={styles.workMarker}>
              <Ionicons name="briefcase" size={20} color={Colors.textOnPrimary} />
            </View>
          </Marker>
        )}

        {/* Housing markers */}
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

      {/* Floating Workplace Info */}
      {activeWorkplace && (
        <View style={styles.workplaceOverlay}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.workplaceText} numberOfLines={1}>
            Viendo cerca a: <Text style={{ fontWeight: '700' }}>{activeWorkplace.alias}</Text>
          </Text>
        </View>
      )}

      {/* Bottom detail panel */}
      {selectedHousing && (
        <View style={styles.detailPanel}>
          <View style={styles.dragHandle} />

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
                <RouteInfoPanel savings={savings} workplaceName={activeWorkplace?.alias ?? 'Trabajo'} />
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
    top: Platform.OS === 'ios' ? 60 : 40,
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
});
