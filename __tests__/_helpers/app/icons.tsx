import React from 'react';

/** Ionicons como `<Text testID="icon-<nombre>">` para localizar y pulsar botones por su icono. */
export const iconsModule = {
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`} />;
  },
};

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
