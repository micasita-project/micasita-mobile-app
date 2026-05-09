/**
 * @layer features/publish-housing/ui
 * @description Paso 1 — Ubicación de la vivienda (HU17).
 * El usuario ingresa dirección, selecciona distrito de Lima
 * y puede ingresar coordenadas manualmente.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import type { HousingDraft } from '@/shared/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchAddress, reverseAddress, type GeocodeSuggestion } from '@/shared/api/geocode.service';
import { MapPickerModal } from '@/widgets/location-picker/MapPickerModal';


const LIMA_DISTRICTS = [
  'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chorrillos', 'Comas',
  'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria',
  'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar',
  'Miraflores', 'Pachacámac', 'Pueblo Libre', 'Puente Piedra', 'Rimac',
  'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores',
  'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita',
  'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo',
].sort();

const LIMA_REGION: Region = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface Step1LocationProps {
  data: Pick<HousingDraft, 'address' | 'district' | 'latitude' | 'longitude'>;
  onChange: (partial: Partial<HousingDraft>) => void;
}

export function Step1Location({ data, onChange }: Step1LocationProps) {
  const insets = useSafeAreaInsets();
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(LIMA_REGION);
  const [isReversing, setIsReversing] = useState(false);
  
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  const extractDistrict = useCallback((displayName: string) => {
    return LIMA_DISTRICTS.find((d) =>
      displayName.toLowerCase().includes(d.toLowerCase())
    );
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    onChange({ address: text });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddress(text);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, [onChange]);

  const handleSelectAddress = useCallback((item: GeocodeSuggestion) => {
    const detectedDistrict = item.district || extractDistrict(item.display_name) || 'Lima';
    onChange({
      address: item.display_name,
      latitude: item.latitude,
      longitude: item.longitude,
      district: detectedDistrict,
    });
    setSuggestions([]);
    
    // Animate map to new location
    mapRef.current?.animateToRegion({
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  }, [onChange, extractDistrict]);

  const handleConfirmMapLocation = async () => {
    setIsReversing(true);
    try {
      const suggestion = await reverseAddress(mapRegion.latitude, mapRegion.longitude);
      const detectedDistrict = suggestion.district || extractDistrict(suggestion.display_name) || 'Lima';
      onChange({
        address: suggestion.display_name,
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        district: detectedDistrict,
      });
      setShowMapPicker(false);
      
      // Update local map too
      mapRef.current?.animateToRegion({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } catch {
      Alert.alert('Error', 'No se pudo obtener la dirección de esta ubicación.');
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>
        Dirección exacta <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Ej: Av. Caminos del Inca 1250, Piso 8"
          placeholderTextColor={Colors.textMuted}
          value={data.address}
          onChangeText={handleSearchChange}
          returnKeyType="done"
        />
        {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={`${item.latitude}-${idx}`}
              style={styles.suggestionItem}
              onPress={() => handleSelectAddress(item)}
            >
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.orDivider}>
        <View style={styles.line} />
        <Text style={styles.orText}>O</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setShowMapPicker(true)}>
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

      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(suggestion) => {
          const detectedDistrict = suggestion.district || extractDistrict(suggestion.display_name) || 'Lima';
          onChange({
            address: suggestion.display_name,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            district: detectedDistrict,
          });
          setShowMapPicker(false);
          
          // Actualizar mapa local
          mapRef.current?.animateToRegion({
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }}
        initialRegion={data.latitude && data.longitude ? {
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : LIMA_REGION}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  required: { color: Colors.error },
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
  
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  suggestionText: { flex: 1, fontSize: 14, color: Colors.textPrimary },

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

  // Map Picker Modal
  mapCenterPin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -22 },
  modalCloseBtn: {
    position: 'absolute',
    left: 20,
    backgroundColor: Colors.surface,
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    padding: 24,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  modalInstruction: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.primary },
  modalConfirmText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
