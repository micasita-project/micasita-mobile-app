import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import { useAuth } from '@/features/auth';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/shared/ui/BottomSheet';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [profileVisible, setProfileVisible] = useState(false);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopColor: Colors.border,
          },
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.textOnPrimary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          headerRight: () => (
            <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.headerAvatarBtn}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{initial}</Text>
              </View>
            </TouchableOpacity>
          ),
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pendientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      </Tabs>

      <BottomSheet visible={profileVisible} onClose={() => setProfileVisible(false)} maxHeightRatio={0.38}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{initial}</Text>
            </View>
            <Text style={styles.sheetName}>
              {user?.name ? `${user.name} ${user.last_name || ''}` : 'Administrador'}
            </Text>
            <Text style={styles.sheetEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Rol: Admin</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  headerAvatarBtn: {
    marginRight: 16,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  sheetContent: {
    padding: 24,
    alignItems: 'center',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  sheetName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sheetEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: Colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  roleText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    width: '100%',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
});
