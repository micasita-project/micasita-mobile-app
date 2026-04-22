/**
 * @layer features/publish-housing/ui
 * @description Paso 4 — Áreas comunes y servicios extra (HU20).
 * Chips seleccionables de amenidades.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import type { HousingDraft } from '@/shared/types';

interface Amenity {
  label: string;
  icon: string;
}

const AMENITIES: Amenity[] = [
  { label: 'Estacionamiento', icon: 'car-outline' },
  { label: 'Gimnasio', icon: 'barbell-outline' },
  { label: 'Piscina', icon: 'water-outline' },
  { label: 'Zona BBQ', icon: 'flame-outline' },
  { label: 'Seguridad 24/7', icon: 'shield-checkmark-outline' },
  { label: 'Áreas verdes', icon: 'leaf-outline' },
  { label: 'Lavandería', icon: 'shirt-outline' },
  { label: 'Ascensor', icon: 'arrow-up-circle-outline' },
  { label: 'Amoblado', icon: 'bed-outline' },
  { label: 'Servicios incluidos', icon: 'flash-outline' },
  { label: 'WiFi', icon: 'wifi-outline' },
  { label: 'Balcón', icon: 'home-outline' },
  { label: 'Terraza', icon: 'sunny-outline' },
  { label: 'Portería 24h', icon: 'person-outline' },
  { label: 'Cocina americana', icon: 'restaurant-outline' },
  { label: 'Sala de eventos', icon: 'people-outline' },
  { label: 'Jardín', icon: 'flower-outline' },
  { label: 'Cochera doble', icon: 'car-sport-outline' },
  { label: 'Pet friendly', icon: 'paw-outline' },
  { label: 'Vista panorámica', icon: 'eye-outline' },
];

interface Step4AmenitiesProps {
  data: Pick<HousingDraft, 'features'>;
  onChange: (partial: Partial<HousingDraft>) => void;
}

export function Step4Amenities({ data, onChange }: Step4AmenitiesProps) {
  const { features } = data;

  const toggleAmenity = (label: string) => {
    const isSelected = features.includes(label);
    if (isSelected) {
      onChange({ features: features.filter((f) => f !== label) });
    } else {
      onChange({ features: [...features, label] });
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Áreas comunes y servicios</Text>
      <Text style={styles.subtitle}>
        Selecciona todas las amenidades disponibles en tu propiedad.
      </Text>

      <View style={styles.grid}>
        {AMENITIES.map(({ label, icon }) => {
          const isSelected = features.includes(label);
          return (
            <TouchableOpacity
              key={label}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => toggleAmenity(label)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={icon as any}
                size={16}
                color={isSelected ? Colors.textOnPrimary : Colors.textSecondary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {features.length > 0 && (
        <View style={styles.summary}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.summaryText}>
            {features.length} amenidad{features.length !== 1 ? 'es' : ''} seleccionada{features.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
        <Text style={styles.infoText}>
          Las amenidades destacadas ayudan a los usuarios a filtrar y encontrar tu propiedad más fácilmente.
        </Text>
      </View>

      <Text style={styles.finalNote}>
        Al publicar, tu anuncio quedará en estado{' '}
        <Text style={styles.pendingText}>Pendiente</Text>
        {' '}y será revisado en un plazo máximo de 3 días hábiles.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.success + '15',
    borderRadius: 10,
  },
  summaryText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.info + '15',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  finalNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 32,
    lineHeight: 20,
  },
  pendingText: { color: Colors.warning, fontWeight: '700' },
});
