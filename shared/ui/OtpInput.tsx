/**
 * @layer shared/ui
 * @description Input de código OTP con casillas separadas.
 * - Escribes un dígito y salta automáticamente a la siguiente casilla.
 * - Backspace en una casilla vacía retrocede y borra la anterior.
 * - Al pegar el código completo se distribuye entre todas las casillas.
 */

import React, { useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const inputs = useRef<Array<TextInput | null>>([]);

  const focusBox = (index: number) => {
    const i = Math.max(0, Math.min(index, length - 1));
    inputs.current[i]?.focus();
  };

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, "");

    // ── Pegado / multi-dígito: distribuir desde el inicio ──────────
    if (digits.length > 1) {
      const next = digits.slice(0, length);
      onChange(next);
      if (next.length >= length) {
        Keyboard.dismiss();
        onComplete?.(next);
      } else {
        focusBox(next.length);
      }
      return;
    }

    // ── Un solo dígito ─────────────────────────────────────────────
    if (digits.length === 1) {
      const next =
        index >= value.length
          ? (value + digits).slice(0, length)
          : (value.slice(0, index) + digits + value.slice(index + 1)).slice(
              0,
              length,
            );
      onChange(next);

      if (index < length - 1) {
        focusBox(index + 1);
      } else {
        inputs.current[index]?.blur();
      }

      if (next.length === length) {
        Keyboard.dismiss();
        onComplete?.(next);
      }
      return;
    }

    // ── Borrado dentro de la casilla actual ────────────────────────
    if (index < value.length) {
      onChange(value.slice(0, index) + value.slice(index + 1));
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && value.length > 0) {
      onChange(value.slice(0, -1));
      focusBox(Math.max(0, value.length - 1));
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          testID="otp-box"
          ref={(el) => {
            inputs.current[i] = el;
          }}
          style={[
            styles.box,
            value[i] ? styles.boxFilled : null,
            disabled && styles.boxDisabled,
          ]}
          value={value[i] ?? ""}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus={autoFocus && i === 0}
          editable={!disabled}
          selectTextOnFocus
          textContentType="oneTimeCode"
          returnKeyType="done"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  boxFilled: {
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  boxDisabled: {
    opacity: 0.5,
  },
});
