import { createContext } from 'react';
import type { TextInput } from 'react-native';

export type SheetInputHandle = Pick<TextInput, 'measureInWindow'>;

export const SheetKeyboardContext = createContext<{
  focus: (input: SheetInputHandle) => void;
  blur: (input: SheetInputHandle) => void;
  reveal: () => void;
} | null>(null);

/** Posición de scroll necesaria para que el campo quede dentro del espacio útil. */
export function focusedInputScrollOffset({
  offset, inputTop, inputHeight, viewportTop, viewportBottom, keyboardTop, footerHeight,
}: {
  offset: number;
  inputTop: number;
  inputHeight: number;
  viewportTop: number;
  viewportBottom: number;
  keyboardTop: number;
  footerHeight: number;
}) {
  const top = viewportTop + 12;
  const bottom = Math.min(viewportBottom, keyboardTop) - footerHeight - 12;
  if (bottom <= top) return offset;
  if (inputTop < top) return Math.max(0, offset + inputTop - top);
  if (inputTop + inputHeight > bottom) {
    return Math.max(0, offset + Math.min(inputTop + inputHeight - bottom, inputTop - top));
  }
  return offset;
}
