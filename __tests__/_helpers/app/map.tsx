import React from 'react';

export const mapHandle = { animateToRegion: jest.fn(), fitToCoordinates: jest.fn() };

/** Sustituto de `@/shared/ui/map`: los marcadores son botones con su título para poder pulsarlos. */
export const mapModule = {
  AppMapView: React.forwardRef(function AppMapView({ children, initialRegion }: any, ref: any) {
    const { View } = require('react-native');
    React.useImperativeHandle(ref, () => mapHandle);
    return (
      <View testID="map" {...({ initialRegion } as any)}>
        {children}
      </View>
    );
  }),
  AppMarker: ({ title, onPress, coordinate, children }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={`marker-${title}`} onPress={onPress} {...({ coordinate } as any)}>
        <Text>{title}</Text>
        {children}
      </Pressable>
    );
  },
  AppCircle: ({ radius }: any) => {
    const { Text } = require('react-native');
    return <Text testID="circle">{String(radius)}</Text>;
  },
  AppUrlTile: () => null,
  AppPolyline: () => null,
};

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
