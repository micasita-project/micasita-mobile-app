/**
 * @layer app (pages)
 * @description Ruta modal para editar una vivienda existente.
 */

import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PublishWizard } from '@/features/publish-housing';
import type { Housing, HousingDraft } from '@/shared/types';
import { Colors } from '@/shared/config/colors';

export default function EditHousingScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();

  const propertyData = useMemo(() => {
    if (!data) return null;
    try {
      const parsed = JSON.parse(data) as Housing;
      
      // Map Housing to HousingDraft
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
      };

      return {
        id: parsed.id,
        draft,
      };
    } catch (e) {
      console.warn('Failed to parse housing data for editing', e);
      return null;
    }
  }, [data]);

  if (!propertyData) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.errorText}>Cargando datos de la propiedad...</Text>
      </View>
    );
  }

  return <PublishWizard initialDraft={propertyData.draft} propertyId={propertyData.id} />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
