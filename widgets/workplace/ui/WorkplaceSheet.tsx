/**
 * @layer widgets/workplace/ui
 * @description Unified sheet for adding and editing workplaces.
 */

import {
  useCreatePreference,
  usePreferences,
  useUpdatePreference,
} from "@/entities/recommendation-preferences";
import type { Workplace } from "@/entities/workplace/api/workplace.api";
import {
  useCreateWorkplace,
  useDeleteWorkplace,
  useUpdateWorkplace,
} from "@/entities/workplace/model/useWorkplaces";
import {
  searchAddress,
  type GeocodeSuggestion,
} from "@/shared/api/geocode.service";
import { Colors } from "@/shared/config/colors";
import { TRANSPORT_MODE_CONFIG } from "@/shared/config/transport";
import type { TransportMode } from "@/shared/types";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { MapPickerModal } from "@/widgets/location-picker/MapPickerModal";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

interface WorkplaceSheetProps {
  visible: boolean;
  workplace?: Workplace | null;
  onClose: () => void;
  onSuccess?: () => void;
  allowDelete?: boolean;
}

function normalizeTransport(value?: string | null): TransportMode {
  if (value === "driving" || value === "cycling" || value === "walking")
    return value;
  if (value === "Auto") return "driving";
  if (value === "Bicicleta") return "cycling";
  if (value === "Caminando") return "walking";
  return "driving";
}

