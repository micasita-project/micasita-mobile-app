/**
 * @layer app (pages)
 * @description Ruta modal para el panel "Mis publicaciones" (HU22).
 * Renderiza el MyListingsPanel del feature publish-housing.
 */

import { View, StyleSheet } from 'react-native';
import { Colors } from '@/shared/config/colors';
import { MyListingsPanel } from '@/features/publish-housing';

export default function MyListingsScreen() {
  return (
    <View style={styles.container}>
      <MyListingsPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
