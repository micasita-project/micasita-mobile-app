/**
 * @layer app (pages)
 * @description Pantalla de onboarding post-registro.
 * Paso 1: Casa actual.
 * Paso 2: Lugar de trabajo principal.
 * Paso 3: Preferencias.
 */

import { useCreateWorkplace } from "@/entities/workplace/model/useWorkplaces";
import { createPreference } from "@/entities/recommendation-preferences";
import { useAuth } from "@/features/auth";
import { useGenerateRecommendations } from "@/features/recommendation/model/useRecommendations";
import type { GeocodeSuggestion } from "@/shared/api/geocode.service";
import { AddressSearchInput } from "@/shared/ui/AddressSearchInput";
import { Colors } from "@/shared/config/colors";
import { TRANSPORT_MODE_CONFIG } from "@/shared/config/transport";
import type { TransportMode } from "@/shared/types";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MapPickerModal } from "@/widgets/location-picker/MapPickerModal";


// ── Loading screen ────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Analizando tu rutina de trabajo...",
  "Calculando tiempos de viaje...",
  "Buscando las mejores viviendas...",
  "Aplicando inteligencia artificial...",
  "¡Casi listo!",
];

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    height: 50,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
    alignItems: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});

function Dot({ delay }: { delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(Math.max(0, 1400 - delay - 400)),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[loadingStyles.dot, { transform: [{ translateY }] }]}
    />
  );
}

