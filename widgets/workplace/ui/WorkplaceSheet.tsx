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
import { useGenerateRecommendations } from "@/features/recommendation/model/useRecommendations";
import type { GeocodeSuggestion } from "@/shared/api/geocode.service";
import { isWithinLima, LIMA_LOCATION_ERROR } from "@/shared/utils/geo";
import { Colors } from "@/shared/config/colors";
import { TRANSPORT_MODE_CONFIG } from "@/shared/config/transport";
import type { TransportMode } from "@/shared/types";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { AddressSearchInput } from "@/shared/ui/AddressSearchInput";
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
  selected: GeocodeSuggestion | null;
}

const EMPTY_ADDR: AddressState = { query: "", selected: null };

interface WorkplaceSheetProps {
  visible: boolean;
  workplace?: Workplace | null;
  onClose: () => void;
  /** Se llama con el ID del workplace afectado (nuevo en create, existente en edit/delete) */
  onSuccess?: (workplaceId?: number) => void;
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
  const generateRecs = useGenerateRecommendations();

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
        selected: {
          display_name: workplace.work_address,
          latitude: workplace.work_lat,
          longitude: workplace.work_lon,
          place_type: "address",
        },
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
    setMapVisible(false);
    setAddr(EMPTY_ADDR);
    setBudget("");
    setTransport("driving");
    setMaxDistKm(10);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((s: GeocodeSuggestion) => {
    setAddr({
      query: s.display_name.split(",")[0].trim(),
      selected: s,
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

    if (addr.selected && !isWithinLima(addr.selected.latitude, addr.selected.longitude)) {
      Alert.alert("Fuera de cobertura", LIMA_LOCATION_ERROR);
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

        // Regenera las recomendaciones con las nuevas preferencias en segundo
        // plano (cambió lugar / presupuesto / radio / transporte). Invalida el
        // cache `latest` al terminar; el mapa muestra el spinner mientras corre.
        generateRecs.mutate(
          { workplaceId: workplace.id },
          {
            onError: () =>
              Alert.alert(
                "Recomendaciones",
                "Guardamos tus preferencias, pero no se pudieron actualizar las recomendaciones. Vuelve a intentarlo desde la pestaña IA.",
              ),
          },
        );
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
        // Generate recs in background for the new workplace
        generateRecs.mutate({ workplaceId: wp.id }, { onError: () => {} });
        handleClose();
        onSuccess?.(wp.id);
        return;
      }

      handleClose();
      onSuccess?.(workplace?.id);
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
            onSuccess?.(workplace.id);
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

  const footer = (
    <>
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
    </>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeightRatio={isEdit ? 0.56 : 0.55}
      expandable
      footer={footer}
    >
      <ScrollView
        style={{ paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>
          {isEdit ? "Editar Lugar de Trabajo" : "Nuevo Lugar de Trabajo"}
        </Text>

        <AddressSearchInput
          value={addr.query}
          onChangeText={(text) =>
            setAddr((p) => ({ ...p, query: text, selected: null }))
          }
          onSelect={handleSelect}
          placeholder={isEdit ? "Buscar nueva direccion..." : "Buscar direccion..."}
        />

        {addr.selected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.selectedBadgeText} numberOfLines={1}>
              Ubicacion seleccionada
            </Text>
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.textSecondary }}>
              Radio de busqueda
            </Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: Colors.primary }}>
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
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>1 km</Text>
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>30 km</Text>
          </View>
        </View>
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
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.success + "15",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  selectedBadgeText: {
    color: Colors.success,
    fontWeight: "600",
    fontSize: 13,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
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
  mapBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 15 },
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
  transportRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  transportChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  transportChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  transportText: { marginTop: 6, fontSize: 13, fontWeight: "600", color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },
  sheetActions: { flexDirection: "row", gap: 12 },
  sheetCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCancelText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 15 },
  sheetConfirm: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetConfirmText: { color: Colors.textOnPrimary, fontWeight: "700", fontSize: 15 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "600", color: Colors.error },
});
