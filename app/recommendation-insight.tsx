/**
 * @layer app (pages)
 * @description Pantalla de análisis de recomendación IA.
 * Explica por qué una vivienda fue recomendada: score, tiempo, ahorro y características.
 */

import type { RecommendationItem } from "@/features/recommendation/api/recommendation.api";
import {
  buildInsightBody,
  buildInsightTitle,
  scoreLabel,
} from "@/features/recommendation/model/recommendationMessage";
import { fetchTimeByFranja, formatTravelTime } from "@/entities/route";
import type { TimeByFranja } from "@/entities/route";
import { useAuth } from "@/features/auth";
import { useGuest } from "@/features/guest";
import { usePreferences } from "@/entities/recommendation-preferences";
import { useWorkplaces } from "@/entities/workplace/model/useWorkplaces";
import { Colors } from "@/shared/config/colors";
import { normalizeTransportMode } from "@/shared/config/transport";
import { useSelectedWorkplace } from "@/shared/model/SelectedWorkplaceContext";
import { formatPrice } from "@/shared/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const FRANJA_LABELS: Record<keyof TimeByFranja, { hora: string; nota: string; icon: keyof typeof Ionicons.glyphMap }> = {
  punta_manana: { hora: "7:00 a.m.", nota: "Hora punta", icon: "partly-sunny-outline" },
  valle: { hora: "1:00 p.m.", nota: "Tráfico bajo", icon: "sunny-outline" },
  punta_tarde: { hora: "6:00 p.m.", nota: "Hora punta", icon: "moon-outline" },
};
const FRANJA_ORDEN: (keyof TimeByFranja)[] = ["punta_manana", "valle", "punta_tarde"];

function LargeMatchRing({ score }: { score: number }) {
  const size = 112;
  const sw = 7;
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color =
    score >= 80 ? Colors.success : score >= 60 ? Colors.warning : Colors.error;

  return (
    <View
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.07)"
          strokeWidth={sw}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.textPrimary }}>
        {score}%
      </Text>
      <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 1 }}>match</Text>
    </View>
  );
}

