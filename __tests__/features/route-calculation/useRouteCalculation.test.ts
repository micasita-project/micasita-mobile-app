jest.mock('@/entities/route', () => ({
  fetchModeRoute: jest.fn(),
}));

import React from 'react';
import { create, act } from 'react-test-renderer';
import { fetchModeRoute } from '@/entities/route';
import { useRouteCalculation } from '@/features/route-calculation/model/useRouteCalculation';

const mockFetch = fetchModeRoute as jest.Mock;

const ORIGIN = { latitude: 0, longitude: 0 };
const DEST_A = { latitude: 1, longitude: 1 };
const DEST_B = { latitude: 2, longitude: 2 };

function makeRoute(distanceKm: number) {
  return {
    origin: ORIGIN,
    destination: DEST_A,
    waypoints: [],
    distanceKm,
    timeMinutes: distanceKm,
  };
}

// Sin `renderHook` de @testing-library/react-native: en esta combinación de
// versiones (jest-expo + RNTL) su render-hook interno choca con el chequeo de
// `act` del reconciler y nunca resuelve. Se monta el hook a mano con
// react-test-renderer puro, que sí funciona en este entorno.
function mount() {
  let latest: ReturnType<typeof useRouteCalculation>;
  function Probe() {
    latest = useRouteCalculation();
    return null;
  }
  act(() => {
    create(React.createElement(Probe));
  });
  return {
    get current() {
      return latest;
    },
  };
}

describe('useRouteCalculation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('discards a stale response that resolves after a newer request', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockFetch.mockReturnValueOnce(firstPromise); // vivienda A: se queda pendiente
    mockFetch.mockResolvedValueOnce(makeRoute(99)); // vivienda B: resuelve antes

    const hook = mount();

    act(() => {
      hook.current.calculateRoute(ORIGIN, DEST_A, 'driving');
    });
    await act(async () => {
      hook.current.calculateRoute(ORIGIN, DEST_B, 'driving');
    });

    expect(hook.current.route?.distanceKm).toBe(99);

    // La petición de A (la anterior) resuelve tarde — no debe pisar la ruta
    // ya asentada de B, que es la selección vigente.
    await act(async () => {
      resolveFirst(makeRoute(1));
    });

    expect(hook.current.route?.distanceKm).toBe(99);
  });

  it('applies the result when only one request is in flight', async () => {
    mockFetch.mockResolvedValueOnce(makeRoute(5));
    const hook = mount();

    await act(async () => {
      hook.current.calculateRoute(ORIGIN, DEST_A, 'driving');
    });

    expect(hook.current.route?.distanceKm).toBe(5);
  });

  it('clearRoute resets the route and invalidates any in-flight request', async () => {
    let resolvePending: (v: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      resolvePending = resolve;
    });
    mockFetch.mockReturnValueOnce(pending);

    const hook = mount();

    act(() => {
      hook.current.calculateRoute(ORIGIN, DEST_A, 'driving');
    });
    act(() => {
      hook.current.clearRoute();
    });

    await act(async () => {
      resolvePending(makeRoute(7));
    });

    expect(hook.current.route).toBeNull();
  });
});
