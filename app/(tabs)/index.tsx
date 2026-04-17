/**
 * @layer app (pages)
 * @description Thin wrapper page that composes the MapBoard widget.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapBoardWidget } from '@/widgets/map-board';
import { Colors } from '@/shared/config/colors';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapBoardWidget />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
