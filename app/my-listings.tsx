/**
 * @layer app (pages)
 * @description Ruta modal para el panel "Mis publicaciones" (HU22).
 * Renderiza el MyListingsPanel del feature publish-housing.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import { MyListingsPanel } from '@/features/publish-housing';

export default function MyListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textOnPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Mis publicaciones</Text>
            <Text style={styles.headerSubtitle}>Gestiona tus anuncios</Text>
          </View>
        </View>
      </View>
      <MyListingsPanel />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/publish-housing')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
        <Text style={styles.fabText}>Publicar</Text>
      </TouchableOpacity>
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
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
});
