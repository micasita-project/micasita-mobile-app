import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/shared/config/colors';
import { Ionicons } from '@expo/vector-icons';
import type { Housing } from '@/shared/types';
import { HousingImages } from '@/entities/housing/api/images';

function getImageSource(imagePath?: string) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return { uri: imagePath };
  return HousingImages[imagePath];
}

interface AdminPropertyCardProps {
  property: Housing & { status: string; publisher_id: number };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPress: (property: Housing) => void;
}

export function AdminPropertyCard({ property, onApprove, onReject, onPress }: AdminPropertyCardProps) {
  const imageSource = getImageSource(property.images?.[0]);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.9} onPress={() => onPress(property)}>
      {imageSource ? (
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.noImageText}>Sin fotos</Text>
        </View>
      )}

      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{property.property_type}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>{property.title}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{property.district}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>S/{property.price}</Text>
          <Text style={styles.priceUnit}>/mes</Text>
        </View>

        <Text style={styles.publisherInfo}>
          ID Publicador: {property.publisher_id}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => onReject(property.id)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={[styles.btnText, { color: Colors.error }]}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.approveBtn]}
            onPress={() => onApprove(property.id)}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.textOnPrimary} />
            <Text style={[styles.btnText, { color: Colors.textOnPrimary }]}>Aprobar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  image: { width: '100%', height: 180 },
  noImage: {
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: Colors.textMuted,
    marginTop: 4,
    fontSize: 14,
  },
  typeBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary },
  infoContainer: { padding: 14 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  locationText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  priceValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 13, color: Colors.textSecondary, marginLeft: 2 },
  publisherInfo: { fontSize: 12, color: Colors.textMuted, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: Colors.error + '15',
  },
  approveBtn: {
    backgroundColor: Colors.primary,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
