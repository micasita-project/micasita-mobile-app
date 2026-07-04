/**
 * @layer app (pages)
 * @description Ruta modal para editar una vivienda existente.
 */

import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PublishWizard } from '@/features/publish-housing';
import type { PublishedHousing, HousingDraft } from '@/shared/types';
import { Colors } from '@/shared/config/colors';
import { Ionicons } from '@expo/vector-icons';

export default function EditHousingScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();

  const propertyData = useMemo(() => {
    if (!data) return null;
    try {
      const parsed = JSON.parse(data) as PublishedHousing;

      const draft: HousingDraft = {
        address: parsed.address,
        district: parsed.district,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        title: parsed.title,
        property_type: parsed.property_type as any,
        currency: parsed.currency as any,
        price: parsed.price,
        total_area_sqm: parsed.total_area_sqm,
        covered_area_sqm: parsed.covered_area_sqm ?? 0,
        bedrooms: parsed.bedrooms,
        bathrooms: parsed.bathrooms,
        parking: parsed.parking ?? 0,
        antiquity: parsed.antiquity ?? 0,
        description: parsed.description,
        localImageUris: parsed.images,
        features: parsed.features,
        phone: parsed.phone ?? '',
      };

      return { id: parsed.id, status: parsed.status, draft };
    } catch (e) {
      console.warn('Failed to parse housing data for editing', e);
      return null;
    }
  }, [data]);

  if (!propertyData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.centerText}>Cargando datos de la propiedad...</Text>
      </View>
    );
  }

  if (propertyData.status === 'pending') {
    return (
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={36} color={Colors.warning} />
        </View>
        <Text style={styles.blockedTitle}>Publicación en revisión</Text>
        <Text style={styles.blockedBody}>
          Tu anuncio está siendo revisado por nuestro equipo. No puedes editarlo mientras esté pendiente de aprobación.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.backButtonText}>Volver atrás</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <PublishWizard initialDraft={propertyData.draft} propertyId={propertyData.id} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  centerText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.warning + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  blockedBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: Colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
