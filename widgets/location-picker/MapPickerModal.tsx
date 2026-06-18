import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { AppMapView } from '@/shared/ui/map';
import type { MapRegion } from '@/shared/ui/map';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import { LIMA_REGION } from '@/shared/config/map';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reverseAddress, GeocodeSuggestion } from '@/shared/api/geocode.service';

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (suggestion: GeocodeSuggestion) => void;
  initialRegion?: MapRegion;
  title?: string;
  instruction?: string;
}

export function MapPickerModal({
  visible,
  onClose,
  onConfirm,
  initialRegion,
  title = "Seleccionar ubicación",
  instruction = "Mueve el mapa para ubicar el punto exacto",
}: MapPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [mapRegion, setMapRegion] = useState<MapRegion>(initialRegion || LIMA_REGION);
  const [isReversing, setIsReversing] = useState(false);

  const handleConfirm = async () => {
    setIsReversing(true);
    try {
      const suggestion = await reverseAddress(mapRegion.latitude, mapRegion.longitude);
      onConfirm(suggestion);
    } catch {
      Alert.alert(
        "Error",
        "No se pudo obtener la dirección. Intenta mover el mapa y vuelve a intentarlo.",
        [{ text: "Entendido" }]
      );
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <AppMapView
          style={{ flex: 1 }}
          initialRegion={initialRegion || LIMA_REGION}
          onRegionChangeComplete={setMapRegion}
        />
        
        <View style={styles.mapCenterMarker} pointerEvents="none">
          <Ionicons name="location" size={40} color={Colors.primary} style={{ marginTop: -20 }} />
        </View>

        <TouchableOpacity 
          style={[styles.closeBtn, { top: insets.top + 10 }]} 
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.instruction}>{instruction}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmBtn} 
              onPress={handleConfirm}
              disabled={isReversing}
            >
              {isReversing ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.confirmText}>Confirmar ubicación</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mapCenterMarker: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  instruction: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
});
