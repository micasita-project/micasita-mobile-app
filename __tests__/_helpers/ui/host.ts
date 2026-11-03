import { StyleSheet } from 'react-native';

/** Estilo aplanado de un elemento host (acepta arreglos anidados). */
export const flat = (el: { props: Record<string, any> }) => StyleSheet.flatten(el.props.style) ?? {};

/** Todos los elementos host de un tipo (p. ej. 'ActivityIndicator') bajo un nodo. */
export const allByType = (node: { queryAll: (p: (i: any) => boolean, o?: any) => any[] }, type: string) =>
  node.queryAll((i) => i.type === type, { includeSelf: true });

// Jest recoge todo lo que hay bajo __tests__; al ejecutarse solo, este archivo necesita una prueba.
if (expect.getState().testPath?.includes('/_helpers/')) {
  it('auxiliar', () => {});
}
