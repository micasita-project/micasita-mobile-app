import React from 'react';

/** Componente de prueba que muestra su nombre y expone las props recibidas a través de `lastProps`. */
export function makeStub(name: string) {
  const { Text } = require('react-native');
  const stub: any = jest.fn((props: any) => {
    stub.lastProps = props;
    return <Text testID={`stub-${name}`}>{name}</Text>;
  });
  stub.lastProps = undefined;
  return stub as jest.Mock & { lastProps: any };
}

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