function LoadingView() {
  const [msgIndex, setMsgIndex] = useState(0);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setMsgIndex(i);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={loadingStyles.container}>
      <Animated.View
        style={[loadingStyles.iconWrap, { transform: [{ scale: iconScale }] }]}
      >
        <Ionicons name="sparkles" size={40} color="#fff" />
      </Animated.View>
      <Text style={loadingStyles.title}>Configurando tu perfil</Text>
      <Animated.Text style={[loadingStyles.subtitle, { opacity: textOpacity }]}>
        {LOADING_MESSAGES[msgIndex]}
      </Animated.Text>
      <View style={loadingStyles.dotsRow}>
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const createWorkplace = useCreateWorkplace();
  const generateRecs = useGenerateRecommendations();
  const { setHome } = useAuth();

  // Steps
  type Step = "home" | "workplace" | "preferences" | "loading";
  const [step, setStep] = useState<Step>("home");

  // Search State (shared between home/workplace)
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Data
  const [homeAddress, setHomeAddress] = useState<GeocodeSuggestion | null>(
    null,
  );
  const [workAddress, setWorkAddress] = useState<GeocodeSuggestion | null>(
    null,
  );
  const [workAddressLabel, setWorkAddressLabel] = useState("");
  const [budget, setBudget] = useState("");
  const [transport, setTransport] = useState<TransportMode>("driving");
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);

  // Map Picker State
  const [mapPickerMode, setMapPickerMode] = useState<
    "home" | "workplace" | null
  >(null);

  // ── Handlers ──────────────────────────────────────────────────

  const handleSelectAddress = useCallback(
    (suggestion: GeocodeSuggestion) => {
      setSearchQuery("");
      if (step === "home") {
        setHomeAddress(suggestion);
        setStep("workplace");
      } else if (step === "workplace") {
        setWorkAddress(suggestion);
        const parts = suggestion.display_name.split(",");
        setWorkAddressLabel(parts.slice(0, 2).join(",").trim());
        setStep("preferences");
      }
    },
    [step],
  );

  const openMapPicker = () => {
    setMapPickerMode(step as "home" | "workplace");
  };

  const handleSubmit = async () => {
    if (!homeAddress || !workAddress) return;
    const budgetNum = parseFloat(budget);
    if (!budget.trim() || isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert(
        "Presupuesto inválido",
        "Ingresa un presupuesto mensual válido.",
      );
      return;
    }

    setStep("loading");

    try {
      // 1. Guardar Casa
      await setHome({
        home_lat: homeAddress.latitude,
        home_lon: homeAddress.longitude,
        home_address: homeAddress.display_name,
      });

      // 2. Crear Workplace (solo datos geográficos)
      const workplace = await createWorkplace.mutateAsync({
        work_address: workAddressLabel.trim() || "Mi trabajo",
        work_lat: workAddress.latitude,
        work_lon: workAddress.longitude,
      });

      // 3. Crear preferencias de recomendación para este workplace
      await createPreference({
        workplace_id: workplace.id,
        budget: budgetNum,
        preferred_transportation: transport,
        max_distance_km: maxDistanceKm,
      });

      // 4. Generar primera recomendación con IA
      await generateRecs.mutateAsync({
        workplaceId: workplace.id,
        options: { max_distance_km: maxDistanceKm },
      });

      // 4. Ir a la app principal
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      setStep("preferences");
      Alert.alert(
        "Error",
        error?.response?.data?.detail ?? "Ocurrió un error. Intenta de nuevo.",
      );
    }
  };

  // ── Renders ───────────────────────────────────────────────────

  if (step === "loading") {
    return <LoadingView />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View
              style={[
                styles.stepLine,
                (step === "workplace" || step === "preferences") &&
                  styles.stepLineActive,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                (step === "workplace" || step === "preferences") &&
                  styles.stepDotActive,
              ]}
            />
            <View
              style={[
                styles.stepLine,
                step === "preferences" && styles.stepLineActive,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                step === "preferences" && styles.stepDotActive,
              ]}
            />
          </View>
          <Text style={styles.title}>
            {step === "home"
              ? "Tu casa actual"
              : step === "workplace"
                ? "¿Dónde trabajas?"
                : "Tus preferencias"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "home"
              ? "Para calcular tu ahorro en tiempo de viaje, necesitamos saber dónde vives actualmente."
              : step === "workplace"
                ? "Busca la dirección de tu oficina o universidad para encontrar viviendas ideales cerca."
                : "Configura tu presupuesto y transporte para recomendaciones personalizadas."}
          </Text>
        </View>

        {step === "home" || step === "workplace" ? (
          <>
            {/* Search */}
            <AddressSearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSelect={handleSelectAddress}
              placeholder="Ej: Av. Javier Prado 123..."
              autoFocus
            />

            <View style={styles.orDivider}>
              <View style={styles.line} />
              <Text style={styles.orText}>O</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.mapBtn} onPress={openMapPicker}>
              <Ionicons name="map-outline" size={20} color={Colors.primary} />
              <Text style={styles.mapBtnText}>Elegir en el mapa</Text>
            </TouchableOpacity>

            {step === "workplace" && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("home")}
              >
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
              value={workAddressLabel}
              onChangeText={setWorkAddressLabel}
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

            <Text style={styles.fieldLabel}>
              Transporte preferido al trabajo
            </Text>
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
                    size={22}
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

            <View style={styles.sliderContainer}>
              <View style={styles.sliderLabelRow}>
                <Text style={styles.fieldLabel}>Radio de búsqueda</Text>
                <Text style={styles.sliderValue}>{maxDistanceKm} km</Text>
              </View>
              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={1}
                maximumValue={30}
                step={1}
                value={maxDistanceKm}
                onValueChange={(v) => setMaxDistanceKm(Math.round(v))}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.primary}
              />
              <View style={styles.sliderRangeRow}>
                <Text style={styles.sliderRangeText}>1 km</Text>
                <Text style={styles.sliderRangeText}>30 km</Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("workplace")}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, styles.primaryButtonFlex]}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={Colors.textOnPrimary}
                />
                <Text style={styles.primaryButtonText}>
                  Buscar mi vivienda ideal
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <MapPickerModal
        visible={!!mapPickerMode}
        onClose={() => setMapPickerMode(null)}
        title={mapPickerMode === 'home' ? 'Ubicación de tu casa' : 'Ubicación de tu trabajo'}
        instruction={`Mueve el mapa para ubicar tu ${mapPickerMode === 'home' ? 'casa' : 'trabajo'}`}
        onConfirm={(suggestion) => {
          handleSelectAddress(suggestion);
          setMapPickerMode(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  header: { marginBottom: 28 },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  stepLineActive: { backgroundColor: Colors.primary },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  searchSpinner: { marginLeft: 8 },

  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: {
    marginHorizontal: 16,
    color: Colors.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },

  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "15",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    marginBottom: 16,
  },
  mapBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 15 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  transportRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  transportChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  transportChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  transportText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  transportTextActive: { color: Colors.textOnPrimary },

  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonFlex: { flex: 1, marginTop: 0 },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 6,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    width: "100%",
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 24,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },

  // Map Modal
  mapCenterMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
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

  sliderContainer: { marginTop: 12, marginBottom: 4 },
  sliderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sliderValue: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  sliderRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderRangeText: { fontSize: 11, color: Colors.textMuted },
});
