/**
 * @layer entities/housing/ui
 * @description Reusable housing card component.
 * Supports full (list) and compact (map panel) variants.
 */

import { Colors } from "@/shared/config/colors";
import type { Housing } from "@/shared/types";
import { formatPrice } from "@/shared/utils/currency";
import { getImageSource } from "@/shared/utils/image";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HousingCardProps {
  housing: Housing;
  onPress?: (housing: Housing) => void;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
  variant?: "full" | "compact";
}

export function HousingCard({
  housing,
  onPress,
  onFavoriteToggle,
  variant = "full",
}: HousingCardProps) {
  const isCompact = variant === "compact";

  const typeLabel = housing.property_type;

  if (isCompact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => onPress?.(housing)}
        activeOpacity={0.8}
      >
        {/* Left: Info */}
        <View style={styles.compactInfo}>
          <View style={styles.compactTypeRow}>
            <View style={styles.compactTypeBadge}>
              <Text style={styles.compactTypeBadgeText}>{typeLabel}</Text>
            </View>
            <Text style={styles.compactDistrict}>{housing.district}</Text>
          </View>

          <Text style={styles.compactTitle} numberOfLines={2}>
            {housing.title}
          </Text>

          <View style={styles.compactStats}>
            <View style={styles.compactStatItem}>
              <Ionicons
                name="bed-outline"
                size={13}
                color={Colors.textSecondary}
              />
              <Text style={styles.compactStatText}>{housing.bedrooms}</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Ionicons
                name="water-outline"
                size={13}
                color={Colors.textSecondary}
              />
              <Text style={styles.compactStatText}>{housing.bathrooms}</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Ionicons
                name="resize-outline"
                size={13}
                color={Colors.textSecondary}
              />
              <Text style={styles.compactStatText}>
                {housing.total_area_sqm}m²
              </Text>
            </View>
          </View>

          <Text style={styles.compactPrice}>
            {formatPrice(housing.price, housing.currency)}
            <Text style={styles.compactPriceUnit}>/mes</Text>
          </Text>
        </View>

        {/* Favorite Icon for Compact */}
        <TouchableOpacity 
          style={styles.compactFavoriteBtn}
          onPress={() => onFavoriteToggle?.(housing.id, !housing.isFavorite)}
        >
          <Ionicons 
            name={housing.isFavorite ? "heart" : "heart-outline"} 
            size={22} 
            color={housing.isFavorite ? Colors.error : Colors.textMuted} 
          />
        </TouchableOpacity>

        {/* Right: Image */}
        <Image
          source={getImageSource(housing.images[0])}
          style={styles.compactImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  // Full variant (for lists)
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(housing)}
      activeOpacity={0.8}
    >
      <Image
        source={getImageSource(housing.images[0])}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{typeLabel}</Text>
      </View>

      <TouchableOpacity 
        style={styles.favoriteBtn}
        onPress={() => onFavoriteToggle?.(housing.id, !housing.isFavorite)}
        activeOpacity={0.7}
      >
        <View style={styles.favoriteCircle}>
          <Ionicons 
            name={housing.isFavorite ? "heart" : "heart-outline"} 
            size={22} 
            color={housing.isFavorite ? Colors.error : Colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {housing.title}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={styles.locationText} numberOfLines={1}>
            {housing.district}
          </Text>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Ionicons
              name="bed-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.featureText}>{housing.bedrooms} hab.</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="water-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.featureText}>
              {housing.bathrooms} baño{housing.bathrooms > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="resize-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.featureText}>{housing.total_area_sqm} m²</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>
            {formatPrice(housing.price, housing.currency)}
          </Text>
          <Text style={styles.priceUnit}>/mes</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Full variant ──────────────────────────────────────────
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  image: { width: "100%", height: 180 },
  typeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "600", color: Colors.textPrimary },
  infoContainer: { padding: 14 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  locationText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  featuresRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  featureText: { fontSize: 12, color: Colors.textSecondary },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  priceValue: { fontSize: 20, fontWeight: "800", color: Colors.primary },
  priceUnit: { fontSize: 13, color: Colors.textSecondary, marginLeft: 2 },

  // ── Compact variant (map panel) ───────────────────────────
  compactContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  compactInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  compactTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  compactTypeBadge: {
    backgroundColor: Colors.primaryLight + "20",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  compactTypeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
  },
  compactDistrict: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  compactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  compactStats: { flexDirection: "row", gap: 10, marginBottom: 6 },
  compactStatItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  compactStatText: { fontSize: 11, color: Colors.textSecondary },
  compactPrice: { fontSize: 16, fontWeight: "800", color: Colors.primary },
  compactPriceUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  compactImage: { width: 110, height: "100%", minHeight: 120 },
  favoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  favoriteCircle: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactFavoriteBtn: {
    position: "absolute",
    top: 8,
    right: 120, // To avoid overlapping with image which is 110px wide on the right
    zIndex: 1,
  },
});
