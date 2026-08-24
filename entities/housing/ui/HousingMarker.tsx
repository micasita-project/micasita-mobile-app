/**
 * @layer entities/housing/ui
 * @description Custom housing marker for the map.
 */

import { Colors } from "@/shared/config/colors";
import { getTransportConfig } from "@/shared/config/transport";
import type { Housing, TransportMode } from "@/shared/types";
import type { GeoPoint } from "@/shared/utils/geo";
import { formatPrice } from "@/shared/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppMarker } from "@/shared/ui/map";

interface HousingMarkerProps {
  housing: Housing;
  onPress?: (housing: Housing) => void;
  isSelected?: boolean;
  priorityRecommendedMode?: TransportMode;
  /**
   * Posición visual del marcador cuando comparte coordenada exacta con otra
   * vivienda (ver `spreadOverlappingMarkers`) — solo cambia dónde se dibuja
   * el pin. `onPress` sigue entregando `housing` con su coordenada real, así
   * que la ruta y el detalle nunca usan esta posición desplazada.
   */
  displayCoordinate?: GeoPoint;
}

export function HousingMarker({
  housing,
  onPress,
  isSelected = false,
  priorityRecommendedMode,
  displayCoordinate,
}: HousingMarkerProps) {
  const transportCfg = priorityRecommendedMode
    ? getTransportConfig(priorityRecommendedMode)
    : null;

  // Start tracking until the view has been laid out (prevents default native pin
  // on iOS when the custom view hasn't rendered yet at snapshot time).
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const handleLayout = useCallback(() => setTracksViewChanges(false), []);

  // Re-enable tracking briefly when selection state changes so the native
  // layer captures the updated appearance (selected/deselected bubble).
  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 200);
    return () => clearTimeout(t);
  }, [isSelected]);

  return (
    <AppMarker
      coordinate={
        displayCoordinate ?? { latitude: housing.latitude, longitude: housing.longitude }
      }
      onPress={() => onPress?.(housing)}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.markerContainer} onLayout={handleLayout}>
        {transportCfg && (
          <View
            style={[
              styles.recommendedBadge,
              { backgroundColor: transportCfg.color },
            ]}
          >
            <Ionicons name={transportCfg.icon} size={12} color="#FFF" />
            <Text style={styles.recommendedText}>Recomendado</Text>
          </View>
        )}
        <View
          style={[
            styles.markerBubble,
            isSelected && styles.bubbleSelected,
            transportCfg && {
              borderColor: transportCfg.color,
              borderWidth: 2.5,
              shadowColor: transportCfg.color,
              shadowOpacity: 0.6,
              shadowRadius: 8,
            },
          ]}
        >
          <Ionicons
            name="home-outline"
            size={14}
            color={isSelected ? Colors.textOnPrimary : Colors.primary}
          />
          <Text
            style={[styles.markerPrice, isSelected && styles.priceSelected]}
          >
            {formatPrice(housing.price, housing.currency)}
          </Text>
        </View>
        <View
          style={[
            styles.markerArrow,
            isSelected && styles.arrowSelected,
            transportCfg && !isSelected && { borderTopColor: transportCfg.color },
          ]}
        />
      </View>
    </AppMarker>
  );
}

const styles = StyleSheet.create({
  markerContainer: { alignItems: "center" },
  markerBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: 4,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bubbleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  markerPrice: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  priceSelected: { color: Colors.textOnPrimary },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.primary,
    marginTop: -1,
  },
  arrowSelected: { borderTopColor: Colors.primaryDark },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: -8,
    zIndex: 10,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  recommendedText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 3,
    textTransform: "uppercase",
  },
});
