import React from 'react';
import { View, TextInput } from 'react-native';

/** Estado observable del panel simulado: llamadas de present/dismiss y últimas props recibidas. */
export const sheet = {
  present: jest.fn(),
  dismiss: jest.fn(),
  props: {} as Record<string, any>,
  mounts: 0,
  /** Valor que devuelve `useBottomSheetInternal` (null = fuera de un panel). */
  internal: null as unknown,
};

export function resetSheet() {
  sheet.props = {};
  sheet.mounts = 0;
  sheet.internal = null;
}

const BottomSheetModal = React.forwardRef(function BottomSheetModal(props: any, ref: any) {
  sheet.props = props;
  React.useImperativeHandle(ref, () => ({ present: sheet.present, dismiss: sheet.dismiss }));
  React.useEffect(() => {
    sheet.mounts += 1;
  }, []);
  const backdrop = props.backdropComponent?.({ animatedIndex: { value: 0 }, animatedPosition: { value: 0 }, style: {} });
  const footer = props.footerComponent?.({ animatedFooterPosition: { value: 0 } });
  return (
    <View testID="sheet-modal">
      {backdrop}
      {props.children}
      {footer}
    </View>
  );
});

/** Sustituto de `@gorhom/bottom-sheet`. */
export const gorhomModule = {
  BottomSheetModal,
  BottomSheetBackdrop: (props: any) => <View testID="sheet-backdrop" {...props} />,
  BottomSheetFooter: ({ children, ...rest }: any) => (
    <View testID="sheet-footer" {...rest}>
      {children}
    </View>
  ),
  BottomSheetScrollView: ({ children, ...rest }: any) => (
    <View testID="sheet-scroll" {...rest}>
      {children}
    </View>
  ),
  BottomSheetTextInput: (props: any) => <TextInput testID="sheet-text-input" {...props} />,
  useBottomSheetInternal: jest.fn((_safe?: boolean) => sheet.internal),
};

// Este archivo vive bajo __tests__; al ejecutarse solo necesita una prueba.
if (expect.getState().testPath?.includes('/_helpers/')) {
  it('auxiliar', () => {});
}
