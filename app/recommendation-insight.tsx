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
import { formatTravelTime } from "@/entities/route";
import { Colors } from "@/shared/config/colors";
import { formatPrice } from "@/shared/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

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
