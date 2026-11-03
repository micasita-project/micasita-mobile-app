import React from 'react';
import { Image, View } from 'react-native';

/** Gestos creados por `Gesture.*` y detectores montados, para invocar sus callbacks desde las pruebas. */
export const gestures = {
  detectors: new Map<number, any>(),
  reactions: [] as Array<{ prepare: () => unknown; react: (cur: any, prev: any) => void; prev: unknown }>,
};

export function resetGestures() {
  gestures.detectors.clear();
  gestures.reactions.length = 0;
}

/** Ejecuta las reacciones registradas con `useAnimatedReaction` (equivale a que cambie un valor compartido). */
export function flushReactions() {
  gestures.reactions.forEach((r) => {
    const cur = r.prepare();
    if (cur !== r.prev) {
      const prev = r.prev;
      r.prev = cur;
      r.react(cur, prev);
    }
  });
}

function builder(type: string) {
  const g: any = { type, handlers: {}, config: {} };
  const chain = new Proxy(g, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop.startsWith('on')) {
        return (fn: unknown) => {
          target.handlers[prop] = fn;
          return chain;
        };
      }
      return (value: unknown) => {
        target.config[prop] = value;
        return chain;
      };
    },
  });
  return chain;
}

let nextDetector = 0;

export const gestureHandlerModule = {
  Gesture: {
    Pinch: () => builder('pinch'),
    Pan: () => builder('pan'),
    Tap: () => builder('tap'),
    Race: (...list: any[]) => ({ type: 'race', list }),
    Simultaneous: (...list: any[]) => ({ type: 'simultaneous', list }),
  },
  GestureDetector: ({ gesture, children }: any) => {
    const id = React.useRef(nextDetector++).current;
    gestures.detectors.set(id, gesture);
    return <>{children}</>;
  },
  GestureHandlerRootView: (props: any) => <View {...props} />,
};

export const reanimatedModule = {
  __esModule: true,
  default: { Image: (props: any) => <Image testID="lightbox-image" {...props} /> },
  useSharedValue: (init: unknown) => React.useRef({ value: init }).current,
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useAnimatedReaction: (prepare: () => unknown, react: (cur: any, prev: any) => void) => {
    const entry = React.useRef<any>(null);
    if (!entry.current) {
      entry.current = { prepare, react, prev: prepare() };
      gestures.reactions.push(entry.current);
    }
    entry.current.prepare = prepare;
    entry.current.react = react;
  },
  withSpring: (v: unknown) => v,
  runOnJS: (fn: unknown) => fn,
};

/** Gestos de un detector (uno por imagen) separados por tipo. */
export function slideGestures(index: number) {
  const ids = [...gestures.detectors.keys()].sort((a, b) => a - b);
  const composed = gestures.detectors.get(ids[index]);
  const [tap, sim] = composed.list;
  const [pinch, pan] = sim.list;
  return { tap, pinch, pan };
}

// Este archivo vive bajo __tests__; al ejecutarse solo necesita una prueba.
if (expect.getState().testPath?.includes('/_helpers/')) {
  it('auxiliar', () => {});
}
