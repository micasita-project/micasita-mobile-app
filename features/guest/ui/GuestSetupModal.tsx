/**
 * @layer features/guest/ui
 * @description Modal de configuración para modo invitado.
 * - Pre-rellena con datos existentes al editar.
 * - Soporta búsqueda por texto y selección en mapa.
 * - Incluye slider de radio de búsqueda (max_distance_km).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { MapPickerModal } from '@/widgets/location-picker/MapPickerModal';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { searchAddress, reverseAddress, type GeocodeSuggestion } from '@/shared/api/geocode.service';
import { Colors } from '@/shared/config/colors';
import { LIMA_REGION } from '@/shared/config/map';
import { TRANSPORT_MODE_CONFIG } from '@/shared/config/transport';
import { useGuest, type GuestHome, type GuestWorkplace, type TransportOption } from '../model/GuestContext';
import { useGuestRecommendations } from '@/features/recommendation/model/useRecommendations';

const KM_MIN = 1;
const KM_MAX = 30;
const DEFAULT_KM = 10;
const DEFAULT_LIMIT = 20;

interface AddressField {
  query: string;
  suggestions: GeocodeSuggestion[];
  selected: GeocodeSuggestion | null;
  isSearching: boolean;
}
const EMPTY_FIELD: AddressField = { query: '', suggestions: [], selected: null, isSearching: false };

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── Radius Slider ─────────────────────────────────────────────────
function RadiusSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.label}>Radio de búsqueda</Text>
        <Text style={sliderStyles.value}>{value} km</Text>
      </View>
      <Slider
        style={sliderStyles.slider}
        minimumValue={KM_MIN}
        maximumValue={KM_MAX}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={Colors.primary}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.primary}
      />
      <View style={sliderStyles.rangeRow}>
        <Text style={sliderStyles.rangeLabel}>{KM_MIN} km</Text>
        <Text style={sliderStyles.rangeLabel}>{KM_MAX} km</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  slider: { width: '100%', height: 40 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
  rangeLabel: { fontSize: 11, color: Colors.textMuted },
});

// ── Main Component ────────────────────────────────────────────────
export function GuestSetupModal({ visible, onClose }: Props) {
  const { guestHome, guestWorkplace, setGuestHome, setGuestWorkplace, saveGuestRecommendations } = useGuest();
  const guestMutation = useGuestRecommendations();

  const [step, setStep] = useState<'home' | 'work'>('home');
  const [home, setHome] = useState<AddressField>(EMPTY_FIELD);
  const [work, setWork] = useState<AddressField>(EMPTY_FIELD);
  const [budget, setBudget] = useState('');
  const [transport, setTransport] = useState<TransportOption>(guestWorkplace?.transport ?? 'driving');
  const [maxDistanceKm, setMaxDistanceKm] = useState(DEFAULT_KM);
  const [isSaving, setIsSaving] = useState(false);

  // Map picker state
  const [mapTarget, setMapTarget] = useState<'home' | 'work' | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(LIMA_REGION);
  const [isReversing, setIsReversing] = useState(false);

  const homeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill with existing data when opening for edit
  useEffect(() => {
    if (!visible) return;
    if (guestHome) {
      setHome({
        query: guestHome.address.split(',')[0].trim(),
        suggestions: [],
        selected: {
          display_name: guestHome.address,
          latitude: guestHome.lat,
          longitude: guestHome.lon,
          place_type: 'address',
        },
        isSearching: false,
      });
    }
    if (guestWorkplace) {
      setWork({
        query: guestWorkplace.address.split(',')[0].trim(),
        suggestions: [],
        selected: {
          display_name: guestWorkplace.address,
          latitude: guestWorkplace.lat,
          longitude: guestWorkplace.lon,
          place_type: 'address',
        },
        isSearching: false,
      });
      setBudget(String(guestWorkplace.budget));
      setTransport(guestWorkplace.transport);
      setMaxDistanceKm(guestWorkplace.maxDistanceKm ?? DEFAULT_KM);
      // Start at step 1 always so user sees full flow
      setStep('home');
    }
  }, [visible]);

  // ── Address search ─────────────────────────────────────────────
  const handleSearch = useCallback((text: string, field: 'home' | 'work') => {
    const setter = field === 'home' ? setHome : setWork;
    const timer = field === 'home' ? homeTimer : workTimer;
    setter((prev) => ({ ...prev, query: text, selected: null }));
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 3) {
      setter((prev) => ({ ...prev, suggestions: [] }));
      return;
    }
    setter((prev) => ({ ...prev, isSearching: true }));
    timer.current = setTimeout(async () => {
      try {
        const results = await searchAddress(text);
        setter((prev) => ({ ...prev, suggestions: results, isSearching: false }));
      } catch {
        setter((prev) => ({ ...prev, isSearching: false }));
      }
    }, 400);
  }, []);

  const handleSelect = useCallback((suggestion: GeocodeSuggestion, field: 'home' | 'work') => {
    const setter = field === 'home' ? setHome : setWork;
    setter({ query: suggestion.display_name.split(',')[0].trim(), suggestions: [], selected: suggestion, isSearching: false });
  }, []);

  // ── Map picker ─────────────────────────────────────────────────
  const handleConfirmMap = async () => {
    setIsReversing(true);
    try {
      const suggestion = await reverseAddress(mapRegion.latitude, mapRegion.longitude);
      handleSelect(suggestion, mapTarget!);
      setMapTarget(null);
    } catch {
      Alert.alert('Error', 'No se pudo obtener la dirección.');
    } finally {
      setIsReversing(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────
  const handleNextStep = () => {
    if (!home.selected) { Alert.alert('Falta dirección', 'Busca y selecciona tu vivienda actual.'); return; }
    setStep('work');
  };

  const handleSave = async () => {
    if (!work.selected) { Alert.alert('Falta dirección', 'Busca y selecciona tu lugar de trabajo.'); return; }
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) { Alert.alert('Presupuesto inválido', 'Ingresa un presupuesto mensual válido.'); return; }

    setIsSaving(true);
    try {
      const homeData: GuestHome = { lat: home.selected!.latitude, lon: home.selected!.longitude, address: home.selected!.display_name };
      const workData: GuestWorkplace = {
        lat: work.selected!.latitude, lon: work.selected!.longitude,
        budget: budgetNum, transport, address: work.selected!.display_name,
        maxDistanceKm, limit: DEFAULT_LIMIT,
      };
      await Promise.all([setGuestHome(homeData), setGuestWorkplace(workData)]);

      // Llamar recomendaciones inmediatamente con los datos recién guardados
      try {
        const items = await guestMutation.mutateAsync({
          work_lat: workData.lat,
          work_lon: workData.lon,
          budget: workData.budget,
          preferred_transportation: workData.transport,
          max_distance_km: workData.maxDistanceKm,
          limit: workData.limit,
          home_lat: homeData.lat,
          home_lon: homeData.lon,
        });
        await saveGuestRecommendations(items);
      } catch {
        // Si falla las recomendaciones igualmente cerramos — los datos ya fueron guardados
      }

      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep('home');
    onClose();
  };

  // ── Address field renderer ────────────────────────────────────
  const renderAddressField = (field: 'home' | 'work') => {
    const state = field === 'home' ? home : work;
    const placeholder = field === 'home' ? 'Ej: Jr. Lima 123, Miraflores' : 'Ej: Av. Javier Prado 1234, San Isidro';
    const mapLabel = field === 'home' ? 'casa' : 'trabajo';

    return (
      <>
        {/* Text search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            value={state.query}
            onChangeText={(t) => handleSearch(t, field)}
          />
          {state.isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />}
        </View>

        {state.selected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.selectedText} numberOfLines={1}>{state.query}</Text>
          </View>
        )}

        {state.suggestions.length > 0 && !state.selected && (
          <View style={styles.suggestionsList}>
            {state.suggestions.slice(0, 4).map((s, i) => (
              <TouchableOpacity
                key={`${s.latitude}-${s.longitude}-${i}`}
                style={styles.suggestionItem}
                onPress={() => handleSelect(s, field)}
              >
                <Ionicons name="location-outline" size={14} color={Colors.primary} />
                <Text style={styles.suggestionText} numberOfLines={2}>{s.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>O</Text>
          <View style={styles.orLine} />
        </View>

        {/* Map button */}
        <TouchableOpacity style={styles.mapBtn} onPress={() => setMapTarget(field)}>
          <Ionicons name="map-outline" size={18} color={Colors.primary} />
          <Text style={styles.mapBtnText}>Elegir {mapLabel} en el mapa</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeightRatio={0.58}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={20} color={Colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Configura tu búsqueda</Text>
            <Text style={styles.subtitle}>
              {step === 'home' ? 'Paso 1 de 2 — Tu vivienda actual' : 'Paso 2 de 2 — Tu lugar de trabajo'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {step === 'home' ? (
            <>
              <Text style={styles.fieldLabel}>Tu vivienda actual</Text>
              {renderAddressField('home')}
              <TouchableOpacity
                style={[styles.primaryBtn, !home.selected && styles.btnDisabled]}
                onPress={handleNextStep}
                disabled={!home.selected}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.textOnPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Tu lugar de trabajo</Text>
              {renderAddressField('work')}

              <Text style={styles.fieldLabel}>Presupuesto mensual (S/)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="1500"
                placeholderTextColor={Colors.textMuted}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Transporte preferido</Text>
              <View style={styles.transportRow}>
                {TRANSPORT_MODE_CONFIG.map((cfg) => (
                  <TouchableOpacity
                    key={cfg.id}
                    style={[styles.transportChip, transport === cfg.id && styles.transportActive]}
                    onPress={() => setTransport(cfg.id)}
                  >
                    <Ionicons
                      name={cfg.iconOutline}
                      size={16}
                      color={transport === cfg.id ? Colors.textOnPrimary : Colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.transportText, transport === cfg.id && styles.transportTextActive]}>
                      {cfg.labelFull}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <RadiusSlider value={maxDistanceKm} onChange={setMaxDistanceKm} />

              <View style={styles.row}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep('home')}>
                  <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                  <Text style={styles.backBtnText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }, isSaving && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color={Colors.textOnPrimary} />
                      <Text style={styles.primaryBtnText}>Ver recomendaciones</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        <MapPickerModal
          visible={!!mapTarget}
          onClose={() => setMapTarget(null)}
          title={mapTarget === 'home' ? 'Tu vivienda actual' : 'Tu lugar de trabajo'}
          instruction={`Mueve el mapa para ubicar tu ${mapTarget === 'home' ? 'vivienda actual' : 'lugar de trabajo'}`}
          onConfirm={(s) => {
            handleSelect(s, mapTarget!);
            setMapTarget(null);
          }}
        />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 6,
  },
  searchIcon: { marginLeft: 12 },
  searchInput: { flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 14, color: Colors.textPrimary },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success + '18', padding: 7, borderRadius: 8,
    marginBottom: 10, alignSelf: 'flex-start',
  },
  selectedText: { fontSize: 12, color: Colors.success, fontWeight: '600', maxWidth: 220 },
  suggestionsList: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  suggestionText: { flex: 1, fontSize: 13, color: Colors.textPrimary },

  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: 12, color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary + '12', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: 16,
  },
  mapBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  fieldInput: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
    fontSize: 15, color: Colors.textPrimary, marginBottom: 16,
  },
  transportRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  transportChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.border },
  transportActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  transportText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },

  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },

  // Map picker
  mapPin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -22 },
  mapCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  mapInstruction: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  mapActions: { flexDirection: 'row', gap: 12 },
  mapCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  mapCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  mapConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.primary },
  mapConfirmText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
