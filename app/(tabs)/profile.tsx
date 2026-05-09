/**
 * @layer app (pages)
 * @description User profile page with current home, workplace info and mini-map.
 */

import type { Workplace } from "@/entities/workplace/api/workplace.api";
import {
  useCreateWorkplace,
  useDeleteWorkplace,
  useUpdateWorkplace,
  useWorkplaces,
} from "@/entities/workplace/model/useWorkplaces";
import {
  fetchPreferences,
  useCreatePreference,
  useUpdatePreference,
} from "@/entities/recommendation-preferences";
import { useAuth } from "@/features/auth";
import { updateProfile } from "@/features/auth/api/auth.service";
import {
  reverseAddress,
  searchAddress,
  type GeocodeSuggestion,
} from "@/shared/api/geocode.service";
import { Colors } from "@/shared/config/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MapPickerModal } from "@/widgets/location-picker/MapPickerModal";
import { AddWorkplaceModal } from "@/widgets/workplace/ui/AddWorkplaceModal";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from '@react-native-community/slider';
import MapView, { Region } from "react-native-maps";

type TransportOption = "driving" | "cycling" | "walking";
const TRANSPORT_OPTIONS: TransportOption[] = ["driving", "cycling", "walking"];
const TRANSPORT_LABELS: Record<TransportOption, string> = {
  driving: "Auto",
  cycling: "Bicicleta",
  walking: "Caminando",
};
const TRANSPORT_ICONS: Record<TransportOption, string> = {
  driving: "car-outline",
  cycling: "bicycle-outline",
  walking: "walk-outline",
};

const LIMA_REGION: Region = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

interface AddressState {
  query: string;
  suggestions: GeocodeSuggestion[];
  selected: GeocodeSuggestion | null;
  isSearching: boolean;
}
const EMPTY_ADDR: AddressState = {
  query: "",
  suggestions: [],
  selected: null,
  isSearching: false,
};

