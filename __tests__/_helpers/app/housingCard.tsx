import React from 'react';

/** `HousingCard` de prueba: pulsar la tarjeta llama `onPress(housing)`; el corazón llama `onFavoriteToggle(id, !isFavorite)` como la tarjeta real. */
export const housingEntityModule = {
  HousingCard: ({ housing, onPress, onFavoriteToggle }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Pressable testID={`card-${housing.id}`} onPress={() => onPress(housing)}>
          <Text>{housing.title}</Text>
        </Pressable>
        <Pressable
          testID={`fav-${housing.id}`}
          onPress={() => onFavoriteToggle(housing.id, !housing.isFavorite)}
        />
      </View>
    );
  },
  HousingMarker: ({ housing, onPress, isSelected, displayCoordinate }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID={`housing-marker-${housing.id}`}
        onPress={() => onPress(housing)}
        {...({ isSelected, displayCoordinate } as any)}
      >
        <Text>{`H${housing.id}`}</Text>
      </Pressable>
    );
  },
};

export function makeHousing(over: Record<string, any> = {}) {
  return {
    id: 'h1',
    title: 'Depa Miraflores',
    price: 1500,
    currency: 'USD',
    district: 'Miraflores',
    bedrooms: 2,
    bathrooms: 1,
    total_area_sqm: 70,
    latitude: -12.12,
    longitude: -77.03,
    images: [],
    isFavorite: false,
    ...over,
  };
}

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
