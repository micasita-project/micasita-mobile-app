/**
 * @layer entities/housing/ui
 * @description Custom housing marker for the map.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Housing } from '@/shared/types';
import { Colors } from '@/shared/config/colors';

interface HousingMarkerProps {
  housing: Housing;
  onPress?: (housing: Housing) => void;
  isSelected?: boolean;
}

export function HousingMarker({
  housing,
  onPress,
  isSelected = false,
}: HousingMarkerProps) {
  return (
    <Marker
      coordinate={housing.coordinates}
      onPress={() => onPress?.(housing)}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        <View style={[styles.markerBubble, isSelected && styles.bubbleSelected]}>
          <Text style={styles.markerIcon}>🏠</Text>
          <Text style={[styles.markerPrice, isSelected && styles.priceSelected]}>
            S/{housing.price}
          </Text>
        </View>
        <View style={[styles.markerArrow, isSelected && styles.arrowSelected]} />
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
});
