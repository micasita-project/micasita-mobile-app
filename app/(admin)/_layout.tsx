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
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Usuarios',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <BottomSheet visible={profileVisible} onClose={() => setProfileVisible(false)} maxHeightRatio={0.52}>
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
              <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
              <Text style={styles.roleText}>Administrador</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
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
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  headerAvatarText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 28,
    alignItems: 'center',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  largeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  largeAvatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
  },
  sheetName: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sheetEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  roleText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '08',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.error + '25',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
});
