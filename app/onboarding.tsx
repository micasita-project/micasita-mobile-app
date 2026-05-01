/**
 * @layer app (pages)
 * @description Pantalla de onboarding post-registro.
 * Paso 1: Casa actual.
 * Paso 2: Lugar de trabajo principal.
 * Paso 3: Preferencias.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Region } from 'react-native-maps';
import { searchAddress, reverseAddress } from '@/shared/api/geocode.service';
import { useCreateWorkplace } from '@/entities/workplace/model/useWorkplaces';
import { useGenerateRecommendations } from '@/features/recommendation/model/useRecommendations';
import { useAuth } from '@/features/auth';
import { Colors } from '@/shared/config/colors';
import type { GeocodeSuggestion } from '@/shared/api/geocode.service';

type TransportOption = 'Auto' | 'Bicicleta' | 'Caminando';
const TRANSPORT_OPTIONS: TransportOption[] = ['Auto', 'Bicicleta', 'Caminando'];
const TRANSPORT_ICONS: Record<TransportOption, string> = {
  Auto: 'car-outline',
  Bicicleta: 'bicycle-outline',
  Caminando: 'walk-outline',
};

const LIMA_REGION: Region = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function OnboardingScreen() {
  const router = useRouter();
  const createWorkplace = useCreateWorkplace();
  const generateRecs = useGenerateRecommendations();
  const { setHome } = useAuth();

  // Steps
  type Step = 'home' | 'workplace' | 'preferences' | 'loading';
  const [step, setStep] = useState<Step>('home');

  // Search State (shared between home/workplace)
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selected Data
  const [homeAddress, setHomeAddress] = useState<GeocodeSuggestion | null>(null);
  const [workAddress, setWorkAddress] = useState<GeocodeSuggestion | null>(null);
  const [alias, setAlias] = useState('');
  const [budget, setBudget] = useState('');
  const [transport, setTransport] = useState<TransportOption>('Auto');

  // Map Picker State
  const [mapPickerMode, setMapPickerMode] = useState<'home' | 'workplace' | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(LIMA_REGION);
  const [isReversing, setIsReversing] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddress(text);
        setSuggestions(results);
      } catch (error) {
        console.error('Geocode search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectAddress = useCallback(
    (suggestion: GeocodeSuggestion) => {
      setSearchQuery('');
      setSuggestions([]);
      if (step === 'home') {
        setHomeAddress(suggestion);
        setStep('workplace');
      } else if (step === 'workplace') {
        setWorkAddress(suggestion);
        const parts = suggestion.display_name.split(',');
        setAlias(parts.slice(0, 2).join(',').trim());
        setStep('preferences');
      }
    },
    [step]
  );

  const openMapPicker = () => {
    setMapPickerMode(step as 'home' | 'workplace');
  };

  const handleConfirmMapLocation = async () => {
    setIsReversing(true);
    try {
      const suggestion = await reverseAddress(mapRegion.latitude, mapRegion.longitude);
      setMapPickerMode(null);
      handleSelectAddress(suggestion);
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener la dirección de esta ubicación.');
    } finally {
      setIsReversing(false);
    }
  };

  const handleSubmit = async () => {
    if (!homeAddress || !workAddress) return;
    const budgetNum = parseFloat(budget);
    if (!budget.trim() || isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Presupuesto inválido', 'Ingresa un presupuesto mensual válido.');
      return;
    }

    setStep('loading');

    try {
      // 1. Guardar Casa
      await setHome({
        home_lat: homeAddress.latitude,
        home_lon: homeAddress.longitude,
        home_address: homeAddress.display_name,
      });

      // 2. Crear Workplace
      const workplace = await createWorkplace.mutateAsync({
        alias: alias.trim() || 'Mi trabajo',
        work_lat: workAddress.latitude,
        work_lon: workAddress.longitude,
        budget: budgetNum,
        preferred_transportation: transport,
      });

      // 3. Generar primera recomendación con IA
      await generateRecs.mutateAsync({ workplaceId: workplace.id });

      // 4. Ir a la app principal
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setStep('preferences');
      Alert.alert('Error', error?.response?.data?.detail ?? 'Ocurrió un error. Intenta de nuevo.');
    }
  };

  // ── Renders ───────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>Configurando tu perfil...</Text>
          <Text style={styles.loadingSubtitle}>
            Nuestro motor de IA está analizando las mejores viviendas para ti.
            Esto puede tomar unos segundos.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, (step === 'workplace' || step === 'preferences') && styles.stepLineActive]} />
            <View style={[styles.stepDot, (step === 'workplace' || step === 'preferences') && styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 'preferences' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'preferences' && styles.stepDotActive]} />
          </View>
          <Text style={styles.title}>
            {step === 'home' ? 'Tu casa actual' : step === 'workplace' ? '¿Dónde trabajas?' : 'Tus preferencias'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'home'
              ? 'Para calcular tu ahorro en tiempo de viaje, necesitamos saber dónde vives actualmente.'
              : step === 'workplace'
              ? 'Busca la dirección de tu oficina o universidad para encontrar viviendas ideales cerca.'
              : 'Configura tu presupuesto y transporte para recomendaciones personalizadas.'}
          </Text>
        </View>

        {step === 'home' || step === 'workplace' ? (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Ej: Av. Javier Prado 123..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={styles.searchSpinner} />}
            </View>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.latitude}-${item.longitude}-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectAddress(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={18} color={Colors.primary} />
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

            <TouchableOpacity style={styles.mapBtn} onPress={openMapPicker}>
              <Ionicons name="map-outline" size={20} color={Colors.primary} />
              <Text style={styles.mapBtnText}>Elegir en el mapa</Text>
            </TouchableOpacity>

            {step === 'workplace' && (
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('home')}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                <Text style={styles.backButtonText}>Atrás</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* Preferences */}
            <Text style={styles.fieldLabel}>Nombre del lugar de trabajo</Text>
            <TextInput
              style={styles.fieldInput}
              value={alias}
              onChangeText={setAlias}
              placeholder="Ej: Oficina San Isidro"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Presupuesto mensual (S/)</Text>
            <TextInput
              style={styles.fieldInput}
              value={budget}
              onChangeText={setBudget}
              placeholder="1500"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Transporte preferido al trabajo</Text>
            <View style={styles.transportRow}>
              {TRANSPORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.transportChip, transport === opt && styles.transportChipActive]}
                  onPress={() => setTransport(opt)}
                >
                  <Ionicons
                    name={TRANSPORT_ICONS[opt] as any}
                    size={22}
                    color={transport === opt ? Colors.textOnPrimary : Colors.primary}
                  />
                  <Text style={[styles.transportText, transport === opt && styles.transportTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('workplace')}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.primaryButton, styles.primaryButtonFlex]} onPress={handleSubmit} activeOpacity={0.8}>
                <Ionicons name="sparkles" size={18} color={Colors.textOnPrimary} />
                <Text style={styles.primaryButtonText}>Buscar mi vivienda ideal</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={!!mapPickerMode} animationType="slide" transparent={false}>
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={LIMA_REGION}
            onRegionChangeComplete={setMapRegion}
          />
          <View style={styles.mapCenterMarker} pointerEvents="none">
            <Ionicons name="location" size={40} color={Colors.primary} style={{ marginTop: -20 }} />
          </View>

          <View style={styles.mapBottomCard}>
            <Text style={styles.mapInstruction}>
              Mueve el mapa para ubicar tu {mapPickerMode === 'home' ? 'casa' : 'trabajo'}.
            </Text>
            <View style={styles.mapActions}>
              <TouchableOpacity style={styles.mapCancelBtn} onPress={() => setMapPickerMode(null)}>
                <Text style={styles.mapCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapConfirmBtn}
                onPress={handleConfirmMapLocation}
                disabled={isReversing}
              >
                {isReversing ? <ActivityIndicator color="#fff" /> : <Text style={styles.mapConfirmText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  header: { marginBottom: 28 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: { width: 40, height: 3, backgroundColor: Colors.border, marginHorizontal: 8 },
  stepLineActive: { backgroundColor: Colors.primary },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, marginBottom: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 16, fontSize: 15, color: Colors.textPrimary },
  searchSpinner: { marginLeft: 8 },

  suggestionsContainer: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 20, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  suggestionText: { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 20 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: 16, color: Colors.textMuted, fontWeight: '600', fontSize: 14 },

  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary + '15', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: 16,
  },
  mapBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  fieldInput: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 15, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border,
  },
  transportRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  transportChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  transportChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  transportText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },

  primaryButton: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryButtonFlex: { flex: 1, marginTop: 0 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  backButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  backButtonText: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginLeft: 6 },

  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingCard: { backgroundColor: Colors.surface, borderRadius: 24, padding: 40, alignItems: 'center', width: '100%' },
  loadingTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 24, textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 22 },

  // Map Modal
  mapCenterMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 },
  mapBottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  mapInstruction: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  mapActions: { flexDirection: 'row', gap: 12 },
  mapCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
  },
  mapCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  mapConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  mapConfirmText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
