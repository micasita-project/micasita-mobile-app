/**
 * @layer app (pages)
 * @description Pantalla de Mis Favoritos.
 * Lista todas las viviendas que el usuario ha marcado con un corazón.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyFavorites } from '@/entities/housing/api/housing.api';
import { HousingCard } from '@/entities/housing';
import { useToggleFavorite, propertyKeys } from '@/entities/housing/model/useProperties';
import { Colors } from '@/shared/config/colors';
import type { Housing } from '@/shared/types';

export default function FavoritesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toggleFavorite = useToggleFavorite();

  const insets = useSafeAreaInsets();
  const { data: favorites = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchMyFavorites,
  });

  const handleHousingPress = useCallback(
    (housing: Housing) => {
      router.push({ 
        pathname: '/housing-detail', 
        params: { id: housing.id, data: JSON.stringify(housing) } 
      });
    },
    [router]
  );

  const handleFavoriteToggle = useCallback(
    (id: string, isFavorite: boolean) => {
      // Si quitamos de favoritos, podemos hacer un update optimista local
      if (!isFavorite) {
        qc.setQueryData(['favorites'], (old: Housing[] | undefined) => 
          old?.filter(h => h.id !== id)
        );
      }
      toggleFavorite.mutate({ id, isFavorite });
    },
    [toggleFavorite, qc]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textOnPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Mis Favoritos</Text>
            <Text style={styles.headerSubtitle}>{favorites.length} propiedad{favorites.length !== 1 ? 'es' : ''}</Text>
          </View>
        </View>
      </View>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HousingCard 
            housing={item} 
            onPress={handleHousingPress} 
            onFavoriteToggle={handleFavoriteToggle}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
            <Text style={styles.emptyText}>
              Explora las viviendas disponibles y toca el corazón para guardarlas aquí.
            </Text>
            <TouchableOpacity 
              style={styles.exploreBtn} 
              onPress={() => router.push('/(tabs)/housing')}
            >
              <Text style={styles.exploreBtnText}>Explorar viviendas</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textOnPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textOnPrimary + 'BB', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 14, 
    color: Colors.textSecondary, 
    textAlign: 'center', 
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
});
