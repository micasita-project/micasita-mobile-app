import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { BottomSheetTextInput, useBottomSheetInternal } from '@gorhom/bottom-sheet';

/** Campo de texto que dentro de un panel inferior usa el de la librería para que el teclado lo respete. */
export const SheetTextInput = forwardRef<TextInput, TextInputProps>(function SheetTextInput(props, ref) {
  const insideSheet = !!useBottomSheetInternal(true);
  const Input = insideSheet ? BottomSheetTextInput : TextInput;
  return <Input {...props} ref={ref as any} />;
});
