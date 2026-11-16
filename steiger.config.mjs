import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Carpetas fuera de la arquitectura FSD.
    ignores: ['**/__tests__/**', 'e2e/**', 'ios/**', 'android/**', 'plugins/**', 'scripts/**', 'types/**', 'docs/**', 'assets/**'],
  },
  {
    // `types/` guarda declaraciones globales de TypeScript, no es una capa.
    rules: { 'fsd/typo-in-layer-name': 'off' },
  },
]);
