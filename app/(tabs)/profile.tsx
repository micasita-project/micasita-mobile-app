/**
 * @layer app (pages)
 * @description User profile page with current home, workplace info and mini-map.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import { Colors } from '@/shared/config/colors';
import { Button } from '@/shared/ui/Button';
import { useWorkplaces, useCreateWorkplace, useDeleteWorkplace } from '@/entities/workplace/model/useWorkplaces';
import { searchAddress, reverseAddress, type GeocodeSuggestion } from '@/shared/api/geocode.service';

type TransportOption = 'Auto' | 'Bicicleta' | 'Caminando';
const TRANSPORT_OPTIONS: TransportOption[] = ['Auto', 'Bicicleta', 'Caminando'];

const LIMA_REGION: Region = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const createWorkplace = useCreateWorkplace();
  const deleteWorkplace = useDeleteWorkplace();

  // Add Workplace Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [newTransport, setNewTransport] = useState<TransportOption>('Auto');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<GeocodeSuggestion | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map Picker State
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(LIMA_REGION);
  const [isReversing, setIsReversing] = useState(false);

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconBg}>
            <Ionicons name="person-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.guestTitle}>¡Bienvenido a MiCasita!</Text>
          <Text style={styles.guestSubtitle}>
            Crea una cuenta o inicia sesión para guardar tus lugares de trabajo, ver tu historial y acceder a recomendaciones personalizadas.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push({ pathname: '/login', params: { tab: 'register' } })}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
            <Text style={styles.registerBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guestBenefits}>
          {[
            { icon: 'bookmark-outline', text: 'Guarda tus lugares de trabajo' },
            { icon: 'analytics-outline', text: 'Historial de recomendaciones IA' },
            { icon: 'home-outline', text: 'Configura tu vivienda actual' },
          ].map((item) => (
            <View key={item.icon} style={styles.benefitRow}>
              <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Search Handlers ────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setSelectedAddress(null);

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

  const handleSelectAddress = useCallback((suggestion: GeocodeSuggestion) => {
    setSelectedAddress(suggestion);
    setSearchQuery(suggestion.display_name.split(',')[0].trim()); // Set a shorter alias
    setSuggestions([]);
  }, []);

  const handleConfirmMapLocation = async () => {
    setIsReversing(true);
    try {
      const suggestion = await reverseAddress(mapRegion.latitude, mapRegion.longitude);
      setIsMapVisible(false);
      handleSelectAddress(suggestion);
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener la dirección de esta ubicación.');
    } finally {
      setIsReversing(false);
    }
  };

  const handleAddWorkplace = async () => {
    if (!selectedAddress) {
      Alert.alert('Dirección faltante', 'Por favor busca o selecciona una dirección en el mapa.');
      return;
    }

    const budgetNum = parseFloat(newBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Datos inválidos', 'Por favor ingresa un presupuesto válido.');
      return;
    }

    try {
      await createWorkplace.mutateAsync({
        alias: searchQuery.trim() || 'Mi Trabajo',
        work_lat: selectedAddress.latitude,
        work_lon: selectedAddress.longitude,
        budget: budgetNum,
        preferred_transportation: newTransport,
      });
      setIsModalVisible(false);
      setSearchQuery('');
      setSelectedAddress(null);
      setNewBudget('');
      setNewTransport('Auto');
      Alert.alert('Éxito', 'Lugar de trabajo agregado');
    } catch (e) {
      Alert.alert('Error', 'No se pudo agregar el lugar de trabajo');
    }
  };

  const handleDeleteWorkplace = (id: number) => {
    Alert.alert('Eliminar', '¿Estás seguro que deseas eliminar este lugar de trabajo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', onPress: () => deleteWorkplace.mutate(id), style: 'destructive' }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={36} color={Colors.textOnPrimary} />
        </View>
        <Text style={styles.userName}>{user.email}</Text>
      </View>

      {/* Home Address */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Mi Casa</Text>
        </View>
        <Text style={styles.infoValue}>{user.home_address || 'No configurada'}</Text>
      </View>

      {/* Workplaces */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="briefcase" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Mis Lugares de Trabajo</Text>
        </View>
        
        {workplaces.map(wp => (
          <View key={wp.id} style={styles.workplaceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wpAlias}>{wp.alias}</Text>
              <Text style={styles.wpMeta}>S/{wp.budget} • {wp.preferred_transportation}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteWorkplace(wp.id)}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addButtonText}>Añadir Workplace</Text>
        </TouchableOpacity>
      </View>

      <Button title="Cerrar Sesión" onPress={logout} variant="outline" style={styles.logoutButton} />

      {/* Add Workplace Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        {isMapVisible ? (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
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
                Mueve el mapa para ubicar tu lugar de trabajo.
              </Text>
              <View style={styles.mapActions}>
                <TouchableOpacity style={styles.mapCancelBtn} onPress={() => setIsMapVisible(false)}>
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
        ) : (
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => {
              setIsModalVisible(false);
              setSuggestions([]);
            }}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%' }}
            >
              <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Nuevo Lugar de Trabajo</Text>

                {/* Autocomplete Input with Map Button */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginLeft: 14 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Dirección o nombre..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                  />
                  {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />}
                  <TouchableOpacity style={styles.mapIconBtn} onPress={() => setIsMapVisible(true)}>
                    <Ionicons name="map-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Selected Address Indicator */}
                {selectedAddress && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.selectedBadgeText} numberOfLines={1}>
                      Ubicación seleccionada
                    </Text>
                  </View>
                )}

                {/* Suggestions List */}
                {suggestions.length > 0 && !selectedAddress && (
                  <View style={styles.suggestionsContainer}>
                    {suggestions.slice(0, 3).map((item, index) => (
                      <TouchableOpacity
                        key={`${item.latitude}-${item.longitude}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectAddress(item)}
                      >
                        <Ionicons name="location-outline" size={16} color={Colors.primary} />
                        <Text style={styles.suggestionText} numberOfLines={1}>{item.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Presupuesto Mensual"
                  placeholderTextColor={Colors.textMuted}
                  value={newBudget}
                  onChangeText={setNewBudget}
                  keyboardType="numeric"
                />

                <View style={styles.transportRow}>
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.transportChip, newTransport === opt && styles.transportChipActive]}
                      onPress={() => setNewTransport(opt)}
                    >
                      <Text style={[styles.transportText, newTransport === opt && styles.transportTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setIsModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalConfirm} onPress={handleAddWorkplace} disabled={createWorkplace.isPending}>
                    {createWorkplace.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Añadir</Text>}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        )}
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Guest screen
  guestContainer: { flex: 1, backgroundColor: Colors.background, padding: 20, justifyContent: 'center' },
  guestCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  guestIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  guestTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  guestSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
    width: '100%', marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary + '12', borderRadius: 14, paddingVertical: 15,
    width: '100%', borderWidth: 1.5, borderColor: Colors.primary,
  },
  registerBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  guestBenefits: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20, gap: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  profileCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatarContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  userName: { fontSize: 22, fontWeight: '800', color: Colors.textOnPrimary },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  infoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  workplaceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  wpAlias: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  wpMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, padding: 12, backgroundColor: Colors.primary + '15', borderRadius: 12 },
  addButtonText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  logoutButton: { marginTop: 8 },
  
  // Create Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  fieldInput: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  transportRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  transportChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  transportChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  transportText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.primary },
  modalConfirmText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },

  // Search Input inside Modal
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: Colors.textPrimary },
  mapIconBtn: { padding: 12, borderLeftWidth: 1, borderLeftColor: Colors.border },
  suggestionsContainer: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, marginTop: -10, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  suggestionText: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '15', padding: 8, borderRadius: 8, marginBottom: 16, marginTop: -10, alignSelf: 'flex-start' },
  selectedBadgeText: { fontSize: 12, color: Colors.success, fontWeight: '600' },

  // Map Picker Modal
  mapCenterMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 },
  mapBottomCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  mapInstruction: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  mapActions: { flexDirection: 'row', gap: 12 },
  mapCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  mapCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  mapConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.primary },
  mapConfirmText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
