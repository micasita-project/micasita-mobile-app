import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, StyleSheet, View, useWindowDimensions, type ScrollView } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/config/colors';
import { SheetKeyboardContext, focusedInputScrollOffset, type SheetInputHandle } from './SheetKeyboardContext';

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
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const focusedInput = useRef<SheetInputHandle | null>(null);
  const scrollOffset = useRef(0);
  const revealFrame = useRef<number | null>(null);
  const closedByPropRef = useRef(false);
  const phase = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const wantsVisible = useRef(visible);
  wantsVisible.current = visible;
  const hasFooter = !!footer;
  const [footerHeight, setFooterHeight] = useState(0);

  const revealFocusedInput = useCallback(() => {
    if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      const input = focusedInput.current;
      const scroll = scrollRef.current;
      const responder = scroll?.getScrollResponder?.() as ScrollView | undefined;
      const nativeScroll = responder?.getNativeScrollRef?.();
      if (!input || !scroll || !nativeScroll) return;
      nativeScroll.measureInWindow((_x, viewportTop, _width, viewportHeight) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (focusedInput.current !== input || !inputHeight || !viewportHeight) return;
          const next = focusedInputScrollOffset({
            offset: scrollOffset.current,
            inputTop, inputHeight, viewportTop,
            viewportBottom: viewportTop + viewportHeight,
            keyboardTop: Keyboard.metrics()?.screenY ?? screenHeight,
            footerHeight: hasFooter ? footerHeight : 0,
          });
          if (Math.abs(next - scrollOffset.current) > 1) {
            scroll.scrollTo({ y: next, animated: true });
          }
        });
      });
    });
  }, [hasFooter, footerHeight, screenHeight]);

  const keyboardContext = useMemo(() => ({
    focus: (input: SheetInputHandle) => {
      focusedInput.current = input;
      revealFocusedInput();
    },
    blur: (input: SheetInputHandle) => {
      if (focusedInput.current === input) focusedInput.current = null;
    },
    reveal: revealFocusedInput,
  }), [revealFocusedInput]);

  useEffect(() => {
    if (!visible) {
      focusedInput.current = null;
      scrollOffset.current = 0;
      return;
    }
    const show = Keyboard.addListener('keyboardDidShow', revealFocusedInput);
    const change = Keyboard.addListener('keyboardDidChangeFrame', revealFocusedInput);
    revealFocusedInput();
    return () => {
      show.remove();
      change.remove();
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    };
  }, [visible, revealFocusedInput]);

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
      else revealFocusedInput();
    }
  }, [dismiss, revealFocusedInput]);

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
    focusedInput.current = null;
    scrollOffset.current = 0;
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
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={handleDismiss}
      onChange={handleChange}
      handleStyle={styles.handleArea}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      style={styles.sheet}
    >
      <SheetKeyboardContext.Provider value={keyboardContext}>
        <BottomSheetScrollView
          ref={scrollRef}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
          onLayout={revealFocusedInput}
          onContentSizeChange={revealFocusedInput}
          contentContainerStyle={{ paddingBottom: footer ? footerHeight : insets.bottom + 16 }}
        >
          {children}
        </BottomSheetScrollView>
      </SheetKeyboardContext.Provider>
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
