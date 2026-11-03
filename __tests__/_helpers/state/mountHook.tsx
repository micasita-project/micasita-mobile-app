import React, { type ComponentType, type ReactNode } from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: ReactTestRenderer[] = [];
afterEach(() => {
  while (mounted.length) {
    const r = mounted.pop()!;
    try {
      act(() => r.unmount());
    } catch {}
  }
});

type Wrapper = ComponentType<{ children: ReactNode }>;

// Monta un hook con react-test-renderer puro (renderHook de RNTL no resuelve en este entorno).
export function mountHook<T>(useHook: () => T, wrapper?: Wrapper) {
  const ref = { current: undefined as unknown as T };
  function Probe() {
    ref.current = useHook();
    return null;
  }
  const Wrap = wrapper;
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(Wrap ? <Wrap><Probe /></Wrap> : <Probe />);
  });
  mounted.push(renderer);
  return {
    result: ref,
    unmount: () => act(() => renderer.unmount()),
  };
}

// Deja resolver promesas pendientes y los efectos asociados.
export async function flush(times = 3) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

export async function waitUntil(cond: () => boolean, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    if (cond()) return;
    await flush(1);
  }
  throw new Error('waitUntil: la condición no se cumplió');
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

export function makeQueryWrapper(client: QueryClient = createTestQueryClient()): Wrapper {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