function MetricRow({
  icon,
  label,
  note,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  note?: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricIconBox}>
        <Ionicons name={icon} size={17} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.metricLabel}>{label}</Text>
        {note ? <Text style={styles.metricNote}>{note}</Text> : null}
      </View>
      <Text style={[styles.metricValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

export default function RecommendationInsightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: rawData } = useLocalSearchParams<{ data: string }>();

  let item: RecommendationItem | null = null;
  try {
    if (rawData) item = JSON.parse(rawData) as RecommendationItem;
  } catch {}

  // Mismo modo y workplace activo que el resto de la app (housing-detail,
  // mapa): así este cálculo siempre coincide con el que ya se le mostró al
  // usuario, sin depender de qué pantalla lo mandó para acá.
  const { user } = useAuth();
  const { guestWorkplace } = useGuest();
  const { data: workplaces = [] } = useWorkplaces(!!user);
  const { selectedWorkplaceId } = useSelectedWorkplace();
  const activeWorkplace =
    workplaces.find((wp) => wp.id === selectedWorkplaceId) || workplaces[0] || null;
  const { data: preferences = [] } = usePreferences(
    user ? (activeWorkplace?.id ?? null) : null,
  );
  const activePreference = preferences[0];
  const workLat = user ? activeWorkplace?.work_lat : guestWorkplace?.lat;
  const workLon = user ? activeWorkplace?.work_lon : guestWorkplace?.lon;
  const mode = user
    ? normalizeTransportMode(activePreference?.preferred_transportation)
    : normalizeTransportMode(guestWorkplace?.transport);

  const [franjas, setFranjas] = useState<TimeByFranja | null>(null);
  const [loadingFranjas, setLoadingFranjas] = useState(false);

  useEffect(() => {
    if (!item || mode !== "driving" || !workLat || !workLon) return;
    let cancelled = false;
    setLoadingFranjas(true);
    fetchTimeByFranja(
      { latitude: workLat, longitude: workLon },
      { latitude: item.property.latitude, longitude: item.property.longitude },
      mode,
    ).then((result) => {
      if (!cancelled) {
        setFranjas(result);
        setLoadingFranjas(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.property.id, mode, workLat, workLon]);

  if (!item) return null;

  const score = item.match_score;
  const label = scoreLabel(score);
  const title = buildInsightTitle(item);
  const body = buildInsightBody(item);
  const scoreColor =
    score >= 80 ? Colors.success : score >= 60 ? Colors.warning : Colors.error;

  const img = item.property.images?.[0];
  const thumbSrc = img ? { uri: img } : null;

  const saved = item.time_saved_mins;
  const savedRounded =
    saved !== null && Number.isFinite(saved) ? Math.round(saved) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Análisis IA</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Score hero */}
        <View style={styles.scoreCard}>
          <LargeMatchRing score={score} />
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "1a" }]}>
            <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>{label}</Text>
          </View>
          <Text style={styles.insightTitle}>{title}</Text>
          <Text style={styles.insightBody}>{body}</Text>
        </View>

        {/* Property snapshot */}
        <View style={styles.propCard}>
          {thumbSrc ? (
            <Image source={thumbSrc} style={styles.propThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.propThumb, styles.propThumbPlaceholder]}>
              <Ionicons name="home-outline" size={22} color={Colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.propDistrict} numberOfLines={1}>
              {item.property.district}
            </Text>
            <Text style={styles.propAddress} numberOfLines={1}>
              {item.property.address}
            </Text>
            <Text style={styles.propPrice}>
              {formatPrice(item.property.price, item.property.currency)}
              <Text style={styles.propPriceUnit}> /mes</Text>
            </Text>
            <Text style={styles.propSpecs}>
              {item.property.bedrooms}h · {item.property.bathrooms}b ·{" "}
              {item.property.total_area_sqm}m²
            </Text>
          </View>
        </View>

        {/* Metrics breakdown */}
        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>¿Por qué este resultado?</Text>

          <MetricRow
            icon="time-outline"
            label="Tiempo al trabajo"
            value={formatTravelTime(Math.round(item.predicted_time_min))}
            valueColor={
              item.predicted_time_min <= 25
                ? Colors.success
                : item.predicted_time_min <= 45
                  ? Colors.warning
                  : Colors.error
            }
          />

          {savedRounded !== null && (
            <MetricRow
              icon={savedRounded >= 0 ? "trending-down" : "trending-up"}
              label={savedRounded >= 0 ? "Ahorras vs tu hogar" : "Tiempo adicional"}
              note="respecto a tu ubicación actual"
              value={
                savedRounded >= 0
                  ? `${formatTravelTime(savedRounded)} menos`
                  : `${formatTravelTime(Math.abs(savedRounded))} más`
              }
              valueColor={savedRounded >= 0 ? Colors.success : Colors.error}
            />
          )}

          {item.property.price > 0 && (
            <MetricRow
              icon="wallet-outline"
              label="Precio mensual"
              value={formatPrice(item.property.price, item.property.currency)}
            />
          )}

          {(item.property.bedrooms ?? 0) > 0 && (
            <MetricRow
              icon="bed-outline"
              label="Habitaciones"
              value={String(item.property.bedrooms)}
            />
          )}

          {(item.property.bathrooms ?? 0) > 0 && (
            <MetricRow
              icon="water-outline"
              label="Baños"
              value={String(item.property.bathrooms)}
            />
          )}

          {item.property.total_area_sqm > 0 && (
            <MetricRow
              icon="expand-outline"
              label="Área total"
              value={`${item.property.total_area_sqm} m²`}
            />
          )}
        </View>

        {/* Desglose por hora del día — solo en auto, es el único modo con
            variación por franja horaria validada por el modelo. */}
        {mode === "driving" && (loadingFranjas || franjas) && (
          <View style={styles.franjasCard}>
            <Text style={styles.metricsTitle}>¿Cómo cambia el tiempo según la hora?</Text>
            {loadingFranjas && !franjas ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
            ) : franjas ? (
              <View style={styles.franjasRow}>
                {FRANJA_ORDEN.map((clave) => {
                  const info = FRANJA_LABELS[clave];
                  return (
                    <View key={clave} style={styles.franjaPill}>
                      <Ionicons name={info.icon} size={18} color={Colors.primary} />
                      <Text style={styles.franjaMinutos}>
                        {Math.round(franjas[clave])} min
                      </Text>
                      <Text style={styles.franjaHora}>{info.hora}</Text>
                      <Text style={styles.franjaNota}>{info.nota}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() =>
            router.push({
              pathname: "/housing-detail",
              params: {
                id: item!.property.id,
                data: JSON.stringify(item!.property),
                reco: JSON.stringify({
                  predicted_time_min: item!.predicted_time_min,
                  time_saved_mins: item!.time_saved_mins,
                  franjas: item!.franjas,
                }),
              },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Ver propiedad completa</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.textOnPrimary },

  content: { padding: 16, gap: 14 },

  // Score hero
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  scoreBadge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  scoreBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  insightTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginTop: 2,
  },
  insightBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginHorizontal: 4,
  },

  // Property snapshot
  propCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  propThumb: { width: 72, height: 72, borderRadius: 10 },
  propThumbPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  propDistrict: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  propAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  propPrice: { fontSize: 14, fontWeight: "700", color: Colors.primary, marginTop: 4 },
  propPriceUnit: { fontSize: 11, fontWeight: "500", color: Colors.textSecondary },
  propSpecs: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Metrics
  metricsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  metricNote: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  metricValue: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },

  // Desglose por franja horaria
  franjasCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  franjasRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  franjaPill: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  franjaMinutos: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary, marginTop: 2 },
  franjaHora: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  franjaNota: { fontSize: 10, color: Colors.textMuted },

  // CTA
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: { fontSize: 15, fontWeight: "700", color: Colors.textOnPrimary },
});