export function WorkplaceSheet({
  visible,
  workplace,
  onClose,
  onSuccess,
  allowDelete = false,
}: WorkplaceSheetProps) {
  const createWorkplace = useCreateWorkplace();
  const updateWorkplace = useUpdateWorkplace();
  const deleteWorkplace = useDeleteWorkplace();
  const createPreferenceMutation = useCreatePreference();
  const updatePreferenceMutation = useUpdatePreference();

  const isEdit = !!workplace;

  const { data: preferences = [] } = usePreferences(
    isEdit ? (workplace?.id ?? null) : null,
  );
  const activePreference = preferences[0];

  const [addr, setAddr] = useState<AddressState>(EMPTY_ADDR);
  const [budget, setBudget] = useState("");
  const [transport, setTransport] = useState<TransportMode>("driving");
  const [maxDistKm, setMaxDistKm] = useState(10);
  const [mapVisible, setMapVisible] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefAppliedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      prefAppliedRef.current = false;
      return;
    }

    if (!workplace) {
      setAddr(EMPTY_ADDR);
      setBudget("");
      setTransport("driving");
      setMaxDistKm(10);
      prefAppliedRef.current = false;
      return;
    }

    if (workplace) {
      setAddr({
        query: workplace.work_address,
        suggestions: [],
        selected: {
          display_name: workplace.work_address,
          latitude: workplace.work_lat,
          longitude: workplace.work_lon,
          place_type: "address",
        },
        isSearching: false,
      });
      setBudget("");
      setTransport("driving");
      setMaxDistKm(10);
      prefAppliedRef.current = false;
    }
  }, [visible, workplace?.id]);

  useEffect(() => {
    if (!visible || !isEdit || prefAppliedRef.current) return;
    if (!activePreference) return;

    setBudget(String(activePreference.budget));
    setTransport(normalizeTransport(activePreference.preferred_transportation));
    setMaxDistKm(activePreference.max_distance_km ?? 10);
    prefAppliedRef.current = true;
  }, [visible, isEdit, activePreference]);

  const handleClose = useCallback(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setMapVisible(false);
    setAddr(EMPTY_ADDR);
    setBudget("");
    setTransport("driving");
    setMaxDistKm(10);
    onClose();
  }, [onClose]);

  const handleSearch = useCallback((text: string) => {
    setAddr((p) => ({ ...p, query: text, selected: null }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 3) {
      setAddr((p) => ({ ...p, suggestions: [] }));
      return;
    }
    setAddr((p) => ({ ...p, isSearching: true }));
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchAddress(text);
        setAddr((p) => ({ ...p, suggestions: results, isSearching: false }));
      } catch {
        setAddr((p) => ({ ...p, isSearching: false }));
      }
    }, 400);
  }, []);

  const handleSelect = useCallback((s: GeocodeSuggestion) => {
    setAddr({
      query: s.display_name.split(",")[0].trim(),
      suggestions: [],
      selected: s,
      isSearching: false,
    });
  }, []);

  const handleSubmit = async () => {
    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      Alert.alert("Presupuesto invalido", "Ingresa un presupuesto valido.");
      return;
    }

    if (!isEdit && !addr.selected) {
      Alert.alert("Direccion faltante", "Busca o selecciona una direccion.");
      return;
    }

    try {
      if (isEdit && workplace) {
        const newAddress = addr.selected
          ? addr.query.trim() || addr.selected.display_name.split(",")[0].trim()
          : addr.query.trim() || undefined;
        const updateData = {
          ...(newAddress ? { work_address: newAddress } : {}),
          ...(addr.selected
            ? {
                work_lat: addr.selected.latitude,
                work_lon: addr.selected.longitude,
              }
            : {}),
        };

        if (Object.keys(updateData).length > 0) {
          await updateWorkplace.mutateAsync({
            id: workplace.id,
            data: updateData,
          });
        }

        if (activePreference) {
          await updatePreferenceMutation.mutateAsync({
            id: activePreference.id,
            data: {
              budget: parsedBudget,
              preferred_transportation: transport,
              max_distance_km: maxDistKm,
            },
          });
        } else {
          await createPreferenceMutation.mutateAsync({
            workplace_id: workplace.id,
            budget: parsedBudget,
            preferred_transportation: transport,
            max_distance_km: maxDistKm,
          });
        }
      } else {
        const wp = await createWorkplace.mutateAsync({
          work_address: addr.query.trim() || "Mi Trabajo",
          work_lat: addr.selected!.latitude,
          work_lon: addr.selected!.longitude,
        });
        await createPreferenceMutation.mutateAsync({
          workplace_id: wp.id,
          budget: parsedBudget,
          preferred_transportation: transport,
          max_distance_km: maxDistKm,
        });
      }

      handleClose();
      onSuccess?.();
    } catch {
      Alert.alert(
        "Error",
        isEdit
          ? "No se pudo actualizar el lugar de trabajo."
          : "No se pudo agregar el lugar de trabajo.",
      );
    }
  };

  const handleDelete = useCallback(() => {
    if (!workplace) return;
    Alert.alert("Eliminar", `Eliminar "${workplace.work_address}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWorkplace.mutateAsync(workplace.id);
            handleClose();
            onSuccess?.();
          } catch {
            Alert.alert("Error", "No se pudo eliminar el lugar de trabajo.");
          }
        },
      },
    ]);
  }, [deleteWorkplace, handleClose, onSuccess, workplace]);

  const isSaving =
    createWorkplace.isPending ||
    updateWorkplace.isPending ||
    createPreferenceMutation.isPending ||
    updatePreferenceMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeightRatio={isEdit ? 0.56 : 0.55}
    >
      <ScrollView
        style={{ paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>
          {isEdit ? "Editar Lugar de Trabajo" : "Nuevo Lugar de Trabajo"}
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={18}
            color={Colors.textMuted}
            style={{ marginLeft: 14 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isEdit ? "Buscar nueva direccion..." : "Buscar direccion..."
            }
            placeholderTextColor={Colors.textMuted}
            value={addr.query}
            onChangeText={handleSearch}
          />
          {addr.isSearching && (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginRight: 10 }}
            />
          )}
        </View>

        {addr.selected && (
          <View style={styles.selectedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={Colors.success}
            />
            <Text style={styles.selectedBadgeText} numberOfLines={1}>
              Ubicacion seleccionada
            </Text>
          </View>
        )}

        {addr.suggestions.length > 0 && !addr.selected && (
          <View style={styles.suggestionsContainer}>
            {addr.suggestions.slice(0, 4).map((item, idx) => (
              <TouchableOpacity
                key={`${item.latitude}-${idx}`}
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
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

        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => setMapVisible(true)}
        >
          <Ionicons name="map-outline" size={20} color={Colors.primary} />
          <Text style={styles.mapBtnText}>Elegir en el mapa</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.fieldInput, { marginTop: 8 }]}
          placeholder="Presupuesto Mensual (S/)"
          placeholderTextColor={Colors.textMuted}
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
        />

        <View style={styles.transportRow}>
          {TRANSPORT_MODE_CONFIG.map((cfg) => (
            <TouchableOpacity
              key={cfg.id}
              style={[
                styles.transportChip,
                transport === cfg.id && styles.transportChipActive,
              ]}
              onPress={() => setTransport(cfg.id)}
            >
              <Ionicons
                name={cfg.iconOutline}
                size={18}
                color={
                  transport === cfg.id ? Colors.textOnPrimary : Colors.primary
                }
              />
              <Text
                style={[
                  styles.transportText,
                  transport === cfg.id && styles.transportTextActive,
                ]}
              >
                {cfg.labelFull}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: Colors.textSecondary,
              }}
            >
              Radio de busqueda
            </Text>
            <Text
              style={{ fontSize: 13, fontWeight: "800", color: Colors.primary }}
            >
              {maxDistKm} km
            </Text>
          </View>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={maxDistKm}
            onValueChange={setMaxDistKm}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>1 km</Text>
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>30 km</Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.sheetCancel} onPress={handleClose}>
            <Text style={styles.sheetCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetConfirm}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sheetConfirmText}>
                {isEdit ? "Guardar" : "Añadir"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {isEdit && allowDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={15} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Eliminar lugar de trabajo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <MapPickerModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        title={isEdit ? "Editar ubicacion" : "Ubicacion de trabajo"}
        instruction={
          isEdit
            ? "Ubica el nuevo punto de trabajo en el mapa"
            : "Ubica tu lugar de trabajo en el mapa"
        }
        initialRegion={
          isEdit && workplace
            ? {
                latitude: workplace.work_lat,
                longitude: workplace.work_lon,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
        onConfirm={(s) => {
          handleSelect(s);
          setMapVisible(false);
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 20,
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.success + "15",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  selectedBadgeText: {
    color: Colors.success,
    fontWeight: "600",
    fontSize: 13,
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: 12,
    color: Colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "12",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    marginBottom: 16,
  },
  mapBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  fieldInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  transportRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  transportChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  transportChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  transportText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  transportTextActive: {
    color: Colors.textOnPrimary,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  sheetCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
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
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
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
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error,
  },
});
