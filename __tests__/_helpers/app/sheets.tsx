import React from 'react';

/** `BottomSheet` de prueba: solo renderiza contenido y pie cuando `visible` es true. */
export const bottomSheetModule = {
  BottomSheet: ({ visible, children, footer, onClose }: any) => {
    const { View, Pressable } = require('react-native');
    if (!visible) return null;
    return (
      <View testID="bottom-sheet">
        <Pressable testID="sheet-close" onPress={onClose} />
        {children}
        {footer}
      </View>
    );
  },
};

export const sheetTextInputModule = {
  SheetTextInput: (props: any) => {
    const { TextInput } = require('react-native');
    return <TextInput {...props} />;
  },
};

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
