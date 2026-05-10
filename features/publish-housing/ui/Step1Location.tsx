/**
 * @layer features/publish-housing/ui
 * @description Paso 1 — Ubicación de la vivienda (HU17).
 * El usuario ingresa dirección, selecciona distrito de Lima
 * y puede ingresar coordenadas manualmente.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import type { HousingDraft } from '@/shared/types';
import { AddressSearchInput } from '@/shared/ui/AddressSearchInput';
import type { GeocodeSuggestion } from '@/shared/api/geocode.service';

const LIMA_DISTRICTS = [
  'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chorrillos', 'Comas',
  'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria',
  'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar',
  'Miraflores', 'Pachacámac', 'Pueblo Libre', 'Puente Piedra', 'Rimac',
  'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores',
  'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita',
  'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo',
].sort();

interface Step1LocationProps {
  data: Pick<HousingDraft, 'address' | 'district' | 'latitude' | 'longitude'>;
  onChange: (partial: Partial<HousingDraft>) => void;
  onOpenMapPicker: () => void;
}

export function Step1Location({ data, onChange, onOpenMapPicker }: Step1LocationProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (data.latitude && data.longitude) {
      mapRef.current?.animateToRegion({
        latitude: data.latitude,
        longitude: data.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [data.latitude, data.longitude]);

  const extractDistrict = useCallback((displayName: string) => {
    return LIMA_DISTRICTS.find((d) =>
      displayName.toLowerCase().includes(d.toLowerCase())
    );
  }, []);

  const handleSelect = useCallback((item: GeocodeSuggestion) => {
    const detectedDistrict = item.district || extractDistrict(item.display_name) || 'Lima';
    onChange({
      address: item.display_name,
      latitude: item.latitude,
      longitude: item.longitude,
      district: detectedDistrict,
    });
  }, [onChange, extractDistrict]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>
        Dirección exacta <Text style={styles.required}>*</Text>
      </Text>

      <AddressSearchInput
        value={data.address}
        onChangeText={(text) => onChange({ address: text })}
        onSelect={handleSelect}
        placeholder="Ej: Av. Caminos del Inca 1250, Piso 8"
      />

      <View style={styles.orDivider}>
        <View style={styles.line} />
        <Text style={styles.orText}>O</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.mapPickerBtn} onPress={onOpenMapPicker}>
        <Ionicons name="map-outline" size={20} color={Colors.primary} />
        <Text style={styles.mapPickerBtnText}>Elegir en el mapa</Text>
      </TouchableOpacity>

      {data.address.trim().length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Ubicación en el Mapa
          </Text>

          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={{
                latitude: data.latitude,
                longitude: data.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{
                  latitude: data.latitude,
                  longitude: data.longitude,
                }}
              />
            </MapView>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.infoText}>
              La ubicación precisa permite calcular tiempos de viaje reales para los interesados.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  required: { color: Colors.error },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: {
    marginHorizontal: 16,
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '15',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  mapPickerBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.info + '15',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  map: { flex: 1 },
});
