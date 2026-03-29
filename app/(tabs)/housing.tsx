/**
 * @layer app (pages)
 * @description Housing list page with district filters.
 *
 * FSD Composition:
 * - entities/housing → getAllHousing, getAvailableDistricts, HousingCard
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { HousingCard, getAllHousing, getAvailableDistricts } from '@/entities/housing';
import { Colors } from '@/shared/config/colors';
import type { Housing } from '@/shared/types';

export default function HousingScreen() {
  const router = useRouter();
  const allHousing = getAllHousing();
  const districts = getAvailableDistricts();
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const filteredHousing = useMemo(() => {
    if (!selectedDistrict) return allHousing;
    return allHousing.filter((h) => h.district === selectedDistrict);
  }, [selectedDistrict, allHousing]);

  const handleHousingPress = useCallback((housing: Housing) => {
    router.push({ pathname: '/housing-detail', params: { id: housing.id } });
  }, [router]);

  const renderHousingItem = useCallback(({ item }: { item: Housing }) => (
    <HousingCard housing={item} onPress={handleHousingPress} />
  ), [handleHousingPress]);

  return (
    <View style={styles.container}>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filtrar por distrito:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedDistrict && styles.filterChipActive]}
            onPress={() => setSelectedDistrict(null)}
          >
            <Text style={[styles.filterChipText, !selectedDistrict && styles.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {districts.map((district) => (
            <TouchableOpacity
              key={district}
              style={[styles.filterChip, selectedDistrict === district && styles.filterChipActive]}
              onPress={() => setSelectedDistrict(selectedDistrict === district ? null : district)}
            >
              <Text style={[styles.filterChipText, selectedDistrict === district && styles.filterChipTextActive]}>
                {district}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {filteredHousing.length} vivienda{filteredHousing.length !== 1 ? 's' : ''} disponible{filteredHousing.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredHousing}
        renderItem={renderHousingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏚️</Text>
            <Text style={styles.emptyText}>No se encontraron viviendas en este distrito</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterSection: {
    backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  filterScroll: { gap: 8 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.textOnPrimary },
  resultCount: { paddingHorizontal: 16, paddingVertical: 10 },
  resultCountText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },
});
