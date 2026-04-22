/**
 * @layer shared/config
 * @description Cliente de Supabase centralizado.
 *
 * Usa las variables de entorno EXPO_PUBLIC_SUPABASE_URL y
 * EXPO_PUBLIC_SUPABASE_ANON_KEY definidas en .env
 *
 * Esquema en Supabase:
 * - Tabla: published_housing
 * - Storage bucket: housing-images (público)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Supabase] Faltan las variables EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
    'Configúralas en tu archivo .env para habilitar el módulo de publicación.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Nombre del bucket de Storage para imágenes de viviendas */
export const HOUSING_IMAGES_BUCKET = 'housing-images';
