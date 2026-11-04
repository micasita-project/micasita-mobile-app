import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Dimensions, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/config/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
  /** Si es false, solo el asa arrastra el panel; el contenido recibe todos los gestos (p. ej. sliders). Default true. */
  contentPanning?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  onClosed,
  children,
  footer,
  maxHeightRatio = 0.9,
  contentPanning = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const closedByPropRef = useRef(false);
  const wasPresentedRef = useRef(false);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      closedByPropRef.current = false;
      wasPresentedRef.current = true;
      sheetRef.current?.present();
    } else if (wasPresentedRef.current) {
      wasPresentedRef.current = false;
      closedByPropRef.current = true;
      sheetRef.current?.dismiss();
    }
  }, [visible]);

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
    // Cierre pedido por el usuario (arrastre o toque fuera): avisa al padre.
    // El panel ya está cerrado, así que no hay que volver a descartarlo.
    wasPresentedRef.current = false;
    if (!closedByPropRef.current) onClose();
    closedByPropRef.current = false;
    onClosed?.();
  }, [onClose, onClosed]);

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
      maxDynamicContentSize={SCREEN_HEIGHT * maxHeightRatio}
      topInset={insets.top + 20}
      enablePanDownToClose
      enableContentPanningGesture={contentPanning}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={handleDismiss}
      handleStyle={styles.handleArea}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footer ? footerHeight : insets.bottom + 16 }}
      >
        {children}
      </BottomSheetScrollView>
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
