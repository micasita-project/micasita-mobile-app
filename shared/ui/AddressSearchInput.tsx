/**
 * @layer shared/ui
 * @description Autocomplete de dirección reutilizable.
 * - Debounce interno (400 ms)
 * - Sugerencias dentro del layout para que Android pueda enfocarlas y pulsarlas
 * - FlatList scrolleable con todas las sugerencias del API
 * - Mensaje "sin resultados" cuando la búsqueda no devuelve nada
 */

import { searchAddress, type GeocodeSuggestion } from '@/shared/api/geocode.service';
import { Colors } from '@/shared/config/colors';
import { Ionicons } from '@expo/vector-icons';
import { SheetTextInput } from '@/shared/ui/SheetTextInput';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AddressSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (suggestion: GeocodeSuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const DROPDOWN_MAX_HEIGHT = 110;
const INPUT_HEIGHT = 50;

export function AddressSearchInput({
  value,
  onChangeText,
  onSelect,
  placeholder = 'Buscar dirección...',
  autoFocus = false,
}: AddressSearchInputProps) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);
      if (timer.current) clearTimeout(timer.current);
      // Cada cambio invalida las respuestas de búsquedas anteriores.
      const id = ++requestId.current;
      if (text.trim().length < 3) {
        setSuggestions([]);
        setSearched(false);
        setOpen(false);
        setIsSearching(false);
        return;
      }
      setOpen(true);
      setIsSearching(true);
      timer.current = setTimeout(async () => {
        let results: GeocodeSuggestion[] = [];
        try {
          results = await searchAddress(text);
        } catch {
          results = [];
        }
        if (id !== requestId.current) return;
        setSuggestions(results);
        setSearched(true);
        setIsSearching(false);
      }, 400);
    },
    [onChangeText],
  );

  const handleSelect = useCallback(
    (s: GeocodeSuggestion) => {
      setSuggestions([]);
      setSearched(false);
      setOpen(false);
      onSelect(s);
    },
    [onSelect],
  );

  const handleBlur = useCallback(() => {
    // Grace period so a suggestion tap fires before we close
    setTimeout(() => setOpen(false), 160);
  }, []);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0 || (searched && value.trim().length >= 3)) {
      setOpen(true);
    }
  }, [suggestions.length, searched, value]);

  const showNoResults =
    open && searched && !isSearching && suggestions.length === 0 && value.trim().length >= 3;

  const showDropdown = open && (isSearching || suggestions.length > 0 || showNoResults);

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.icon} />
        <SheetTextInput
          testID="address-search-input"
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          autoFocus={autoFocus}
          returnKeyType="done"
        />
        {isSearching && (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.length > 0 ? (
            <ScrollView 
              style={{ maxHeight: DROPDOWN_MAX_HEIGHT }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.latitude}-${item.longitude}-${index}`}
                  testID={`address-suggestion-${index}`}
                  style={[
                    styles.item,
                    index === suggestions.length - 1 && styles.itemLast,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={16} color={Colors.primary} />
                  <Text style={styles.itemText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : showNoResults ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.noResultsText}>
                Sin resultados. Intenta con otra dirección o elige en el mapa.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 99,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    minHeight: INPUT_HEIGHT,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  spinner: { marginLeft: 8 },

  dropdown: {
    marginTop: 4,
    zIndex: 99,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemLast: { borderBottomWidth: 0 },
  itemText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
    lineHeight: 13,
  },

  noResults: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  noResultsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
