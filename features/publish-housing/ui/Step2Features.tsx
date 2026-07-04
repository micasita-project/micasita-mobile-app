/**
 * @layer features/publish-housing/ui
 * @description Paso 2 — Características de la vivienda (HU18).
 * Tipo, precio, m² totales, m² cubiertos, habitaciones, baños, estacionamiento,
 * antigüedad y descripción — alineado al esquema del scraper.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/config/colors';
import type { HousingDraft } from '@/shared/types';

const PROPERTY_TYPES = ['Departamento', 'Casa', 'Habitación'];

interface Step2FeaturesProps {
  data: Pick<
    HousingDraft,
    | 'title' | 'property_type' | 'currency' | 'price'
    | 'total_area_sqm' | 'covered_area_sqm'
    | 'bedrooms' | 'bathrooms' | 'parking' | 'antiquity'
    | 'description' | 'phone'
  >;
  onChange: (partial: Partial<HousingDraft>) => void;
}

function CounterField({
  label, icon, value, min, max, onDecrement, onIncrement,
}: {
  label: string; icon: string; value: number;
  min: number; max: number;
  onDecrement: () => void; onIncrement: () => void;
}) {
  return (
    <View style={styles.counterCard}>
      <Ionicons name={icon as any} size={20} color={Colors.primary} />
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterControls}>
        <TouchableOpacity
          style={[styles.counterBtn, value <= min && styles.counterBtnDisabled]}
          onPress={onDecrement} disabled={value <= min}
        >
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.counterBtn, value >= max && styles.counterBtnDisabled]}
          onPress={onIncrement} disabled={value >= max}
        >
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function Step2Features({ data, onChange }: Step2FeaturesProps) {
  const phone = data.phone ?? '';
  const phoneError =
    phone.length > 0 && phone.length < 9
      ? 'Debe tener exactamente 9 dígitos'
      : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Título */}
      <Text style={styles.sectionTitle}>
        Título del anuncio <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Ej: Departamento Moderno en Surco"
          placeholderTextColor={Colors.textMuted}
          value={data.title}
          onChangeText={(v) => onChange({ title: v })}
          maxLength={80}
        />
      </View>
      <Text style={styles.charCount}>{data.title.length}/80</Text>

      {/* Tipo de propiedad */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        Tipo de propiedad <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.typeRow}>
        {PROPERTY_TYPES.map((pt) => {
          const icon = pt === 'Casa' ? 'home-outline' : pt === 'Habitación' ? 'bed-outline' : 'business-outline';
          return (
            <TouchableOpacity
              key={pt}
              style={[styles.typeCard, data.property_type === pt && styles.typeCardActive]}
              onPress={() => onChange({ property_type: pt })}
              activeOpacity={0.8}
            >
              <Ionicons name={icon as any} size={22} color={data.property_type === pt ? Colors.textOnPrimary : Colors.textSecondary} />
              <Text style={[styles.typeLabel, data.property_type === pt && styles.typeLabelActive]}>{pt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Precio */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Precio mensual</Text>
      <View style={styles.inputWrapper}>
        <Text style={styles.currencyPrefix}>{data.currency}</Text>
        <TextInput
          style={[styles.input, { paddingLeft: 6 }]}
          placeholder="3900"
          placeholderTextColor={Colors.textMuted}
          value={data.price > 0 ? data.price.toString() : ''}
          onChangeText={(v) => onChange({ price: parseFloat(v) || 0 })}
          keyboardType="numeric"
        />
        <Text style={styles.currencySuffix}>/mes</Text>
      </View>

      {/* Área total y cubierta */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        Área <Text style={styles.required}>* (Total m²)</Text>
      </Text>
      <View style={styles.rowTwo}>
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Ionicons name="resize-outline" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Total m²"
            placeholderTextColor={Colors.textMuted}
            value={data.total_area_sqm > 0 ? data.total_area_sqm.toString() : ''}
            onChangeText={(v) => onChange({ total_area_sqm: parseFloat(v) || 0 })}
            keyboardType="numeric"
          />
          <Text style={styles.currencySuffix}>total</Text>
        </View>
        <View style={{ width: 10 }} />
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Ionicons name="square-outline" size={16} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Cubierta m²"
            placeholderTextColor={Colors.textMuted}
            value={data.covered_area_sqm > 0 ? data.covered_area_sqm.toString() : ''}
            onChangeText={(v) => onChange({ covered_area_sqm: parseFloat(v) || 0 })}
            keyboardType="numeric"
          />
          <Text style={styles.currencySuffix}>cub.</Text>
        </View>
      </View>

      {/* Contadores */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Habitaciones y baños</Text>
      <View style={styles.countersGrid}>
        <CounterField label="Habitaciones" icon="bed-outline" value={data.bedrooms} min={1} max={10}
          onDecrement={() => onChange({ bedrooms: Math.max(1, data.bedrooms - 1) })}
          onIncrement={() => onChange({ bedrooms: Math.min(10, data.bedrooms + 1) })} />
        <CounterField label="Baños" icon="water-outline" value={data.bathrooms} min={1} max={8}
          onDecrement={() => onChange({ bathrooms: Math.max(1, data.bathrooms - 1) })}
          onIncrement={() => onChange({ bathrooms: Math.min(8, data.bathrooms + 1) })} />
      </View>

      {/* Estacionamiento y Antigüedad */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Estacionamiento y antigüedad</Text>
      <View style={styles.countersGrid}>
        <CounterField label="Estac." icon="car-outline" value={data.parking} min={0} max={5}
          onDecrement={() => onChange({ parking: Math.max(0, data.parking - 1) })}
          onIncrement={() => onChange({ parking: Math.min(5, data.parking + 1) })} />
        <View style={[styles.counterCard, { flex: 1 }]}>
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <Text style={styles.counterLabel}>Antigüedad (años)</Text>
          <View style={[styles.inputWrapper, { width: 90, paddingHorizontal: 8, paddingVertical: 0, marginTop: 4 }]}>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 18, fontWeight: '800', paddingVertical: 8 }]}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={data.antiquity > 0 ? data.antiquity.toString() : ''}
              onChangeText={(v) => onChange({ antiquity: parseInt(v) || 0 })}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>
      </View>

      {/* Descripción */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Descripción</Text>
      <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingVertical: 12 }]}>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe las características más destacadas de tu propiedad…"
          placeholderTextColor={Colors.textMuted}
          value={data.description}
          onChangeText={(v) => onChange({ description: v })}
          multiline numberOfLines={5} textAlignVertical="top"
          maxLength={1000}
        />
      </View>
      <Text style={[styles.charCount, { marginBottom: 20 }]}>{data.description.length}/1000</Text>

      {/* Teléfono de contacto */}
      <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Teléfono de contacto</Text>
      <View style={[styles.inputWrapper, phoneError ? styles.inputWrapperError : null]}>
        <Text style={styles.phonePrefix}>+51</Text>
        <View style={styles.phoneDivider} />
        <TextInput
          style={styles.input}
          placeholder="987654321"
          placeholderTextColor={Colors.textMuted}
          value={phone}
          onChangeText={(v) => onChange({ phone: v.replace(/\D/g, '').slice(0, 9) })}
          keyboardType="phone-pad"
          maxLength={9}
        />
        {phone.length === 9 && (
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
        )}
      </View>
      {phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}
      <Text style={[styles.charCount, { marginBottom: 32 }]}>{phone.length}/9 dígitos</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  required: { color: Colors.error },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 13 },
  textarea: { minHeight: 110, paddingVertical: 0 },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  currencyPrefix: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginRight: 2 },
  currencySuffix: { fontSize: 12, color: Colors.textMuted, marginLeft: 4 },
  inputWrapperError: { borderColor: Colors.error },
  phonePrefix: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginRight: 0 },
  phoneDivider: { width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 10 },
  fieldError: { fontSize: 11, color: Colors.error, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', paddingVertical: 16, gap: 6,
  },
  typeCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  typeLabelActive: { color: Colors.textOnPrimary },
  rowTwo: { flexDirection: 'row' },
  countersGrid: { flexDirection: 'row', gap: 12 },
  counterCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', paddingVertical: 14, gap: 6,
  },
  counterLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  counterBtnDisabled: { backgroundColor: Colors.border },
  counterBtnText: { fontSize: 18, fontWeight: '700', color: Colors.textOnPrimary, lineHeight: 22 },
  counterValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
});
