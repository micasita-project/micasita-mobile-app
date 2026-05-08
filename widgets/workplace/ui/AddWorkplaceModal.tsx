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
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { MapPickerModal } from "@/widgets/location-picker/MapPickerModal";
import { Colors } from "@/shared/config/colors";
import { searchAddress, type GeocodeSuggestion } from "@/shared/api/geocode.service";
import { useCreateWorkplace } from "@/entities/workplace/model/useWorkplaces";
import { useCreatePreference } from "@/entities/recommendation-preferences";

type TransportOption = "Auto" | "Bicicleta" | "Caminando";
const TRANSPORT_OPTIONS: TransportOption[] = ["Auto", "Bicicleta", "Caminando"];
const TRANSPORT_ICONS: Record<TransportOption, string> = {
  Auto: "car-outline",
  Bicicleta: "bicycle-outline",
  Caminando: "walk-outline",
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

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddWorkplaceModal({ visible, onClose, onSuccess }: Props) {
  const createWorkplace = useCreateWorkplace();
  const createPreferenceMutation = useCreatePreference();

  const [addAddr, setAddAddr] = useState<AddressState>(EMPTY_ADDR);
  const [addBudget, setAddBudget] = useState("");
  const [addTransport, setAddTransport] = useState<TransportOption>("Auto");
  const [addMaxDistKm, setAddMaxDistKm] = useState(10);
  const [addMapVisible, setAddMapVisible] = useState(false);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddSearch = useCallback((text: string) => {
    setAddAddr((p) => ({ ...p, query: text, selected: null }));
    if (addTimer.current) clearTimeout(addTimer.current);
    if (text.trim().length < 3) {
      setAddAddr((p) => ({ ...p, suggestions: [] }));
      return;
    }
    setAddAddr((p) => ({ ...p, isSearching: true }));
    addTimer.current = setTimeout(async () => {
      try {
        const results = await searchAddress(text);
        setAddAddr((p) => ({ ...p, suggestions: results, isSearching: false }));
      } catch {
        setAddAddr((p) => ({ ...p, isSearching: false }));
      }
    }, 400);
  }, []);

  const handleAddSelect = useCallback((s: GeocodeSuggestion) => {
    setAddAddr({
      query: s.display_name.split(",")[0].trim(),
      suggestions: [],
      selected: s,
      isSearching: false,
    });
  }, []);

  const handleClose = useCallback(() => {
    setAddAddr(EMPTY_ADDR);
    setAddBudget("");
    setAddTransport("Auto");
    setAddMaxDistKm(10);
    onClose();
  }, [onClose]);

  const handleAddWorkplace = async () => {
    if (!addAddr.selected) {
      Alert.alert("Dirección faltante", "Busca o selecciona una dirección.");
      return;
    }
    const budget = parseFloat(addBudget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert("Presupuesto inválido", "Ingresa un presupuesto válido.");
      return;
    }
    try {
      const wp = await createWorkplace.mutateAsync({
        work_address: addAddr.query.trim() || "Mi Trabajo",
        work_lat: addAddr.selected.latitude,
        work_lon: addAddr.selected.longitude,
      });
      await createPreferenceMutation.mutateAsync({
        workplace_id: wp.id,
        budget,
        preferred_transportation: addTransport,
        max_distance_km: addMaxDistKm,
      });
      handleClose();
      onSuccess?.();
    } catch {
      Alert.alert("Error", "No se pudo agregar el lugar de trabajo");
    }
  };

  const renderAddressField = () => (
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
          placeholder="Buscar dirección..."
          placeholderTextColor={Colors.textMuted}
          value={addAddr.query}
          onChangeText={handleAddSearch}
        />
        {addAddr.isSearching && (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={{ marginRight: 10 }}
          />
        )}
      </View>
      {addAddr.selected && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.selectedBadgeText} numberOfLines={1}>
            Ubicación seleccionada
          </Text>
        </View>
      )}
      {addAddr.suggestions.length > 0 && !addAddr.selected && (
        <View style={styles.suggestionsContainer}>
          {addAddr.suggestions.slice(0, 4).map((item, idx) => (
            <TouchableOpacity
              key={`${item.latitude}-${idx}`}
              style={styles.suggestionItem}
              onPress={() => handleAddSelect(item)}
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
      <TouchableOpacity style={styles.mapBtn} onPress={() => setAddMapVisible(true)}>
        <Ionicons name="map-outline" size={20} color={Colors.primary} />
        <Text style={styles.mapBtnText}>Elegir en el mapa</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeightRatio={0.55}
    >
      <ScrollView
        style={{ paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>Nuevo Lugar de Trabajo</Text>
        {renderAddressField()}
        <TextInput
          style={[styles.fieldInput, { marginTop: 8 }]}
          placeholder="Presupuesto Mensual (S/)"
          placeholderTextColor={Colors.textMuted}
          value={addBudget}
          onChangeText={setAddBudget}
          keyboardType="numeric"
        />
        <View style={styles.transportRow}>
          {TRANSPORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.transportChip,
                addTransport === opt && styles.transportChipActive,
              ]}
              onPress={() => setAddTransport(opt)}
            >
              <Ionicons
                name={TRANSPORT_ICONS[opt] as any}
                size={18}
                color={
                  addTransport === opt ? Colors.textOnPrimary : Colors.primary
                }
              />
              <Text
                style={[
                  styles.transportText,
                  addTransport === opt && styles.transportTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.textSecondary }}>Radio de búsqueda</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.primary }}>{addMaxDistKm} km</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={addMaxDistKm}
            onValueChange={setAddMaxDistKm}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
            onPress={handleAddWorkplace}
            disabled={createWorkplace.isPending}
          >
            {createWorkplace.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sheetConfirmText}>Añadir</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <MapPickerModal
        visible={addMapVisible}
        onClose={() => setAddMapVisible(false)}
        title="Ubicación de trabajo"
        instruction="Ubica tu lugar de trabajo en el mapa"
        onConfirm={(s) => {
          handleAddSelect(s);
          setAddMapVisible(false);
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
});
