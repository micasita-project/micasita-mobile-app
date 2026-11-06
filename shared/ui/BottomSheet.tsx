import React, { Children, forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions, type ScrollViewProps } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/config/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Contenido del panel; el panel lo desplaza si no cabe. */
  children: ReactNode;
  /**
   * Tope de altura como fracción de la pantalla. El panel crece con su
   * contenido hasta este valor. Default 0.9.
   */
  maxHeightRatio?: number;
  /** Se llama cuando el panel ya se cerró del todo. */
  onClosed?: () => void;
  /** Barra fija en la parte inferior del panel. */
  footer?: ReactNode;
  /** Arrastre desde el contenido; desactivado por defecto para que los formularios puedan desplazarse. El asa siempre permite arrastrar el panel. */
  contentPanning?: boolean;
}

/**
 * Scroll del panel sin el relleno final que KeyboardAwareScrollView añade con el
 * alto del teclado: el panel ya sube sobre el teclado, así que ese relleno solo
 * dejaría espacio en blanco al final.
 */
const SheetScrollView = forwardRef<any, ScrollViewProps>(function SheetScrollView({ children, ...rest }, ref) {
  const items = Children.toArray(children);
  return (
    <BottomSheetScrollView {...(rest as any)} ref={ref}>
      {items.slice(0, -1)}
    </BottomSheetScrollView>
  );
});

export function BottomSheet({
  visible,
  onClose,
  onClosed,
  children,
  footer,
  maxHeightRatio = 0.9,
  contentPanning = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const closedByPropRef = useRef(false);
  const phase = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const wantsVisible = useRef(visible);
  wantsVisible.current = visible;
  const [footerHeight, setFooterHeight] = useState(0);

  const present = useCallback(() => {
    if (!sheetRef.current || phase.current !== 'closed') return;
    closedByPropRef.current = false;
    phase.current = 'opening';
    sheetRef.current.present();
  }, []);

  const dismiss = useCallback(() => {
    // Gorhom schedules present() on the next frame. Wait for onChange before
    // dismissing an opening panel, otherwise its pending present can resurrect it.
    if (phase.current !== 'open') return;
    closedByPropRef.current = true;
    phase.current = 'closing';
    sheetRef.current?.dismiss();
  }, []);

  useEffect(() => {
    if (visible) present();
    else dismiss();
  }, [visible, present, dismiss]);

  const handleChange = useCallback((index: number) => {
    if (index >= 0 && phase.current !== 'closing') {
      phase.current = 'open';
      if (!wantsVisible.current) dismiss();
    }
  }, [dismiss]);

  // Botón atrás de Android cierra el panel.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const handleDismiss = useCallback(() => {
    const requestedClose = closedByPropRef.current;
    phase.current = 'closed';
    closedByPropRef.current = false;
    // An open requested while the previous close was animating must survive
    // that old modal's onDismiss callback.
    if (requestedClose && wantsVisible.current) {
      present();
      return;
    }
    if (!requestedClose) onClose();
    onClosed?.();
  }, [onClose, onClosed, present]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          {footer}
        </View>
      </BottomSheetFooter>
    ),
    [footer, insets.bottom],
  );

  return (
    <BottomSheetModal
      accessible={false}
      ref={sheetRef}
      enableDynamicSizing
      maxDynamicContentSize={screenHeight * maxHeightRatio}
      topInset={insets.top + 20}
      enablePanDownToClose
      enableContentPanningGesture={contentPanning}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      // Edge-to-edge Android windows can overlay the IME instead of resizing.
      // Let the sheet account for the keyboard height itself.
      android_keyboardInputMode="adjustPan"
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={handleDismiss}
      onChange={handleChange}
      handleStyle={styles.handleArea}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      style={styles.sheet}
    >
      {/* Desplaza al campo enfocado cuadro a cuadro con la animación del teclado. */}
      <KeyboardAwareScrollView
        ScrollViewComponent={SheetScrollView}
        bottomOffset={(footer ? footerHeight : 0) + 16}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footer ? footerHeight : insets.bottom + 16 }}
      >
        {children}
      </KeyboardAwareScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handleArea: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  footerContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
