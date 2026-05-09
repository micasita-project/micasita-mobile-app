import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '@/shared/config/colors';
import { Ionicons } from '@expo/vector-icons';
import type { AdminUserResponse } from '../api/admin.api';

interface AdminUserCardProps {
  user: AdminUserResponse;
  onToggleStatus: (userId: number, currentStatus: boolean) => void;
}

export function AdminUserCard({ user, onToggleStatus }: AdminUserCardProps) {
  const initial = user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {user.name ? `${user.name} ${user.last_name || ''}` : 'Sin nombre'}
        </Text>
        <View style={styles.roleBadge}>
          <Ionicons name={user.role === 'admin' ? 'shield-checkmark' : 'person'} size={12} color={Colors.textSecondary} />
          <Text style={styles.roleText}>{user.role === 'admin' ? 'Admin' : 'Usuario'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Text style={[styles.statusText, { color: user.is_active ? Colors.success : Colors.error }]}>
          {user.is_active ? 'Activo' : 'Bloqueado'}
        </Text>
        <Switch
          value={user.is_active}
          onValueChange={() => onToggleStatus(user.id, user.is_active)}
          trackColor={{ false: Colors.error + '50', true: Colors.success + '50' }}
          thumbColor={user.is_active ? Colors.success : Colors.error}
          disabled={user.role === 'admin'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  email: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
});
