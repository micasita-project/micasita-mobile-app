import React, {
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
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
  /** Called once the Modal is fully gone from native. */
  onClosed?: () => void;
  /**
   * If true, the user can swipe up to expand the sheet to 85% of the screen.
   * Only takes effect when maxHeightRatio < 0.85.
   */
  expandable?: boolean;
  /** Content rendered in a fixed bar pinned to the bottom of the sheet. */
  footer?: ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  onClosed,
  children,
  footer,
  maxHeightRatio = 0.92,
  expandable = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const minHeight = SCREEN_HEIGHT * maxHeightRatio;
  const expandedHeight = SCREEN_HEIGHT * 0.85;
  const canExpand = expandable && maxHeightRatio < 0.85;

  const [localVisible, setLocalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sheetMaxHeight = useRef(new Animated.Value(minHeight)).current;
  // JS-thread only: animates `bottom` so the whole sheet slides up with the keyboard.
  const keyboardBottom = useRef(new Animated.Value(0)).current;
  // Hard cap on the sheet height, derived purely from keyboardBottom:
  //   maxAllowed = SCREEN - insets.top - 20 - keyboardBottom
  // Applied as `maxHeight` on the outer wrapper so the sheet top can NEVER
  // go above the safe area, regardless of gesture/event timing.
  const maxAllowedHeight = useRef(
    Animated.subtract(SCREEN_HEIGHT - insets.top - 20, keyboardBottom)
  ).current;
  const isExpandedRef = useRef(false);
  // Tracks the user-intended height so we can restore it after keyboard hides.
  const userHeightRef = useRef(minHeight);
  // Blocks expand gestures while the keyboard is open.
  const keyboardVisibleRef = useRef(false);
  // The keyboard-constrained sheet height (set when the keyboard shows).
  const kbTargetHeightRef = useRef(minHeight);

  // Keep latest callbacks/values accessible inside PanResponder closure
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const canExpandRef = useRef(canExpand);
  useEffect(() => { canExpandRef.current = canExpand; }, [canExpand]);
  const minHeightRef = useRef(minHeight);
  useEffect(() => { minHeightRef.current = minHeight; }, [minHeight]);
  const expandedHeightRef = useRef(expandedHeight);
  useEffect(() => { expandedHeightRef.current = expandedHeight; }, [expandedHeight]);
  const insetsTopRef = useRef(insets.top);
  useEffect(() => { insetsTopRef.current = insets.top; }, [insets.top]);

  // ── Pan Responder ────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 4,
      onPanResponderMove: (_, { dy }) => {
        // Keyboard open: only allow dragging the sheet down (toward dismiss).
        // Ignore any upward drag so it can't be expanded off-screen.
        if (keyboardVisibleRef.current) {
          if (dy > 0) sheetTranslateY.setValue(dy);
          return;
        }
        if (dy > 0) {
          sheetTranslateY.setValue(dy);
        } else if (canExpandRef.current && dy < 0) {
          const base = isExpandedRef.current ? expandedHeightRef.current : minHeightRef.current;
          const newH = Math.min(base - dy, expandedHeightRef.current);
          sheetMaxHeight.setValue(newH);
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const snapBack = () =>
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            damping: 30,
            stiffness: 300,
            useNativeDriver: true,
          }).start();

        const snapHeight = (toValue: number) =>
          Animated.spring(sheetMaxHeight, {
            toValue,
            damping: 30,
            stiffness: 300,
            useNativeDriver: false,
          }).start();

        if (dy > 80 || vy > 1.2) {
          if (isExpandedRef.current && canExpandRef.current) {
            isExpandedRef.current = false;
            userHeightRef.current = minHeightRef.current;
            snapBack();
            snapHeight(minHeightRef.current);
          } else {
            onCloseRef.current();
          }
        } else if (canExpandRef.current && !keyboardVisibleRef.current && (dy < -60 || vy < -1)) {
          isExpandedRef.current = true;
          userHeightRef.current = expandedHeightRef.current;
          snapBack();
          snapHeight(expandedHeightRef.current);
        } else {
          snapBack();
          if (keyboardVisibleRef.current) {
            // Keyboard open: keep the constrained height, don't restore userHeight.
            snapHeight(kbTargetHeightRef.current);
          } else if (canExpandRef.current) {
            const h = isExpandedRef.current ? expandedHeightRef.current : minHeightRef.current;
            userHeightRef.current = h;
            snapHeight(h);
          }
        }
      },
    })
  ).current;

  // ── Open / Close logic ───────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      isExpandedRef.current = false;
      userHeightRef.current = minHeight;
      keyboardVisibleRef.current = false;
      sheetMaxHeight.setValue(minHeight);
      keyboardBottom.setValue(0);
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      setLocalVisible(true);
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
    } else {
      Keyboard.dismiss();
      keyboardBottom.setValue(0);
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
      ]).start(() => {
        setLocalVisible(false);
        if (Platform.OS !== 'ios') setTimeout(() => onClosed?.(), 50);
      });
    }
  }, [visible]);

  // ── Track Keyboard (JS thread only) ─────────────────────────────
  // Strategy: move sheet up AND shrink its height so it fits exactly
  // in the space between the top safe area and the keyboard.
  // This prevents the top content from going off-screen AND keeps
  // the footer visible above the keyboard.
  useEffect(() => {
    if (!localVisible) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      keyboardVisibleRef.current = true;
      const kH = e.endCoordinates.height;
      const dur = e.duration || 250;
      // Max height the sheet can have while keyboard is visible,
      // leaving at least (insets.top + 20) px of clearance at the top.
      const availableH = SCREEN_HEIGHT - kH - insetsTopRef.current - 20;
      const targetH = Math.min(userHeightRef.current, availableH);
      kbTargetHeightRef.current = targetH;

      Animated.parallel([
        Animated.timing(keyboardBottom, {
          toValue: kH,
          duration: dur,
          useNativeDriver: false,
        }),
        Animated.timing(sheetMaxHeight, {
          toValue: targetH,
          duration: dur,
          useNativeDriver: false,
        }),
      ]).start();
    };

    const onHide = (e: KeyboardEvent) => {
      keyboardVisibleRef.current = false;
      const dur = e.duration || 250;
      Animated.parallel([
        Animated.timing(keyboardBottom, {
          toValue: 0,
          duration: dur,
          useNativeDriver: false,
        }),
        Animated.timing(sheetMaxHeight, {
          toValue: userHeightRef.current,
          duration: dur,
          useNativeDriver: false,
        }),
      ]).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [localVisible]);

  return (
    <Modal
      visible={localVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? onClosed : undefined}
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/*
        Outer: JS thread only.
        - `height`  → expandable snap behavior
        - `bottom`  → slides up with keyboard so the whole sheet moves,
                      keeping footer visible and avoiding content clipping
      */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: keyboardBottom,
          height: sheetMaxHeight,
          maxHeight: maxAllowedHeight,
        }}
      >
        {/* Inner: native driver — open/close slide animation */}
        <Animated.View
          style={[styles.sheet, { flex: 1, transform: [{ translateY: sheetTranslateY }] }]}
        >
          {/* Handle (drag zone) */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Scrollable content */}
          <View style={{ flex: 1 }}>{children}</View>

          {/* Fixed footer */}
          {footer ? (
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 4) }]}>
              {footer}
            </View>
          ) : (
            <View style={{ height: insets.bottom + 16 }} />
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
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
  footerContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
