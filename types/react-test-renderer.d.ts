// No hay @types/react-test-renderer instalado (y no aporta nada usarlo solo
// para este archivo de test). Declaración mínima con lo que se usa acá.
declare module 'react-test-renderer' {
  export function create(element: React.ReactElement): unknown;
  export function act(callback: () => void | Promise<void>): void;
}
