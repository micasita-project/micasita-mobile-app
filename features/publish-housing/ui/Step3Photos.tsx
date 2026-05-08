/**
 * @layer features/publish-housing/ui
 * @description Paso 3 — Subir fotos del inmueble (HU19).
 * Usa expo-image-picker para seleccionar hasta 5 imágenes del dispositivo.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import type { HousingDraft } from '@/shared/types';

const MAX_PHOTOS = 5;

interface Step3PhotosProps {
  data: Pick<HousingDraft, 'localImageUris'>;
  onChange: (partial: Partial<HousingDraft>) => void;
}

export function Step3Photos({ data, onChange }: Step3PhotosProps) {
  const { localImageUris } = data;

  const pickImages = useCallback(async () => {
    if (localImageUris.length >= MAX_PHOTOS) {
      Alert.alert('Límite alcanzado', `Puedes subir máximo ${MAX_PHOTOS} fotos.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para subir fotos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - localImageUris.length,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      onChange({ localImageUris: [...localImageUris, ...newUris].slice(0, MAX_PHOTOS) });
    }
  }, [localImageUris, onChange]);

  const removeImage = useCallback(
    (index: number) => {
      const updated = localImageUris.filter((_, i) => i !== index);
      onChange({ localImageUris: updated });
    },
    [localImageUris, onChange]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>
        Fotos de la propiedad <Text style={styles.required}>*</Text>
      </Text>
      <Text style={styles.subtitle}>
        Agrega hasta {MAX_PHOTOS} fotos. La primera será la foto principal del anuncio.
      </Text>

      {/* Upload area */}
      <TouchableOpacity style={styles.uploadArea} onPress={pickImages} activeOpacity={0.8}>
        <Ionicons name="camera-outline" size={36} color={Colors.primary} />
        <Text style={styles.uploadText}>
          {localImageUris.length === 0
            ? 'Toca para agregar fotos'
            : `Agregar más fotos (${localImageUris.length}/${MAX_PHOTOS})`}
        </Text>
        <Text style={styles.uploadHint}>JPG, PNG — hasta 10 MB por foto</Text>
      </TouchableOpacity>

      {/* Grid de fotos seleccionadas */}
      {localImageUris.length > 0 && (
        <>
          <Text style={styles.gridTitle}>Fotos seleccionadas</Text>
          <View style={styles.grid}>
            {localImageUris.map((uri, index) => (
              <View key={uri} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                {index === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Principal</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {localImageUris.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            Agregar fotos aumenta un 70% las consultas de tu anuncio
          </Text>
        </View>
      )}

      <View style={styles.tipBox}>
        <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
        <Text style={styles.tipText}>
          Tip: Toma fotos con buena iluminación natural. Incluye sala, cocina, dormitorios y baños.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  required: { color: Colors.error },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: Colors.primary + '08',
  },
  uploadText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  uploadHint: { fontSize: 12, color: Colors.textMuted },
  gridTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 20, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { width: '47%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.primary + 'CC',
    paddingVertical: 4,
    alignItems: 'center',
  },
  mainBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.textOnPrimary },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
  tipBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.warning + '15',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});
