/**
 * @layer features/publish-housing
 * @description Servicio para publicar viviendas usando Supabase.
 *
 * Supabase schema requerido:
 * ─────────────────────────────────────────────────
 * Tabla: published_housing
 *   id            uuid PK default gen_random_uuid()
 *   user_id       text NOT NULL
 *   user_email    text NOT NULL
 *   status        text DEFAULT 'pending'   -- 'pending' | 'approved' | 'rejected'
 *   title         text NOT NULL
 *   address       text NOT NULL
 *   district      text NOT NULL
 *   latitude      float8 NOT NULL
 *   longitude     float8 NOT NULL
 *   type          text NOT NULL            -- 'apartment' | 'house' | 'room'
 *   price         int4 NOT NULL
 *   area          int4 NOT NULL
 *   bedrooms      int4 NOT NULL
 *   bathrooms     int4 NOT NULL
 *   description   text
 *   images        text[]  DEFAULT '{}'
 *   features      text[]  DEFAULT '{}'
 *   created_at    timestamptz DEFAULT now()
 *   updated_at    timestamptz DEFAULT now()
 *
 * Storage bucket: housing-images (público)
 * ─────────────────────────────────────────────────
 */

import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase, HOUSING_IMAGES_BUCKET } from '@/shared/config/supabase';
import type { HousingDraft, PublishedHousing, ListingStatus } from '@/shared/types';

// ── Helpers ────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): PublishedHousing {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: row.user_email as string,
    status: row.status as ListingStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    address: row.address as string,
    district: row.district as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    title: row.title as string,
    property_type: row.property_type as string,
    currency: (row.currency as string) ?? 'PEN',
    price: row.price as number,
    total_area_sqm: row.total_area_sqm as number,
    covered_area_sqm: row.covered_area_sqm as number | undefined,
    bedrooms: row.bedrooms as number,
    bathrooms: row.bathrooms as number,
    parking: row.parking as number | undefined,
    antiquity: row.antiquity as number | undefined,
    description: row.description as string,
    images: (row.images as string[]) ?? [],
    features: (row.features as string[]) ?? [],
    source_url: row.source_url as string | undefined,
  };
}

// ── Upload image to Supabase Storage ───────────────────────────

async function uploadImage(uri: string, userId: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);
  const ext = uri.split('.').pop() ?? 'jpg';
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(HOUSING_IMAGES_BUCKET)
    .upload(fileName, arrayBuffer, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

  const { data } = supabase.storage.from(HOUSING_IMAGES_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Publica una vivienda: sube imágenes a Storage y guarda en tabla.
 * El anuncio queda en estado "pending" (HU21).
 */
export async function submitHousingListing(
  draft: HousingDraft,
  userId: string,
  userEmail: string
): Promise<PublishedHousing> {
  // 1. Subir imágenes
  const imageUrls = await Promise.all(
    draft.localImageUris.map((uri) => uploadImage(uri, userId))
  );

  // 2. Insertar registro
  const { data, error } = await supabase
    .from('published_housing')
    .insert({
      user_id: userId,
      user_email: userEmail,
      status: 'pending',
      title: draft.title,
      address: draft.address,
      district: draft.district,
      latitude: draft.latitude,
      longitude: draft.longitude,
      property_type: draft.property_type,
      currency: draft.currency,
      price: draft.price,
      total_area_sqm: draft.total_area_sqm,
      covered_area_sqm: draft.covered_area_sqm,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      parking: draft.parking,
      antiquity: draft.antiquity,
      description: draft.description,
      images: imageUrls,
      features: draft.features,
    })
    .select()
    .single();

  if (error) throw new Error(`Error publicando vivienda: ${error.message}`);

  return mapRow(data as Record<string, unknown>);
}

/**
 * Obtiene las publicaciones del usuario autenticado (HU22).
 */
export async function getMyListings(userId: string): Promise<PublishedHousing[]> {
  const { data, error } = await supabase
    .from('published_housing')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error obteniendo publicaciones: ${error.message}`);

  return (data as Record<string, unknown>[]).map(mapRow);
}

/**
 * Actualiza el estado de una publicación (admin) (HU24).
 */
export async function updateListingStatus(
  id: string,
  status: ListingStatus
): Promise<void> {
  const { error } = await supabase
    .from('published_housing')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Error actualizando estado: ${error.message}`);
}
