/**
 * @layer shared/ui
 * @description Full-screen swipeable lightbox with pinch-to-zoom, pan, and double-tap.
 * Accepts pre-resolved ImageSourcePropType[] — stays domain-agnostic (FSD layer rule).
 *
 * Gestures:
 *  - Pinch → zoom (1x – 5x)
 *  - Drag (1 finger) → pan when zoomed in
 *  - Double tap → toggle 2.5x / reset
 *  - Swipe horizontal → next/prev image (disabled while zoomed in)
 *
 * runOnJS avoided in gesture callbacks: slides write directly to a shared
 * SharedValue<boolean>; a single useAnimatedReaction bridges to React state.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  ImageSourcePropType,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");
const SPRING_CFG = { damping: 22, stiffness: 280 } as const;

// ── Per-slide zoomable image ──────────────────────────────────────
// Receives a shared zoomed flag owned by the parent so gesture callbacks
// never need to cross the worklet→JS boundary themselves.

function ZoomableSlide({
  source,
  zoomed,
}: {
  source: ImageSourcePropType;
  zoomed: SharedValue<boolean>;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Shared helper — resets all transform values and marks as unzoomed
  const reset = () => {
    "worklet";
    scale.value = withSpring(1, SPRING_CFG);
    savedScale.value = 1;
    tx.value = withSpring(0, SPRING_CFG);
    ty.value = withSpring(0, SPRING_CFG);
    savedTx.value = 0;
    savedTy.value = 0;
    zoomed.value = false;
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      zoomed.value = true;
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        reset();
      } else {
        savedScale.value = scale.value;
      }
    });

  // manualActivation: the gesture only activates when we explicitly call
  // manager.activate(). When scale=1 we call manager.fail() so the touch
  // falls through to the FlatList's native scroll.
  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_, manager) => {
      if (scale.value > 1) {
        manager.activate();
      } else {
        manager.fail();
      }
    })
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withSpring(2.5, SPRING_CFG);
        savedScale.value = 2.5;
        zoomed.value = true;
      }
    });

  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.slide}>
        <Animated.Image
          source={source}
          style={[styles.image, animStyle]}
          resizeMode="contain"
        />
      </View>
    </GestureDetector>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────

interface Props {
  sources: ImageSourcePropType[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ sources, initialIndex = 0, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const insets = useSafeAreaInsets();

  // Single shared zoom flag — slides write to it on the UI thread.
  // useAnimatedReaction bridges to JS state via runOnJS.
  const zoomed = useSharedValue(false);

  useAnimatedReaction(
    () => zoomed.value,
    (isZoomed, prev) => {
      if (isZoomed !== prev) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        runOnJS(setScrollEnabled)(!isZoomed);
      }
    },
  );

  if (sources.length === 0) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.counter}>
            {current + 1} / {sources.length}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { top: insets.top + 10 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Swipeable image list — scroll disabled while any slide is zoomed */}
        <FlatList
          data={sources}
          horizontal
          pagingEnabled
          scrollEnabled={scrollEnabled}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: W,
            offset: W * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / W);
            setCurrent(index);
          }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <ZoomableSlide source={item} zoomed={zoomed} />
          )}
        />

        {/* Dot indicators */}
        {sources.length > 1 && (
          <View style={[styles.dots, { paddingBottom: insets.bottom + 16 }]}>
            {sources.map((_, i) => (
              <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
            ))}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  counter: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  slide: {
    width: W,
    height: H,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: W,
    height: H * 0.82,
  },

  dots: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { width: 18, backgroundColor: "#fff" },
});
