/**
 * @layer shared/ui
 * @description Input de código OTP con casillas separadas.
 * Un único campo de texto invisible recibe lo que se escribe o se pega y las
 * casillas solo lo muestran, así que un código pegado se reparte siempre
 * entre todas las casillas.
 */

import React, { useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/** Deja solo los dígitos; si se pegó un código completo detrás de lo ya escrito, usa el pegado. */
export function normalizeOtp(text: string, current: string, length: number): string {
  const digits = text.replace(/\D/g, "");
  if (current && digits.startsWith(current)) {
    const inserted = digits.slice(current.length);
    if (inserted.length >= length) return inserted.slice(0, length);
  }
  return digits.slice(0, length);
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const next = normalizeOtp(text, value, length);
    onChange(next);
    if (next.length === length && next !== value) {
      Keyboard.dismiss();
      onComplete?.(next);
    }
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            testID="otp-box"
            // Mantiene el padre nativo del dígito al cambiar opacidad/foco en Fabric.
            collapsable={false}
            style={[
              styles.box,
              value[i] ? styles.boxFilled : null,
              focused && i === activeIndex ? styles.boxActive : null,
              disabled && styles.boxDisabled,
            ]}
          >
            <Text testID="otp-digit" style={styles.digit}>
              {value[i] ?? ""}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        testID="otp-input"
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={32}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        selectionColor="transparent"
        cursorColor="transparent"
        underlineColorAndroid="transparent"
        contextMenuHidden={false}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  box: {
    flex: 1,
    maxWidth: 56,
    height: 58,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: {
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  boxActive: {
    borderColor: "#FFFFFF",
    borderWidth: 2,
  },
  boxDisabled: {
    opacity: 0.5,
  },
  digit: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  input: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    color: "transparent",
    backgroundColor: "transparent",
  },
});