export default function ProfileScreen() {
  const { user, logout, refreshUser, setHome } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const createWorkplace = useCreateWorkplace();
  const deleteWorkplace = useDeleteWorkplace();
  const updateWorkplaceMutation = useUpdateWorkplace();
  const createPreferenceMutation = useCreatePreference();
  const updatePreferenceMutation = useUpdatePreference();

  // ── Add Workplace ────────────────────────────────────────────────
  const [isAddWpVisible, setIsAddWpVisible] = useState(false);

  // ── Edit Workplace ───────────────────────────────────────────────
  const [editingWp, setEditingWp] = useState<Workplace | null>(null);
  const [editWpBudget, setEditWpBudget] = useState("");
  const [transport, setTransport] = useState<TransportOption>("driving");
  const [editMaxDistKm, setEditMaxDistKm] = useState(10);
  const [editWpAddr, setEditWpAddr] = useState<AddressState>(EMPTY_ADDR);
  const [editWpMapVisible, setEditWpMapVisible] = useState(false);
  const [editWpMapRegion, setEditWpMapRegion] = useState<Region>(LIMA_REGION);
  const [editWpMapReversing, setEditWpMapReversing] = useState(false);
  const editWpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Edit Home ────────────────────────────────────────────────────
  const [isEditHomeVisible, setIsEditHomeVisible] = useState(false);
  const [homeAddr, setHomeAddr] = useState<AddressState>(EMPTY_ADDR);
  const [homeMapVisible, setHomeMapVisible] = useState(false);
  const [homeMapRegion, setHomeMapRegion] = useState<Region>(LIMA_REGION);
  const [homeMapReversing, setHomeMapReversing] = useState(false);
  const [isSavingHome, setIsSavingHome] = useState(false);
  const homeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Edit Profile ─────────────────────────────────────────────────
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // ── Generic address search handler ──────────────────────────────
  const makeSearchHandler =
    (
      setter: React.Dispatch<React.SetStateAction<AddressState>>,
      timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    ) =>
    (text: string) => {
      setter((p) => ({ ...p, query: text, selected: null }));
      if (timer.current) clearTimeout(timer.current);
      if (text.trim().length < 3) {
        setter((p) => ({ ...p, suggestions: [] }));
        return;
      }
      setter((p) => ({ ...p, isSearching: true }));
      timer.current = setTimeout(async () => {
        try {
          const results = await searchAddress(text);
          setter((p) => ({ ...p, suggestions: results, isSearching: false }));
        } catch {
          setter((p) => ({ ...p, isSearching: false }));
        }
      }, 400);
    };

  const selectAddress =
    (setter: React.Dispatch<React.SetStateAction<AddressState>>) =>
    (s: GeocodeSuggestion) => {
      setter({
        query: s.display_name.split(",")[0].trim(),
        suggestions: [],
        selected: s,
        isSearching: false,
      });
    };

  // ── Derived handlers ─────────────────────────────────────────────
  const handleEditWpSearch = useCallback(
    makeSearchHandler(setEditWpAddr, editWpTimer),
    [],
  );
  const handleEditWpSelect = useCallback(selectAddress(setEditWpAddr), []);
  const handleHomeSearch = useCallback(
    makeSearchHandler(setHomeAddr, homeTimer),
    [],
  );
  const handleHomeSelect = useCallback(selectAddress(setHomeAddr), []);

  const closeAddWp = useCallback(() => {
    setIsAddWpVisible(false);
  }, []);

  const openEditWp = useCallback(async (wp: Workplace) => {
    setEditingWp(wp);
    // Pre-fill address field with current workplace address
    setEditWpAddr({
      query: wp.work_address,
      suggestions: [],
      selected: {
        display_name: wp.work_address,
        latitude: wp.work_lat,
        longitude: wp.work_lon,
        place_type: 'address',
      },
      isSearching: false,
    });
    setEditWpBudget("");
    setTransport("driving");
    setEditMaxDistKm(10);
    // Load preferences for this workplace
    try {
      const prefs = await fetchPreferences(wp.id);
      if (prefs.length > 0) {
        setEditWpBudget(String(prefs[0].budget));
        setTransport(prefs[0].preferred_transportation as TransportOption || "driving");
        setEditMaxDistKm(prefs[0].max_distance_km ?? 10);
      }
    } catch {}
  }, []);

  const openEditHome = useCallback(() => {
    // Pre-fill with the short form of the current address
    const shortAddr =
      user?.home_address?.split(",").slice(0, 2).join(",").trim() ?? "";
    setHomeAddr({ ...EMPTY_ADDR, query: shortAddr });
    setIsEditHomeVisible(true);
  }, [user]);

  const closeEditHome = useCallback(() => {
    setIsEditHomeVisible(false);
    setHomeAddr(EMPTY_ADDR);
  }, []);

  const openEditProfile = useCallback(() => {
    setEditName(user?.name ?? "");
    setEditLastName(user?.last_name ?? "");
    setIsEditProfileVisible(true);
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    setIsEditingSaving(true);
    try {
      await updateProfile({
        name: editName.trim() || undefined,
        last_name: editLastName.trim() || undefined,
      });
      await refreshUser();
      setIsEditProfileVisible(false);
    } catch {
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setIsEditingSaving(false);
    }
  }, [editName, editLastName, refreshUser]);

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconBg}>
            <Ionicons name="person-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.guestTitle}>¡Bienvenido a MiCasita!</Text>
          <Text style={styles.guestSubtitle}>
            Crea una cuenta o inicia sesión para guardar tus lugares de trabajo,
            ver tu historial y acceder a recomendaciones personalizadas.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="log-in-outline"
              size={20}
              color={Colors.textOnPrimary}
            />
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() =>
              router.push({ pathname: "/login", params: { tab: "register" } })
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name="person-add-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.registerBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.guestBenefits}>
          {[
            { icon: "bookmark-outline", text: "Guarda tus lugares de trabajo" },
            {
              icon: "analytics-outline",
              text: "Historial de recomendaciones IA",
            },
            { icon: "home-outline", text: "Configura tu vivienda actual" },
          ].map((item) => (
            <View key={item.icon} style={styles.benefitRow}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Handlers that need `user` ────────────────────────────────────

  const handleSaveWorkplace = async () => {
    if (!editingWp) return;
    const budget = parseFloat(editWpBudget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert("Presupuesto inválido", "Ingresa un presupuesto válido.");
      return;
    }
    try {
      // Update workplace geo data + address
      const newAddress = editWpAddr.selected
        ? editWpAddr.query.trim() || editWpAddr.selected.display_name.split(',')[0].trim()
        : editWpAddr.query.trim() || undefined;
      await updateWorkplaceMutation.mutateAsync({
        id: editingWp.id,
        data: {
          work_address: newAddress,
          ...(editWpAddr.selected
            ? {
                work_lat: editWpAddr.selected.latitude,
                work_lon: editWpAddr.selected.longitude,
              }
            : {}),
        },
      });
      // Update preferences
      const prefs = await fetchPreferences(editingWp.id);
      if (prefs.length > 0) {
        await updatePreferenceMutation.mutateAsync({
          id: prefs[0].id,
          data: {
            budget,
            preferred_transportation: transport,
            max_distance_km: editMaxDistKm,
          }
        });
      } else {
        await createPreferenceMutation.mutateAsync({
          workplace_id: editingWp.id,
          budget,
          preferred_transportation: transport,
          max_distance_km: editMaxDistKm,
        });
      }
      setEditingWp(null);
    } catch {
      Alert.alert("Error", "No se pudo actualizar el lugar de trabajo.");
    }
  };

  const handleSaveHome = async () => {
    if (!homeAddr.selected) {
      Alert.alert("Dirección faltante", "Busca o selecciona una dirección.");
      return;
    }
    setIsSavingHome(true);
    try {
      await setHome({
        home_lat: homeAddr.selected.latitude,
        home_lon: homeAddr.selected.longitude,
        home_address: homeAddr.selected.display_name,
      });
      closeEditHome();
    } catch {
      Alert.alert("Error", "No se pudo actualizar la vivienda.");
    } finally {
      setIsSavingHome(false);
    }
  };

  const confirmDeleteWp = (wp: Workplace) => {
    Alert.alert("Eliminar", `¿Eliminar "${wp.work_address}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          deleteWorkplace.mutate(wp.id);
          setEditingWp(null);
        },
      },
    ]);
  };

  // ── Address field renderer (shared pattern) ──────────────────────
  const renderAddressField = (
    state: AddressState,
    onSearch: (t: string) => void,
    onSelect: (s: GeocodeSuggestion) => void,
    onMapOpen: () => void,
    placeholder = "Buscar dirección...",
  ) => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color={Colors.textMuted}
          style={{ marginLeft: 14 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={state.query}
          onChangeText={onSearch}
        />
        {state.isSearching && (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={{ marginRight: 10 }}
          />
        )}
      </View>
      {state.selected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.selectedBadgeText} numberOfLines={1}>
            Ubicación seleccionada
          </Text>
        </View>
      )}
      {state.suggestions.length > 0 && !state.selected && (
        <View style={styles.suggestionsContainer}>
          {state.suggestions.slice(0, 4).map((item, idx) => (
            <TouchableOpacity
              key={`${item.latitude}-${idx}`}
              style={styles.suggestionItem}
              onPress={() => onSelect(item)}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.orDivider}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>O</Text>
        <View style={styles.orLine} />
      </View>
      <TouchableOpacity style={styles.mapBtn} onPress={onMapOpen}>
        <Ionicons name="map-outline" size={20} color={Colors.primary} />
        <Text style={styles.mapBtnText}>Elegir en el mapa</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile header card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarInitials}>
            <Text style={styles.avatarInitialsText}>
              {user.name
                ? `${user.name[0]}${user.last_name?.[0] ?? ""}`.toUpperCase()
                : user.email[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {user.name
                ? `${user.name} ${user.last_name ?? ""}`.trim()
                : "Usuario"}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileEditBtn}
            onPress={openEditProfile}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Lugares de trabajo */}
        <View style={styles.listSection}>
          <View style={styles.listSectionHeader}>
            <Text style={styles.listSectionLabel}>LUGARES DE TRABAJO</Text>
            <TouchableOpacity
              style={styles.listSectionAdd}
              onPress={() => setIsAddWpVisible(true)}
            >
              <Ionicons name="add" size={12} color={Colors.primary} />
              <Text style={styles.listSectionAddText}>Añadir</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listCard}>
            {workplaces.length === 0 ? (
              <View style={styles.listEmptyRow}>
                <Text style={styles.listEmptyText}>
                  Sin lugares de trabajo. Añade uno.
                </Text>
              </View>
            ) : (
              workplaces.map((wp, i) => (
                <TouchableOpacity
                  key={wp.id}
                  style={[
                    styles.listRow,
                    i < workplaces.length - 1 && styles.listRowDivider,
                  ]}
                  onPress={() => openEditWp(wp)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.listRowIcon,
                      i === 0 && styles.listRowIconPrimary,
                    ]}
                  >
                    <Ionicons
                      name="briefcase"
                      size={16}
                      color={i === 0 ? Colors.textOnPrimary : Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={[styles.listRowTitle, { flexShrink: 1 }]}
                        numberOfLines={1}
                      >
                        {wp.work_address}
                      </Text>
                      {i === 0 && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Principal</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.listRowMeta} numberOfLines={1}>
                      Toca para editar
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Mi vivienda actual */}
        <View style={styles.listSection}>
          <Text style={styles.listSectionLabel}>MI VIVIENDA ACTUAL</Text>
          <View style={[styles.listCard, { marginTop: 8 }]}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={openEditHome}
              activeOpacity={0.7}
            >
              <View style={styles.listRowIcon}>
                <Ionicons name="home" size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listRowTitle} numberOfLines={1}>
                  {user.home_address || "No configurada"}
                </Text>
                <Text style={styles.listRowMeta}>Toca para editar</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ajustes */}
        <View style={styles.listSection}>
          <Text style={styles.listSectionLabel}>AJUSTES</Text>
          <View style={[styles.listCard, { marginTop: 8 }]}>
            {(
              [
                {
                  icon: "bookmark-outline",
                  label: "Favoritos guardados",
                  detail: "0",
                },
                {
                  icon: "time-outline",
                  label: "Historial de búsquedas",
                  detail: null,
                },
                {
                  icon: "notifications-outline",
                  label: "Notificaciones",
                  detail: null,
                },
                {
                  icon: "help-circle-outline",
                  label: "Ayuda y soporte",
                  detail: null,
                },
              ] as const
            ).map((row, i) => (
              <View
                key={row.label}
                style={[styles.listRow, i < 3 && styles.listRowDivider]}
              >
                <View style={styles.listRowIcon}>
                  <Ionicons name={row.icon} size={14} color={Colors.primary} />
                </View>
                <Text style={[styles.listRowTitle, { flex: 1 }]}>
                  {row.label}
                </Text>
                {row.detail && (
                  <Text style={styles.settingDetail}>{row.detail}</Text>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={Colors.textMuted}
                />
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={16} color={Colors.error} />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
        <Text style={styles.footerVersion}>MiCasita · v1.0.0</Text>
      </ScrollView>

      {/* ══ Add Workplace ══════════════════════════════════════════ */}
      <AddWorkplaceModal
        visible={isAddWpVisible}
        onClose={closeAddWp}
      />

      {/* ══ Edit Workplace ═════════════════════════════════════════ */}
      <BottomSheet
        visible={!!editingWp}
        onClose={() => setEditingWp(null)}
        maxHeightRatio={0.56}
      >
        <ScrollView
          style={{ paddingHorizontal: 24 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Editar Lugar de Trabajo</Text>
          {renderAddressField(
            editWpAddr,
            handleEditWpSearch,
            handleEditWpSelect,
            () => setEditWpMapVisible(true),
            "Buscar nueva dirección...",
          )}
          <TextInput
            style={[styles.fieldInput, { marginTop: 8 }]}
            placeholder="Presupuesto Mensual (S/)"
            placeholderTextColor={Colors.textMuted}
            value={editWpBudget}
            onChangeText={setEditWpBudget}
            keyboardType="numeric"
          />
          <View style={[styles.transportRow, { marginBottom: 16 }]}>
            {TRANSPORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.transportChip,
                  transport === opt && styles.transportChipActive,
                ]}
                onPress={() => setTransport(opt)}
              >
                <Ionicons
                  name={TRANSPORT_ICONS[opt] as any}
                  size={18}
                  color={
                    transport === opt
                      ? Colors.textOnPrimary
                      : Colors.primary
                  }
                />
                <Text
                  style={[
                    styles.transportText,
                    transport === opt && styles.transportTextActive,
                  ]}
                >
                  {TRANSPORT_LABELS[opt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Radius slider */}
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.textSecondary }}>Radio de búsqueda</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.primary }}>{editMaxDistKm} km</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={editMaxDistKm}
              onValueChange={setEditMaxDistKm}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: Colors.textMuted }}>1 km</Text>
              <Text style={{ fontSize: 11, color: Colors.textMuted }}>30 km</Text>
            </View>
          </View>

          <View style={[styles.sheetActions, { marginTop: 8 }]}>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setEditingWp(null)}
            >
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetConfirm}
              onPress={handleSaveWorkplace}
              disabled={updateWorkplaceMutation.isPending}
            >
              {updateWorkplaceMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sheetConfirmText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
          {editingWp && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => editingWp && confirmDeleteWp(editingWp)}
            >
              <Ionicons name="trash-outline" size={15} color={Colors.error} />
              <Text style={styles.deleteBtnText}>
                Eliminar lugar de trabajo
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <MapPickerModal
          visible={editWpMapVisible}
          onClose={() => setEditWpMapVisible(false)}
          title="Editar ubicación"
          instruction="Ubica el nuevo punto de trabajo en el mapa"
          initialRegion={editingWp ? {
            latitude: editingWp.work_lat,
            longitude: editingWp.work_lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : undefined}
          onConfirm={(s) => {
            handleEditWpSelect(s);
            setEditWpMapVisible(false);
          }}
        />
      </BottomSheet>

      {/* ══ Edit Home ══════════════════════════════════════════════ */}
      <BottomSheet
        visible={isEditHomeVisible}
        onClose={closeEditHome}
        maxHeightRatio={0.8}
      >
        <ScrollView
          style={{ paddingHorizontal: 24 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Mi Vivienda Actual</Text>
          {renderAddressField(
            homeAddr,
            handleHomeSearch,
            handleHomeSelect,
            () => setHomeMapVisible(true),
          )}
          <View style={[styles.sheetActions, { marginTop: 8 }]}>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={closeEditHome}
            >
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetConfirm}
              onPress={handleSaveHome}
              disabled={isSavingHome}
            >
              {isSavingHome ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sheetConfirmText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        <MapPickerModal
          visible={homeMapVisible}
          onClose={() => setHomeMapVisible(false)}
          title="Ubicación de tu casa"
          instruction="Ubica tu vivienda actual en el mapa"
          onConfirm={(s) => {
            handleHomeSelect(s);
            setHomeMapVisible(false);
          }}
        />
      </BottomSheet>

      {/* ══ Edit Profile ═══════════════════════════════════════════ */}
      <BottomSheet
        visible={isEditProfileVisible}
        onClose={() => setIsEditProfileVisible(false)}
      >
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text style={styles.sheetTitle}>Editar Perfil</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Nombre"
            placeholderTextColor={Colors.textMuted}
            value={editName}
            onChangeText={setEditName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.fieldInput, { marginTop: 12 }]}
            placeholder="Apellido"
            placeholderTextColor={Colors.textMuted}
            value={editLastName}
            onChangeText={setEditLastName}
            autoCapitalize="words"
          />
          <View style={[styles.sheetActions, { marginTop: 24 }]}>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setIsEditProfileVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetConfirm}
              onPress={handleSaveProfile}
              disabled={isEditingSaving}
            >
              {isEditingSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sheetConfirmText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Guest
  guestContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: "center",
  },
  guestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  guestIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "12",
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  registerBtnText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  guestBenefits: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitText: { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },

  // Profile card
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarInitials: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  profileName: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profileEditBtn: { padding: 8 },

  // List sections
  listSection: { marginBottom: 14 },
  listSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  listSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  listSectionAdd: { flexDirection: "row", alignItems: "center", gap: 4 },
  listSectionAddText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowIconPrimary: { backgroundColor: Colors.primary },
  listRowTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  listRowMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  primaryBadge: {
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: "600", color: Colors.success },
  listEmptyRow: { padding: 16, alignItems: "center" },
  listEmptyText: { fontSize: 13, color: Colors.textMuted },
  settingDetail: { fontSize: 13, color: Colors.textSecondary, marginRight: 4 },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },
  logoutBtnText: { fontSize: 14, fontWeight: "600", color: Colors.error },
  footerVersion: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 20,
  },

  // BottomSheet shared
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  sectionSublabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  sheetActions: { flexDirection: "row", gap: 12 },
  sheetCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 15,
  },
  sheetConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  sheetConfirmText: {
    color: Colors.textOnPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "600", color: Colors.error },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    marginTop: -4,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionText: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.success + "15",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    marginTop: -4,
    alignSelf: "flex-start",
  },
  selectedBadgeText: { fontSize: 12, color: Colors.success, fontWeight: "600" },
  orDivider: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: {
    marginHorizontal: 14,
    color: Colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "15",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    marginBottom: 16,
  },
  mapBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },

  // Form fields
  fieldInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  transportRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  transportChip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transportChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  transportText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },

  // Map Picker
  mapPin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -22,
    marginTop: -44,
  },
  mapBottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  mapInstruction: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  mapActions: { flexDirection: "row", gap: 12 },
  mapCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapCancelText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 15,
  },
  mapConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  mapConfirmText: {
    color: Colors.textOnPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
});
