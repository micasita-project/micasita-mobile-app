/**
 * @layer app (pages)
 * @description Housing detail modal page with route savings comparison.
 *
 * FSD Composition:
 * - features/auth → useAuth
 * - entities/housing → getHousingById
 * - entities/route → calculateHaversineDistance, formatDistance, formatTravelTime, estimateTravelTime
 * - shared/ui → Button
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { getHousingById } from '@/entities/housing';
import {
  calculateHaversineDistance,
  formatDistance,
  formatTravelTime,
  estimateTravelTime,
} from '@/entities/route';
import { HousingImages } from '@/entities/housing/api/images';

function getImageSource(imagePath?: string) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return { uri: imagePath };
  return HousingImages[imagePath];
}
import { Button } from '@/shared/ui/Button';
import { Colors } from '@/shared/config/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HousingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const housing = getHousingById(id);

  const routeInfo = useMemo(() => {
    // TODO: Integrar Workplace del backend para calcular distancias
    if (!housing) return null;
    return null;
  }, [housing]);

  if (!housing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Vivienda no encontrada</Text>
      </View>
    );
  }

  const handleViewOnMap = () => router.back();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* ── Image carousel ───────────────────────────────── */}
      <View style={styles.carouselWrapper}>
        <FlatList
          data={housing.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveImageIndex(index);
          }}
          renderItem={({ item }) => (
            <Image
              source={getImageSource(item)}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          ListEmptyComponent={
            <View style={[styles.heroImage, styles.noImagePlaceholder]}>
              <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
            </View>
          }
        />

        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={handleViewOnMap} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* Type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{housing.property_type}</Text>
        </View>

        {/* Dot indicators */}
        {housing.images.length > 1 && (
          <View style={styles.dots}>
            {housing.images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeImageIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Main info ─────────────────────────────────────── */}
      <View style={styles.mainInfo}>
        <Text style={styles.title}>{housing.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.locationText}>{housing.address}, {housing.district}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.currencyLabel}>{housing.currency ?? 'PEN'}</Text>
          <Text style={styles.priceValue}> {housing.price.toLocaleString('es-PE')}</Text>
          <Text style={styles.priceUnit}>/mes</Text>
        </View>
      </View>

      {/* ── Stats grid ───────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="bed-outline" size={20} color={Colors.primary} />
          <Text style={styles.statValue}>{housing.bedrooms}</Text>
          <Text style={styles.statLabel}>Hab.</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="water-outline" size={20} color={Colors.primary} />
          <Text style={styles.statValue}>{housing.bathrooms}</Text>
          <Text style={styles.statLabel}>Baños</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="resize-outline" size={20} color={Colors.primary} />
          <Text style={styles.statValue}>{housing.total_area_sqm}</Text>
          <Text style={styles.statLabel}>m² total</Text>
        </View>
        {housing.parking !== undefined && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="car-outline" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{housing.parking}</Text>
              <Text style={styles.statLabel}>Est.</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Extra details chips ───────────────────────────── */}
      <View style={styles.chipsRow}>
        {housing.covered_area_sqm && (
          <View style={styles.chip}>
            <Ionicons name="square-outline" size={13} color={Colors.primary} />
            <Text style={styles.chipText}>{housing.covered_area_sqm} m² cubiertos</Text>
          </View>
        )}
        {housing.antiquity !== undefined && (
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={13} color={Colors.primary} />
            <Text style={styles.chipText}>
              {housing.antiquity === 0 ? 'Estreno' : `${housing.antiquity} año${housing.antiquity !== 1 ? 's' : ''}`}
            </Text>
          </View>
        )}
      </View>

      {/* ── Description ───────────────────────────────────── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.description}>{housing.description}</Text>
      </View>

      {/* ── Features ─────────────────────────────────────── */}
      {housing.features.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Características</Text>
          <View style={styles.featuresList}>
            {housing.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Route savings — se habilitará con la integración de Workplaces */}

      <Button title="Ver en el Mapa" onPress={handleViewOnMap} size="large" style={styles.mapButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12 },
  errorText: { fontSize: 16, color: Colors.textMuted },

  // Image carousel
  carouselWrapper: { position: 'relative' },
  heroImage: { width: SCREEN_WIDTH, height: 250 },
  noImagePlaceholder: { backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    position: 'absolute', top: 16, left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  typeBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  typeBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.textOnPrimary, width: 18 },

  // Main info
  mainInfo: { padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  currencyLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  priceValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 16, color: Colors.textSecondary, marginLeft: 2 },

  // Stats
  statsGrid: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-around', marginBottom: 4 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.borderLight },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '12', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.primary },

  // Sections
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginHorizontal: 16, marginBottom: 12, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  featuresList: { gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: Colors.textPrimary },

  // Route
  routeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: 16, padding: 18, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.primaryLight + '30' },
  routeDetails: { gap: 10, marginBottom: 12 },
  routeDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDetailLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  routeDetailValue: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  savingsBadge: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  savingPositive: { backgroundColor: '#e8f8ef' },
  savingNegative: { backgroundColor: '#fdf2e9' },
  savingsText: { fontSize: 13, fontWeight: '700', flex: 1 },
  savingsTextPos: { color: '#27ae60' },
  savingsTextNeg: { color: '#e67e22' },
  mapButton: { marginHorizontal: 16 },
});
