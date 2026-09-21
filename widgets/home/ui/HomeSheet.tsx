/**
 * @layer widgets/home/ui
 * @description Bottom sheet para ver/editar la vivienda actual del usuario
 * (búsqueda de dirección o selección en mapa). Reutilizado desde el perfil y
 * desde la vista de detalle de vivienda.
 *
 * Al guardar, además de persistir la nueva dirección (servidor para usuarios
 * autenticados, AsyncStorage para invitados), dispara una regeneración de las
 * recomendaciones del workplace activo. Sin esto, `time_saved_mins` y
 * `franjas` quedarían calculados contra la vivienda anterior — el propio
 * historial guardado en el backend no se actualiza solo con cambiar la
 * dirección, hay que volver a correr el motor.
 */

import { useGenerateRecommendations, useGuestRecommendations } from "@/features/recommendation/model/useRecommendations";
import { useAuth } from "@/features/auth";
import { useGuest } from "@/features/guest";
import { useWorkplaces } from "@/entities/workplace/model/useWorkplaces";
import type { GeocodeSuggestion } from "@/shared/api/geocode.service";
import { Colors } from "@/shared/config/colors";
import { useSelectedWorkplace } from "@/shared/model/SelectedWorkplaceContext";
import { AddressSearchInput } from "@/shared/ui/AddressSearchInput";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { isWithinLima, LIMA_LOCATION_ERROR } from "@/shared/utils/geo";
import { MapPickerModal } from "@/widgets/location-picker/MapPickerModal";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AddressState {
  query: string;
  selected: GeocodeSuggestion | null;
}
const EMPTY_ADDR: AddressState = { query: "", selected: null };

interface HomeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Se llama tras guardar exitosamente (ya con la recomendación en proceso de refresco). */
  onSaved?: () => void;
}

export function HomeSheet({ visible, onClose, onSaved }: HomeSheetProps) {
  const { user, setHome } = useAuth();
  const { guestHome, guestWorkplace, setGuestHome, saveGuestRecommendations } = useGuest();
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const { selectedWorkplaceId } = useSelectedWorkplace();
  const activeWorkplace =
    workplaces.find((wp) => wp.id === selectedWorkplaceId) || workplaces[0] || null;
  const generateRecs = useGenerateRecommendations();
  const guestRecs = useGuestRecommendations();

  const [addr, setAddr] = useState<AddressState>(EMPTY_ADDR);
  const [mapVisible, setMapVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const currentAddress = user ? user.home_address : guestHome?.address;
    const shortAddr = currentAddress?.split(",").slice(0, 2).join(",").trim() ?? "";
    setAddr({ ...EMPTY_ADDR, query: shortAddr });
  }, [visible, user, guestHome]);

  const handleSearch = useCallback((text: string) => {
    setAddr((p) => ({ ...p, query: text, selected: null }));
  }, []);

  const handleSelect = useCallback((s: GeocodeSuggestion) => {
    setAddr({ query: s.display_name.split(",")[0].trim(), selected: s });
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setAddr(EMPTY_ADDR);
  }, [onClose]);

  const handleSave = async () => {
    if (!addr.selected) {
      Alert.alert("Dirección faltante", "Busca o selecciona una dirección.");
      return;
    }
    if (!isWithinLima(addr.selected.latitude, addr.selected.longitude)) {
      Alert.alert("Fuera de cobertura", LIMA_LOCATION_ERROR);
      return;
    }
    const home_lat = addr.selected.latitude;
    const home_lon = addr.selected.longitude;
    const home_address = addr.selected.display_name;

    setIsSaving(true);
    try {
      if (user) {
        await setHome({ home_lat, home_lon, home_address });
        if (activeWorkplace) {
          // Fire-and-forget: no bloquea el cierre del sheet, invalida el
          // cache de "latest" al terminar (ver useGenerateRecommendations).
          generateRecs.mutate({ workplaceId: activeWorkplace.id });
        }
      } else {
        await setGuestHome({ lat: home_lat, lon: home_lon, address: home_address });
        if (guestWorkplace) {
          const fresh = await guestRecs.mutateAsync({
            work_lat: guestWorkplace.lat,
            work_lon: guestWorkplace.lon,
            budget: guestWorkplace.budget,
            preferred_transportation: guestWorkplace.transport,
            max_distance_km: guestWorkplace.maxDistanceKm,
            home_lat,
            home_lon,
          });
          await saveGuestRecommendations(fresh);
        }
      }
      onSaved?.();
      handleClose();
    } catch {
      Alert.alert("Error", "No se pudo actualizar la vivienda.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeightRatio={0.42}
      footer={
        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.sheetCancel} onPress={handleClose}>
            <Text style={styles.sheetCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetConfirm}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sheetConfirmText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView
        style={{ paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>Mi Vivienda Actual</Text>
        <AddressSearchInput
          value={addr.query}
          onChangeText={handleSearch}
          onSelect={handleSelect}
          placeholder="Buscar dirección..."
        />
        {addr.selected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.selectedBadgeText} numberOfLines={1}>
              Ubicación seleccionada
            </Text>
          </View>
        )}
        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>O</Text>
          <View style={styles.orLine} />
        </View>
        <TouchableOpacity style={styles.mapBtn} onPress={() => setMapVisible(true)}>
          <Ionicons name="map-outline" size={20} color={Colors.primary} />
          <Text style={styles.mapBtnText}>Elegir en el mapa</Text>
        </TouchableOpacity>
      </ScrollView>

      <MapPickerModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        title="Ubicación de tu casa"
        instruction="Ubica tu vivienda actual en el mapa"
        onConfirm={(s) => {
          handleSelect(s);
          setMapVisible(false);
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, marginBottom: 20 },
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
  sheetCancelText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 15 },
  sheetConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  sheetConfirmText: { color: Colors.textOnPrimary, fontWeight: "700", fontSize: 15 },
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
  orText: { marginHorizontal: 14, color: Colors.textMuted, fontWeight: "600", fontSize: 13 },
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
});
