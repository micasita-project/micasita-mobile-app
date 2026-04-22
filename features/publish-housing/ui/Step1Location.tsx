/**
 * @layer features/publish-housing/ui
 * @description Paso 1 — Ubicación de la vivienda (HU17).
 * El usuario ingresa dirección, selecciona distrito de Lima
 * y puede ingresar coordenadas manualmente.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import type { HousingDraft } from '@/shared/types';

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
}

export function Step1Location({ data, onChange }: Step1LocationProps) {
  const [showDistricts, setShowDistricts] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Dirección exacta</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Ej: Av. Caminos del Inca 1250, Piso 8"
          placeholderTextColor={Colors.textMuted}
          value={data.address}
          onChangeText={(v) => onChange({ address: v })}
          returnKeyType="done"
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Distrito</Text>
      <TouchableOpacity
        style={styles.districtSelector}
        onPress={() => setShowDistricts(!showDistricts)}
        activeOpacity={0.8}
      >
        <Text style={data.district ? styles.districtText : styles.districtPlaceholder}>
          {data.district || 'Selecciona un distrito'}
        </Text>
        <Ionicons
          name={showDistricts ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {showDistricts && (
        <ScrollView style={styles.districtList} nestedScrollEnabled={true}>
          {LIMA_DISTRICTS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.districtItem, data.district === d && styles.districtItemActive]}
              onPress={() => {
                onChange({ district: d });
                setShowDistricts(false);
              }}
            >
              <Text style={[styles.districtItemText, data.district === d && styles.districtItemTextActive]}>
                {d}
              </Text>
              {data.district === d && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Ubicación en el Mapa</Text>
      <Text style={styles.hint}>
        Mantén presionado y arrastra el pin rojo, o toca el mapa para ubicar la vivienda.
      </Text>
      
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: data.latitude || -12.0464,
            longitude: data.longitude || -77.0428,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            onChange({ latitude, longitude });
          }}
        >
          <Marker
            coordinate={{
              latitude: data.latitude || -12.0464,
              longitude: data.longitude || -77.0428,
            }}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onChange({ latitude, longitude });
            }}
          />
        </MapView>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Coordenadas</Text>
      <View style={styles.coordRow}>
        <View style={[styles.inputWrapper, { flex: 1, backgroundColor: Colors.background }]}>
          <Text style={styles.coordLabel}>Latitud</Text>
          <TextInput
            style={[styles.input, styles.coordInput, { color: Colors.textMuted }]}
            placeholder="-12.0464"
            placeholderTextColor={Colors.textMuted}
            value={data.latitude.toString()}
            editable={false}
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.inputWrapper, { flex: 1, backgroundColor: Colors.background }]}>
          <Text style={styles.coordLabel}>Longitud</Text>
          <TextInput
            style={[styles.input, styles.coordInput, { color: Colors.textMuted }]}
            placeholder="-77.0428"
            placeholderTextColor={Colors.textMuted}
            value={data.longitude.toString()}
            editable={false}
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
        <Text style={styles.infoText}>
          Las coordenadas permiten calcular tiempos de viaje hacia centros de trabajo.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 12 },
  districtSelector: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  districtText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  districtPlaceholder: { fontSize: 15, color: Colors.textMuted },
  districtList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    maxHeight: 240,
    overflow: 'hidden',
  },
  districtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  districtItemActive: { backgroundColor: Colors.primaryLight + '15' },
  districtItemText: { fontSize: 14, color: Colors.textPrimary },
  districtItemTextActive: { color: Colors.primary, fontWeight: '600' },
  coordRow: { flexDirection: 'row' },
  coordLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  coordInput: { paddingVertical: 8 },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 10 },
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
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
});
