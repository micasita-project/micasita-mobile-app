/**
 * @layer entities/housing/ui
 * @description Custom housing marker for the map.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { Housing, TransportMode } from '@/shared/types';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import { Colors } from '@/shared/config/colors';

interface HousingMarkerProps {
  housing: Housing;
  onPress?: (housing: Housing) => void;
  isSelected?: boolean;
  priorityRecommendedMode?: TransportMode;
}

export function HousingMarker({
  housing,
  onPress,
  isSelected = false,
  priorityRecommendedMode,
}: HousingMarkerProps) {
  const iconName = priorityRecommendedMode === 'driving' ? 'car' :
                   priorityRecommendedMode === 'cycling' ? 'bicycle' : 'walk';
  const priorityColor = priorityRecommendedMode ? TRANSPORT_MODE_COLORS[priorityRecommendedMode] : null;

  return (
    <Marker
      coordinate={housing.coordinates}
      onPress={() => onPress?.(housing)}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        {priorityRecommendedMode && (
          <View style={[styles.recommendedBadge, { backgroundColor: priorityColor! }]}>
            <Ionicons name={iconName} size={12} color="#FFF" />
            <Text style={styles.recommendedText}>Recomendado</Text>
          </View>
        )}
        <View style={[
          styles.markerBubble, 
          isSelected && styles.bubbleSelected,
          priorityRecommendedMode && { 
            borderColor: priorityColor!, 
            borderWidth: 2.5,
            shadowColor: priorityColor!,
            shadowOpacity: 0.6,
            shadowRadius: 8
          }
        ]}>
          <Text style={styles.markerIcon}>🏠</Text>
          <Text style={[styles.markerPrice, isSelected && styles.priceSelected]}>
            S/{housing.price}
          </Text>
        </View>
        <View style={[
          styles.markerArrow, 
          isSelected && styles.arrowSelected,
          priorityRecommendedMode && !isSelected && { borderTopColor: priorityColor! }
        ]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: { alignItems: 'center' },
  markerBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 2, borderColor: Colors.primary, gap: 4,
    shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  bubbleSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  markerIcon: { fontSize: 14 },
  markerPrice: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  priceSelected: { color: Colors.textOnPrimary },
  markerArrow: {
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: Colors.primary, marginTop: -1,
  },
  arrowSelected: { borderTopColor: Colors.primaryDark },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#FFF',
  },
  recommendedText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 3,
    textTransform: 'uppercase',
  },
});
