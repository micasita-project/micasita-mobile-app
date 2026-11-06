import React, { forwardRef, useCallback, useContext, useRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { BottomSheetTextInput, useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { SheetKeyboardContext } from './SheetKeyboardContext';

/** Campo de texto que dentro de un panel inferior usa el de la librería para que el teclado lo respete. */
export const SheetTextInput = forwardRef<TextInput, TextInputProps>(function SheetTextInput(
  { onFocus, onBlur, onChangeText, ...props }, forwardedRef,
) {
  const insideSheet = !!useBottomSheetInternal(true);
  const keyboard = useContext(SheetKeyboardContext);
  const inputRef = useRef<TextInput | null>(null);
  const attachRef = useCallback((input: TextInput | null | undefined) => {
    const instance = input ?? null;
    inputRef.current = instance;
    if (typeof forwardedRef === 'function') forwardedRef(instance);
    else if (forwardedRef) forwardedRef.current = instance;
  }, [forwardedRef]);
  const Input = insideSheet ? BottomSheetTextInput : TextInput;
  return <Input
    {...props}
    ref={attachRef}
    onFocus={(event) => {
      if (inputRef.current) keyboard?.focus(inputRef.current);
      onFocus?.(event);
    }}
    onBlur={(event) => {
      if (inputRef.current) keyboard?.blur(inputRef.current);
      onBlur?.(event);
    }}
    onChangeText={(text) => {
      onChangeText?.(text);
      keyboard?.reveal();
    }}
  />;
});
