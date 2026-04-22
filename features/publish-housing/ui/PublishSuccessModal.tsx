/**
 * @layer features/publish-housing/ui
 * @description Modal de éxito tras publicar una vivienda (HU21).
 * Informa al usuario que el anuncio está en estado "Pendiente".
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';

interface PublishSuccessModalProps {
  visible: boolean;
  onViewMyListings: () => void;
  onClose: () => void;
}

export function PublishSuccessModal({
  visible,
  onViewMyListings,
  onClose,
}: PublishSuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>

          <Text style={styles.heading}>¡Publicado exitosamente!</Text>
          <Text style={styles.body}>
            Tu anuncio fue enviado y está en revisión.
          </Text>

          {/* Status badge */}
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={16} color={Colors.warning} />
            <Text style={styles.statusText}>Estado: Pendiente de validación</Text>
          </View>

          <Text style={styles.hint}>
            Nuestro equipo revisará tu anuncio en un plazo máximo de{' '}
            <Text style={styles.hintBold}>3 días hábiles</Text>.
            Recibirás una notificación con el resultado.
          </Text>

          {/* Process steps */}
          <View style={styles.processContainer}>
            {[
              { icon: 'cloud-upload-outline', label: 'Publicado', done: true },
              { icon: 'search-outline', label: 'En revisión', done: false },
              { icon: 'checkmark-done-outline', label: 'Aprobado', done: false },
            ].map((step, i) => (
              <View key={i} style={styles.processStep}>
                <View style={[styles.processIcon, step.done && styles.processIconDone]}>
                  <Ionicons
                    name={step.icon as any}
                    size={18}
                    color={step.done ? Colors.textOnPrimary : Colors.textMuted}
                  />
                </View>
                <Text style={[styles.processLabel, step.done && styles.processLabelDone]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.primaryBtn} onPress={onViewMyListings}>
            <Ionicons name="list-outline" size={18} color={Colors.textOnPrimary} />
            <Text style={styles.primaryBtnText}>Ver mis publicaciones</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>Volver a Viviendas</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warning + '20',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  hintBold: { fontWeight: '700', color: Colors.textPrimary },
  processContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
    width: '100%',
  },
  processStep: { alignItems: 'center', gap: 6 },
  processIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processIconDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  processLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },
  processLabelDone: { color: Colors.success, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
  secondaryBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
