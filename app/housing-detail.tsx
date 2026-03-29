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

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
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
import { Button } from '@/shared/ui/Button';
import { Colors } from '@/shared/config/colors';

export default function HousingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const housing = getHousingById(id);

  const routeInfo = useMemo(() => {
    if (!housing || !user?.workplace.coordinates || !user?.currentHome.coordinates) return null;

    // New home → work
    const newDistanceKm = calculateHaversineDistance(housing.coordinates, user.workplace.coordinates);
    const newTimeMinutes = estimateTravelTime(newDistanceKm);

    // Current home → work
    const currentDistanceKm = calculateHaversineDistance(user.currentHome.coordinates, user.workplace.coordinates);
    const currentTimeMinutes = estimateTravelTime(currentDistanceKm);

    const savedMinutes = currentTimeMinutes - newTimeMinutes;
    const savedKm = currentDistanceKm - newDistanceKm;
    const savingsPercentage = Math.round((savedMinutes / currentTimeMinutes) * 100);

    return {
      newDistanceKm: Math.round(newDistanceKm * 100) / 100,
      newTimeMinutes,
      currentTimeMinutes,
      savedMinutes,
      savedKm: Math.round(savedKm * 100) / 100,
      savingsPercentage,
      formattedNewDistance: formatDistance(newDistanceKm),
      formattedNewTime: formatTravelTime(newTimeMinutes),
      formattedCurrentTime: formatTravelTime(currentTimeMinutes),
    };
  }, [housing, user]);

  if (!housing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Vivienda no encontrada</Text>
      </View>
    );
  }

  const typeLabel = housing.type === 'apartment' ? 'Departamento'
    : housing.type === 'house' ? 'Casa' : 'Habitación';

  const handleViewOnMap = () => router.back();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View>
        <Image source={{ uri: housing.image }} style={styles.heroImage} resizeMode="cover" />

        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={handleViewOnMap} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
      </View>

      <View style={styles.mainInfo}>
        <Text style={styles.title}>{housing.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.locationText}>{housing.address}, {housing.district}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceValue}>S/{housing.price}</Text>
          <Text style={styles.priceUnit}>/mes</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="bed-outline" size={22} color={Colors.primary} />
          <Text style={styles.statValue}>{housing.bedrooms}</Text>
          <Text style={styles.statLabel}>Hab.</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="water-outline" size={22} color={Colors.primary} />
          <Text style={styles.statValue}>{housing.bathrooms}</Text>
          <Text style={styles.statLabel}>Baños</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="resize-outline" size={22} color={Colors.primary} />
          <Text style={styles.statValue}>{housing.area}</Text>
          <Text style={styles.statLabel}>m²</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.description}>{housing.description}</Text>
      </View>

      {/* Features */}
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

      {/* Route savings comparison */}
      {routeInfo && (
        <View style={styles.routeCard}>
          <Text style={styles.sectionTitle}>Distancia al Trabajo</Text>
          <View style={styles.routeDetails}>
            <View style={styles.routeDetailItem}>
              <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
              <Text style={styles.routeDetailLabel}>Desde esta casa</Text>
              <Text style={styles.routeDetailValue}>{routeInfo.formattedNewDistance} · {routeInfo.formattedNewTime}</Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Ionicons name="home-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.routeDetailLabel}>Desde tu casa actual</Text>
              <Text style={[styles.routeDetailValue, { color: Colors.textMuted }]}>{routeInfo.formattedCurrentTime}</Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Ionicons name="briefcase-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.routeDetailLabel}>Destino</Text>
              <Text style={styles.routeDetailValue}>{user?.workplace.district}</Text>
            </View>
          </View>

          {/* Savings badge */}
          <View style={[styles.savingsBadge, routeInfo.savedMinutes > 0 ? styles.savingPositive : styles.savingNegative]}>
            <Ionicons
              name={routeInfo.savedMinutes > 0 ? 'trending-down' : 'trending-up'}
              size={18}
              color={routeInfo.savedMinutes > 0 ? '#27ae60' : '#e67e22'}
            />
            <Text style={[styles.savingsText, routeInfo.savedMinutes > 0 ? styles.savingsTextPos : styles.savingsTextNeg]}>
              {Math.abs(routeInfo.savedMinutes)} min {routeInfo.savedMinutes > 0 ? 'menos' : 'más'} vs tu casa actual
              {routeInfo.savedMinutes > 0 ? ` (${routeInfo.savingsPercentage}% ahorro)` : ''}
            </Text>
          </View>
        </View>
      )}

      <Button title="Ver en el Mapa" onPress={handleViewOnMap} size="large" style={styles.mapButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12 },
  errorText: { fontSize: 16, color: Colors.textMuted },
  heroImage: { width: '100%', height: 250 },
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
  mainInfo: { padding: 20, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 16, color: Colors.textSecondary, marginLeft: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.borderLight },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginHorizontal: 16, marginBottom: 12, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  featuresList: { gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: Colors.textPrimary },
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
