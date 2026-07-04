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

  const accentColor = user.is_active ? Colors.success : Colors.error;

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: user.is_active ? Colors.success + '18' : Colors.error + '12' }]}>
        <Text style={[styles.avatarText, { color: accentColor }]}>{initial}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name ? `${user.name} ${user.last_name || ''}` : 'Sin nombre'}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.roleBadge}>
          <Ionicons name={user.role === 'admin' ? 'shield-checkmark' : 'person-outline'} size={11} color={Colors.textSecondary} />
          <Text style={styles.roleText}>{user.role === 'admin' ? 'Admin' : 'Usuario'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={[styles.statusChip, { backgroundColor: accentColor + '15' }]}>
          <Text style={[styles.statusText, { color: accentColor }]}>
            {user.is_active ? 'Activo' : 'Bloqueado'}
          </Text>
        </View>
        <Switch
          value={user.is_active}
          onValueChange={() => onToggleStatus(user.id, user.is_active)}
          trackColor={{ false: Colors.border, true: Colors.success }}
          thumbColor={Colors.surface}
          ios_backgroundColor={Colors.border}
          disabled={user.role === 'admin'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  email: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  statusChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
