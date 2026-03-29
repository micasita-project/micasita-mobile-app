/**
 * @layer features/route-calculation/ui
 * @description Panel showing route info AND time savings vs current home.
 * Uses Ionicons to replace emojis for a cleaner look.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteSavings } from '@/shared/types';
import { formatDistance, formatTravelTime } from '@/entities/route';
import { Colors } from '@/shared/config/colors';

interface RouteInfoPanelProps {
  savings: RouteSavings;
  workplaceName?: string;
}

export function RouteInfoPanel({ savings, workplaceName }: RouteInfoPanelProps) {
  const isSavingTime = savings.savedMinutes > 0;

  return (
    <View style={styles.container}>
      {/* New route info */}
      <View style={styles.routeRow}>
        <View style={styles.item}>
          <Ionicons name="resize-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.value}>{formatDistance(savings.newRoute.distanceKm)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.value}>{formatTravelTime(savings.newRoute.timeMinutes)}</Text>
        </View>
        {workplaceName && (
          <>
            <View style={styles.divider} />
            <View style={styles.item}>
              <Ionicons name="briefcase-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.label}>{workplaceName}</Text>
            </View>
          </>
        )}
      </View>

      {/* Savings badge */}
      <View style={[styles.savingsBadge, isSavingTime ? styles.savingPositive : styles.savingNegative]}>
        <Ionicons 
          name={isSavingTime ? "trending-down" : "trending-up"} 
          size={16} 
          color={isSavingTime ? "#27ae60" : "#e67e22"} 
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.savingsText, isSavingTime ? styles.savingsTextPos : styles.savingsTextNeg]}>
          {Math.abs(savings.savedMinutes)} min {isSavingTime ? 'menos' : 'más'} vs tu casa actual
          {isSavingTime ? ` (${savings.savingsPercentage}% ahorro)` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8, gap: 6 },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: 10, padding: 8,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  label: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  divider: { width: 1, height: 16, backgroundColor: Colors.border, marginHorizontal: 10 },
  savingsBadge: { 
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center' 
  },
  savingPositive: { backgroundColor: '#e8f8ef' },
  savingNegative: { backgroundColor: '#fdf2e9' },
  savingsText: { fontSize: 11, fontWeight: '700' },
  savingsTextPos: { color: '#27ae60' },
  savingsTextNeg: { color: '#e67e22' },
});
