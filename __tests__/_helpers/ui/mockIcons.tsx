import React from 'react';
import { View } from 'react-native';

/** Sustituye a Ionicons: expone cada icono como `icon-<nombre>` con sus props. */
export function Ionicons(props: { name: string; [key: string]: unknown }) {
  return <View {...props} testID={`icon-${props.name}`} />;
}

// Jest recoge todo lo que hay bajo __tests__; al ejecutarse solo, este archivo necesita una prueba.
if (expect.getState().testPath?.includes('/_helpers/')) {
  it('auxiliar', () => {});
}
