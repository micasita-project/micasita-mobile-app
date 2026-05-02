/**
 * @layer shared/ui
 * @description Generic bottom sheet with independent overlay + sheet animations
 * and swipe-to-dismiss gesture. The overlay fades in separately so it never
 * appears to "come from below" with the sheet.
 *
 * Usage:
 *   <BottomSheet visible={open} onClose={() => setOpen(false)}>
 *     <Text>Content here</Text>
 *   </BottomSheet>
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/config/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Max height as fraction of screen height. Default 0.92 */
  maxHeightRatio?: number;
}

export function BottomSheet({ visible, onClose, children, maxHeightRatio = 0.92 }: Props) {
  const insets = useSafeAreaInsets();

  // Keep the Modal rendered until the close animation finishes
  const [mounted, setMounted] = useState(false);

  // Completely independent animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ── Open animation ────────────────────────────────────────────
  const animateOpen = useCallback(() => {
    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(SCREEN_HEIGHT);
    // Overlay fades in slightly ahead of the sheet so the background
    // is already darkening when the sheet arrives.
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 28,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, sheetTranslateY]);

  // ── Close animation ───────────────────────────────────────────
  const animateClose = useCallback((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => onDone?.());
  }, [overlayOpacity, sheetTranslateY]);

  // ── Lifecycle: mount → open; parent closes → animate out ─────
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      animateClose(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mounted && visible) {
      animateOpen();
    }
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── User-triggered close (overlay tap or swipe) ───────────────
  const requestClose = useCallback(() => {
    animateClose(() => {
      setMounted(false);
      onClose();
    });
  }, [animateClose, onClose]);

  // ── Swipe-to-dismiss pan responder (attached to drag handle) ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 4,
      onPanResponderMove: (_, { dy }) => {
        // Only allow dragging downward
        if (dy > 0) sheetTranslateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 1.2) {
          // Fast or far enough → dismiss
          animateClose(() => {
            setMounted(false);
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            damping: 30,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!mounted) return null;

  const maxSheetHeight = SCREEN_HEIGHT * maxHeightRatio;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      {/* ── Overlay (independent fade) ── */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableWithoutFeedback onPress={requestClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* ── Sheet (independent slide) ── */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: maxSheetHeight,
              paddingBottom: insets.bottom,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Drag handle — the only area that triggers the pan responder */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Shadow on iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    // Shadow on Android
    elevation: 24,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
});
