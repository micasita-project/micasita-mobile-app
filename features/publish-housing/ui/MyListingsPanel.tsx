/**
 * @layer features/publish-housing/ui
 * @description Panel de mis publicaciones (HU22).
 * Muestra las viviendas publicadas por el usuario con sus estados.
 */

import { useAuth } from "@/features/auth";
import { Colors } from "@/shared/config/colors";
import type { ListingStatus, PublishedHousing } from "@/shared/types";
import { formatPrice } from "@/shared/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getMyListings } from "../model/publishHousing.service";

const STATUS_CONFIG: Record<
  ListingStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "Pendiente", color: Colors.warning, icon: "time-outline" },
  approved: {
    label: "Aprobado",
    color: Colors.success,
    icon: "checkmark-circle-outline",
  },
  rejected: {
    label: "Rechazado",
    color: Colors.error,
    icon: "close-circle-outline",
  },
};

function ListingCard({
  listing,
  onEdit,
}: {
  listing: PublishedHousing;
  onEdit: (listing: PublishedHousing) => void;
}) {
  const status = STATUS_CONFIG[listing.status];
  const mainImage = listing.images[0];
  const typeLabel = listing.property_type;

  return (
    <View style={styles.card}>
      {/* Image */}
      {mainImage ? (
        <Image
          source={{ uri: mainImage }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.noImage]}>
          <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.noImageText}>Sin fotos</Text>
        </View>
      )}

      {/* Status badge */}
      <View
        style={[styles.statusBadge, { backgroundColor: status.color }]}
      >
        <Ionicons name={status.icon as any} size={13} color="#FFFFFF" />
        <Text style={[styles.statusText, { color: "#FFFFFF" }]}>
          {status.label}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.typeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{listing.property_type}</Text>
          </View>
          <Text style={styles.district}>{listing.district}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons
              name="bed-outline"
              size={13}
              color={Colors.textSecondary}
            />
            <Text style={styles.statText}>{listing.bedrooms} hab.</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="water-outline"
              size={13}
              color={Colors.textSecondary}
            />
            <Text style={styles.statText}>
              {listing.bathrooms} baño{listing.bathrooms > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="resize-outline"
              size={13}
              color={Colors.textSecondary}
            />
            <Text style={styles.statText}>{listing.total_area_sqm} m²</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(listing.price, listing.currency)}
          </Text>
          <Text style={styles.priceUnit}>/mes</Text>
        </View>

        <Text style={styles.date}>
          Publicado:{" "}
          {new Date(listing.createdAt).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </Text>

        {listing.status === "rejected" && (
          <View style={styles.rejectedNote}>
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={Colors.error}
            />
            <Text style={styles.rejectedNoteText}>
              Tu anuncio fue rechazado. Contáctanos para más detalles.
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onEdit(listing)}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function MyListingsPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<PublishedHousing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">(
    "all",
  );

  const fetchListings = useCallback(
    async (refresh = false) => {
      if (!user) return;
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const data = await getMyListings(String(user.id));
        setListings(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar publicaciones",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleEdit = useCallback(
    (listing: PublishedHousing) => {
      router.push({
        pathname: "/edit-housing",
        params: { data: JSON.stringify(listing) },
      });
    },
    [router],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando publicaciones…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => fetchListings()}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredListings = listings.filter(
    (l) => statusFilter === "all" || l.status === statusFilter,
  );

  return (
    <FlatList
      data={filteredListings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ListingCard listing={item} onEdit={handleEdit} />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchListings(true)}
          tintColor={Colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerCount}>
            {listings.length} propiedad{listings.length !== 1 ? "es" : ""}
          </Text>

          {/* Status legend */}
          <View style={styles.legend}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                statusFilter === "all" && styles.filterTabActive,
              ]}
              onPress={() => setStatusFilter("all")}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === "all" && styles.filterTabTextActive,
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {Object.entries(STATUS_CONFIG).map(
              ([key, { label, color, icon }]) => {
                const isActive = statusFilter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterTab,
                      isActive && styles.filterTabActive,
                    ]}
                    onPress={() => setStatusFilter(key as ListingStatus)}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        isActive && styles.filterTabTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Sin publicaciones</Text>
          <Text style={styles.emptySubtitle}>
            Tus anuncios de vivienda aparecerán aquí.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  errorText: { fontSize: 14, color: Colors.error, textAlign: "center" },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: Colors.textOnPrimary, fontWeight: "700" },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  headerCount: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  legend: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterTabTextActive: { color: Colors.textOnPrimary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImage: { width: "100%", height: 160 },
  noImage: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noImageText: { fontSize: 12, color: Colors.textMuted },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardInfo: { padding: 14 },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: Colors.primaryLight + "20",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  district: { fontSize: 11, color: Colors.textMuted },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  statsRow: { flexDirection: "row", gap: 14, marginBottom: 8 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: Colors.textSecondary },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  price: { fontSize: 20, fontWeight: "800", color: Colors.primary },
  priceUnit: { fontSize: 13, color: Colors.textSecondary, marginLeft: 2 },
  date: { fontSize: 11, color: Colors.textMuted },
  rejectedNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.error + "10",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  rejectedNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight + "20",
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
});
