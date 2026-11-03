import React from 'react';

/**
 * FlatList simplificada: pinta cabecera, ítems, vacío y pie; el botón `end-reached`
 * dispara `onEndReached` y `refresh` dispara `onRefresh`.
 */
export const flatListModule = {
  __esModule: true,
  default: function FlatList(props: any) {
    const { View, Pressable } = require('react-native');
    const { data = [], renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent, ListFooterComponent } = props;
    const render = (c: any) => (typeof c === 'function' ? c() : c);
    return (
      <View testID="flat-list">
        {render(ListHeaderComponent)}
        {data.length === 0
          ? render(ListEmptyComponent)
          : data.map((item: any, index: number) => (
              <View key={keyExtractor ? keyExtractor(item, index) : index}>{renderItem({ item, index })}</View>
            ))}
        {render(ListFooterComponent)}
        <Pressable testID="end-reached" onPress={() => props.onEndReached?.({ distanceFromEnd: 0 })} />
        <Pressable testID="refresh" onPress={() => (props.onRefresh ?? props.refreshControl?.props?.onRefresh)?.()} />
      </View>
    );
  },
};

/** ActivityIndicator con testID para detectar spinners. */
export const activityIndicatorModule = {
  __esModule: true,
  default: function ActivityIndicator() {
    const { View } = require('react-native');
    return <View testID="spinner" />;
  },
};

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
