/**
 * @layer features/route-calculation/ui
 * @description Transport mode selector (walking, cycling, driving).
 * Google Maps-style pill selector with time for each mode.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TransportMode, MultiModeRoutes } from '@/shared/types';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';
import { formatTravelTime } from '@/entities/route';
import { Colors } from '@/shared/config/colors';

interface TransportModeSelectorProps {
  routes: MultiModeRoutes;
  selectedMode: TransportMode;
  optimalMode: TransportMode | null;
  onModeChange: (mode: TransportMode) => void;
}

const MODE_CONFIG: { mode: TransportMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'driving', icon: 'car-outline', label: 'Auto' },
  { mode: 'cycling', icon: 'bicycle-outline', label: 'Bici' },
  { mode: 'walking', icon: 'walk-outline', label: 'A pie' },
];

export function TransportModeSelector({
  routes,
  selectedMode,
  optimalMode,
  onModeChange,
}: TransportModeSelectorProps) {
  return (
    <View style={styles.container}>
      {MODE_CONFIG.map(({ mode, icon, label }) => {
        const isSelected = selectedMode === mode;
        const isOptimal = optimalMode === mode;
        const time = routes[mode].timeMinutes;
        const color = TRANSPORT_MODE_COLORS[mode];

        return (
          <TouchableOpacity
            key={mode}
            style={[
              styles.pill,
              isSelected && { backgroundColor: color + '18', borderColor: color },
            ]}
            onPress={() => onModeChange(mode)}
            activeOpacity={0.7}
          >
            <View style={styles.pillHeader}>
              <Ionicons
                name={icon as any}
                size={20}
                color={isSelected ? color : Colors.textMuted}
              />
              {isOptimal && (
                <View style={[styles.optimalBadge, { backgroundColor: color }]}>
                  <Ionicons name="star" size={8} color="#FFF" />
                </View>
              )}
            </View>
            <Text style={[styles.pillTime, isSelected && { color }]}>
              {formatTravelTime(time)}
            </Text>
            <Text style={[styles.pillLabel, isSelected && { color }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', gap: 6, marginBottom: 8,
  },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4,
    borderRadius: 10, backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  pillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  optimalBadge: {
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },
  pillTime: {
    fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 1,
  },
  pillLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
});
