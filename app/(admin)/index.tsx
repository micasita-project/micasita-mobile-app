import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Colors } from '@/shared/config/colors';
import { Ionicons } from '@expo/vector-icons';
import { getPendingProperties, updatePropertyStatus } from '@/features/admin/api/admin.api';
import { AdminPropertyCard } from '@/features/admin/ui/AdminPropertyCard';
import type { Housing } from '@/shared/types';
import { useFocusEffect, useRouter } from 'expo-router';

type PendingProperty = Housing & { status: string; publisher_id: number };

export default function AdminPendingPropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const fetchProperties = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      const data = await getPendingProperties();
      setProperties(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las viviendas pendientes.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [fetchProperties])
  );

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, confirmar', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const handleApprove = (id: string) => {
    confirmAction(
      'Aprobar Vivienda',
      '¿Estás seguro de que deseas aprobar esta vivienda? Será visible para todos los usuarios.',
      async () => {
        try {
          await updatePropertyStatus(id, 'approved');
          setProperties((prev) => prev.filter((p) => p.id !== id));
          Alert.alert('Aprobada', 'La vivienda ha sido aprobada.');
        } catch (error) {
          Alert.alert('Error', 'No se pudo aprobar la vivienda.');
        }
      }
    );
  };

  const handleReject = (id: string) => {
    setSelectedPropertyId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const submitReject = async () => {
    if (!selectedPropertyId) return;
    if (!rejectReason.trim()) {
      Alert.alert('Motivo requerido', 'Debes ingresar un motivo para rechazar la vivienda.');
      return;
    }

    try {
      await updatePropertyStatus(selectedPropertyId, 'rejected', rejectReason.trim());
      setProperties((prev) => prev.filter((p) => p.id !== selectedPropertyId));
      setRejectModalVisible(false);
      Alert.alert('Rechazada', 'La vivienda ha sido rechazada.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo rechazar la vivienda.');
    }
  };

  const handleCardPress = (property: Housing) => {
    router.push({
      pathname: '/housing-detail',
      params: { id: property.id, data: JSON.stringify(property) }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AdminPropertyCard
            property={item}
            onApprove={handleApprove}
            onReject={handleReject}
            onPress={handleCardPress}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={() => fetchProperties(true)} 
            colors={[Colors.primary]} 
            tintColor={Colors.primary} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Todo al día</Text>
            <Text style={styles.emptyText}>No hay viviendas pendientes por revisar.</Text>
          </View>
        }
      />

      {/* Modal para motivo de rechazo */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalInnerOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Rechazar Vivienda</Text>
                <Text style={styles.modalMessage}>Por favor, indica el motivo del rechazo. Este mensaje será enviado al propietario para que pueda corregirlo.</Text>
                
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Las fotos no son claras..."
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={Colors.textMuted}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => setRejectModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSubmit]}
                    onPress={submitReject}
                  >
                    <Text style={styles.modalBtnSubmitText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalInnerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnSubmit: {
    backgroundColor: Colors.error,
  },
  modalBtnSubmitText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
});
