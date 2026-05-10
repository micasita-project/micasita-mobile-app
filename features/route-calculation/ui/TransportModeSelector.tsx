/**
 * @layer features/route-calculation/ui
 * @description Transport mode selector (walking, cycling, driving).
 * Google Maps-style pill selector with time for each mode.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TransportMode, MultiModeRoutes } from '@/shared/types';
import { formatTravelTime } from '@/entities/route';
import { Colors } from '@/shared/config/colors';
import { TRANSPORT_MODE_CONFIG } from '@/shared/config/transport';

interface TransportModeSelectorProps {
  routes: MultiModeRoutes;
  selectedMode: TransportMode;
  optimalMode: TransportMode | null;
  priorityMode?: TransportMode;
  onModeChange: (mode: TransportMode) => void;
}

export function TransportModeSelector({
  routes,
  selectedMode,
  optimalMode,
  priorityMode,
  onModeChange,
}: TransportModeSelectorProps) {
  const sortedModes = useMemo(() => {
    if (!priorityMode) return TRANSPORT_MODE_CONFIG;
    return [...TRANSPORT_MODE_CONFIG].sort((a, b) => {
      if (a.id === priorityMode) return -1;
      if (b.id === priorityMode) return 1;
      return 0;
    });
  }, [priorityMode]);

  return (
    <View style={styles.container}>
      {sortedModes.map((cfg) => {
        const isSelected = selectedMode === cfg.id;
        const isOptimal = optimalMode === cfg.id;
        const time = routes[cfg.id].timeMinutes;
        const color = cfg.color;

        return (
          <TouchableOpacity
            key={cfg.id}
            style={[
              styles.pill,
              isSelected && { backgroundColor: color + '18', borderColor: color },
            ]}
            onPress={() => onModeChange(cfg.id)}
            activeOpacity={0.7}
          >
            <View style={styles.pillHeader}>
              <Ionicons
                name={cfg.iconOutline as any}
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
              {cfg.label}
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
