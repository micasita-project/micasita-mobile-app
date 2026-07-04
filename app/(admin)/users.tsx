import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { Colors } from '@/shared/config/colors';
import { getAllUsers, updateUserStatus } from '@/features/admin/api/admin.api';
import type { AdminUserResponse } from '@/features/admin/api/admin.api';
import { AdminUserCard } from '@/features/admin/ui/AdminUserCard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 7;

  const fetchUsers = useCallback(async (reset = false, searchStr = searchQuery) => {
    try {
      if (reset) {
        setIsRefreshing(true);
        setSkip(0);
        setHasMore(true);
      } else {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
      }

      const currentSkip = reset ? 0 : skip;
      const data = await getAllUsers(currentSkip, LIMIT, searchStr);

      if (data.length < LIMIT) {
        setHasMore(false);
      }

      setUsers((prev) => (reset ? data : [...prev, ...data]));
      setSkip(currentSkip + LIMIT);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar la lista de usuarios.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [skip, hasMore, isLoadingMore, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers(true);
    }, [])
  );

  useEffect(() => {
    // Cuando el usuario escribe en el buscador, hacemos un reset.
    // Podríamos usar un debounce aquí, pero simplificaremos reiniciando la carga al cambiar el texto.
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(true, searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleToggleStatus = (userId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const actionName = newStatus ? 'Desbloquear' : 'Bloquear';
    
    Alert.alert(
      `${actionName} Usuario`,
      `¿Estás seguro de que deseas ${actionName.toLowerCase()} a este usuario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Sí, ${actionName.toLowerCase()}`,
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              // Actualizamos localmente primero (Optimistic UI)
              setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u))
              );
              await updateUserStatus(userId, newStatus);
            } catch (error) {
              // Revertimos en caso de error
              setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, is_active: currentStatus } : u))
              );
              Alert.alert('Error', `No se pudo ${actionName.toLowerCase()} al usuario.`);
            }
          },
        },
      ]
    );
  };

  if (isLoading && users.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o correo..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Ionicons 
            name="close-circle" 
            size={20} 
            color={Colors.textMuted} 
            onPress={() => setSearchQuery('')} 
          />
        )}
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <AdminUserCard user={item} onToggleStatus={handleToggleStatus} />
        )}
        contentContainerStyle={styles.list}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={() => fetchUsers(true)} 
            colors={[Colors.primary]} 
            tintColor={Colors.primary} 
          />
        }
        onEndReached={() => fetchUsers(false)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name={searchQuery ? 'search-outline' : 'people-outline'} size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Sin resultados' : 'Sin usuarios'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron usuarios que coincidan.' : 'No hay usuarios registrados aún.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
