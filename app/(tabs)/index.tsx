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

import React, { useState, useRef, useCallback } from 'react';
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

// Entities
import { getAllHousing, HousingMarker, HousingCard } from '@/entities/housing';
import { RoutePolyline } from '@/entities/route';

// Shared
import { LIMA_REGION, OSM_TILE_URL } from '@/shared/config/map';
import { Colors } from '@/shared/config/colors';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import type { Housing } from '@/shared/types';

export default function MapScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const housing = getAllHousing();
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
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>Calculando rutas...</Text>
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
});
