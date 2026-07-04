/**
 * @layer features/publish-housing/ui
 * @description Wizard contenedor — gestiona los 4 pasos y el submit final.
 * Orquesta Step1..Step4 + StepIndicator + PublishSuccessModal.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from '@/shared/ui/StepIndicator';
import { MapPickerModal } from '@/widgets/location-picker/MapPickerModal';
import { LIMA_REGION } from '@/shared/config/map';
import { usePublishForm } from '../model/usePublishForm';
import { Step1Location } from './Step1Location';
import { Step2Features } from './Step2Features';
import { Step3Photos } from './Step3Photos';
import { Step4Amenities } from './Step4Amenities';
import { PublishSuccessModal } from './PublishSuccessModal';
import { Colors } from '@/shared/config/colors';
import { useAuth } from '@/features/auth';
import { getPublishDraft, savePublishDraft, clearPublishDraft } from '../model/publishDraft.storage';

const STEP_LABELS = ['Ubicación', 'Características', 'Fotos', 'Amenidades'];

function validateStep(step: number, draft: ReturnType<typeof usePublishForm>['draft']): string | null {
  switch (step) {
    case 1:
      if (!draft.address.trim()) return 'Por favor ingresa la dirección.';
      if (!draft.district) return 'Por favor selecciona el distrito.';
      return null;
    case 2:
      if (!draft.title.trim()) return 'Por favor ingresa el título del anuncio.';
      if (draft.price <= 0) return 'El precio debe ser mayor a 0.';
      if (draft.total_area_sqm <= 0) return 'El área total debe ser mayor a 0 m².';
      if (!draft.description.trim()) return 'Por favor agrega una descripción.';
      if (draft.phone && draft.phone.trim().length > 0 && draft.phone.trim().length !== 9)
        return 'El teléfono de contacto debe tener exactamente 9 dígitos.';
      return null;
    case 3:
      if (draft.localImageUris.length === 0)
        return 'Por favor agrega al menos una foto de la propiedad.';
      return null;
    case 4:
      return null; // Amenidades son opcionales
    default:
      return null;
  }
}

export interface PublishWizardProps {
  initialDraft?: ReturnType<typeof usePublishForm>['draft'];
  propertyId?: string;
}

export function PublishWizard({ initialDraft, propertyId }: PublishWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { currentStep, draft, isSubmitting, error, updateDraft, nextStep, prevStep, submit, update, reset } =
    usePublishForm(initialDraft, propertyId);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const isPublishedRef = useRef(false);

  // Cargar borrador al montar si no es edición
  useEffect(() => {
    const checkDraft = async () => {
      if (propertyId) return;

      const savedDraft = await getPublishDraft();
      if (savedDraft) {
        Alert.alert(
          'Borrador encontrado',
          'Tienes un borrador anterior sin publicar. ¿Deseas recuperarlo?',
          [
            {
              text: 'Ignorar',
              onPress: () => clearPublishDraft(),
              style: 'cancel',
            },
            {
              text: 'Recuperar',
              onPress: () => updateDraft(savedDraft),
            },
          ]
        );
      }
    };
    checkDraft();
  }, [propertyId]);

  // Guardar borrador al salir de la pantalla
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Al "desenfocar" (salir), si no es edición y NO se ha publicado con éxito, guardamos
        if (!propertyId && !isPublishedRef.current) {
          savePublishDraft(draft);
        }
      };
    }, [draft, propertyId])
  );

  const handleNext = () => {
    const validationError = validateStep(currentStep, draft);
    if (validationError) {
      Alert.alert('Datos incompletos', validationError);
      return;
    }
    nextStep();
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes estar autenticado para publicar.');
      return;
    }
    const validationError = validateStep(4, draft);
    if (validationError) {
      Alert.alert('Datos incompletos', validationError);
      return;
    }
    
    let success = false;
    if (propertyId) {
      success = await update(propertyId);
    } else {
      success = await submit(String(user.id), user.email);
    }

    if (success) {
      isPublishedRef.current = true; // Marcar como publicado para evitar guardado accidental en el blur
      setShowSuccess(true);
      if (!propertyId) {
        await clearPublishDraft();
      }
    } else {
      Alert.alert(propertyId ? 'Error al actualizar' : 'Error al publicar', error ?? 'Intenta de nuevo más tarde.');
    }
  };

  const handleViewMyListings = () => {
    setShowSuccess(false);
    reset();
    router.replace('/my-listings');
  };

  const handleClose = () => {
    setShowSuccess(false);
    reset();
    router.back();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Location
            data={{ address: draft.address, district: draft.district, latitude: draft.latitude, longitude: draft.longitude }}
            onChange={updateDraft}
            onOpenMapPicker={() => setShowMapPicker(true)}
          />
        );
      case 2:
        return (
          <Step2Features
            data={{
              title: draft.title,
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
              phone: draft.phone,
            }}
            onChange={updateDraft}
          />
        );
      case 3:
        return (
          <Step3Photos
            data={{ localImageUris: draft.localImageUris }}
            onChange={updateDraft}
          />
        );
      case 4:
        return (
          <Step4Amenities
            data={{ features: draft.features }}
            onChange={updateDraft}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          {currentStep === 1 && (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.textOnPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>{propertyId ? 'Editar vivienda' : 'Publicar vivienda'}</Text>
            <Text style={styles.headerSubtitle}>Paso {currentStep} de 4</Text>
          </View>
        </View>
      </View>

      {/* Step Indicator */}
      <View style={styles.indicatorWrapper}>
        <StepIndicator
          totalSteps={4}
          currentStep={currentStep}
          labels={STEP_LABELS}
        />
      </View>

      {/* Step content */}
      <View style={styles.content}>{renderStep()}</View>

      {/* Navigation */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={prevStep} disabled={isSubmitting}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            <Text style={styles.backBtnText}>Atrás</Text>
          </TouchableOpacity>
        )}

        {currentStep < 4 ? (
          <TouchableOpacity
            style={[styles.nextBtn, currentStep === 1 && styles.nextBtnFull]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Siguiente</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.textOnPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.textOnPrimary} />
                <Text style={styles.nextBtnText}>{propertyId ? 'Actualizar anuncio' : 'Publicar anuncio'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <PublishSuccessModal
        visible={showSuccess}
        onViewMyListings={handleViewMyListings}
        onClose={handleClose}
        isEdit={!!propertyId}
      />
      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(suggestion) => {
          updateDraft({
            address: suggestion.display_name,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            district: suggestion.district || 'Lima',
          });
          setShowMapPicker(false);
        }}
        initialRegion={
          draft.latitude && draft.longitude
            ? { latitude: draft.latitude, longitude: draft.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : LIMA_REGION
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textOnPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textOnPrimary + 'BB', marginTop: 2 },
  indicatorWrapper: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  content: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  nextBtnFull: { flex: 1 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnPrimary },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.6 },
});
