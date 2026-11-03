import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

/** Sugerencia de geocodificación válida dentro de Lima. */
export const makeSuggestion = (over: Record<string, any> = {}) => ({
  display_name: 'Av. Javier Prado 1234, San Isidro, Lima',
  latitude: -12.09,
  longitude: -77.03,
  place_type: 'address',
  ...over,
});

/** Sugerencia que entrega el sustituto de AddressSearchInput al pulsar "pick". */
const picker = { next: makeSuggestion() };
export const setNextSuggestion = (s: Record<string, any>) => {
  picker.next = s as any;
};
export const resetNextSuggestion = () => {
  picker.next = makeSuggestion();
};

/** Sustituto de `@/shared/ui/BottomSheet`: pinta contenido y pie solo si está visible. */
export const bottomSheetModule = {
  BottomSheet: ({ visible, onClose, children, footer }: any) =>
    visible ? (
      <View testID="bottom-sheet">
        {children}
        {footer}
        <TouchableOpacity testID="sheet-dismiss" onPress={onClose}>
          <Text>sheet-dismiss</Text>
        </TouchableOpacity>
      </View>
    ) : null,
};

export const sheetTextInputModule = {
  SheetTextInput: (props: any) => <TextInput {...props} />,
};

/** Sustituto de `@/shared/ui/AddressSearchInput`: un campo de texto y un botón que elige la sugerencia preparada. */
export const addressSearchModule = {
  AddressSearchInput: ({ value, onChangeText, onSelect, placeholder }: any) => (
    <View>
      <TextInput testID="address-input" value={value} onChangeText={onChangeText} placeholder={placeholder} />
      <TouchableOpacity testID="address-pick" onPress={() => onSelect(picker.next)}>
        <Text>pick</Text>
      </TouchableOpacity>
    </View>
  ),
};

/** Sustituto de `@/widgets/location-picker/MapPickerModal`: expone sus props y confirma la sugerencia preparada. */
export const mapPickerModule = {
  MapPickerModal: ({ visible, onClose, onConfirm, title, instruction, initialRegion }: any) =>
    visible ? (
      <View testID="map-picker">
        <Text testID="map-picker-title">{title}</Text>
        <Text testID="map-picker-instruction">{instruction}</Text>
        <Text testID="map-picker-region">{JSON.stringify(initialRegion ?? null)}</Text>
        <TouchableOpacity testID="map-picker-confirm" onPress={() => onConfirm(picker.next)}>
          <Text>confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="map-picker-close" onPress={onClose}>
          <Text>close</Text>
        </TouchableOpacity>
      </View>
    ) : null,
};

/** Sustituto del control deslizante: se mueve con `fireEvent(el, 'valueChange', n)`. */
export const sliderModule = {
  __esModule: true,
  default: (props: any) => <View testID="radius-slider" {...props} />,
};

/** Mando del mapa simulado. */
export const mapHandle = { animateToRegion: jest.fn() };

/** Sustituto de `@/shared/ui/map`: expone región inicial y marcador como props de elementos host. */
export const mapModule = {
  AppMapView: React.forwardRef(function AppMapView({ children, initialRegion, onRegionChangeComplete }: any, ref: any) {
    React.useImperativeHandle(ref, () => mapHandle);
    return (
      <View testID="map" {...({ initialRegion, onRegionChangeComplete } as any)}>
        {children}
      </View>
    );
  }),
  AppMarker: ({ coordinate }: any) => <View testID="marker" {...({ coordinate } as any)} />,
};

// Jest también ejecuta este archivo como suite; la prueba omitida evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
