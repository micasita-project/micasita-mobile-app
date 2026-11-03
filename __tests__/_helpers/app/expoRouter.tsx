import React from 'react';

/** Router compartido: los mocks de `expo-router` y las pruebas ven la misma instancia. */
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  dismissTo: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
};

export const routeState: { params: Record<string, any>; segments: string[] } = {
  params: {},
  segments: [],
};

/** Últimas props de `<Tabs>` y de cada `<Tabs.Screen>` renderizados. */
export const tabsCapture: { props: any; screens: any[] } = { props: null, screens: [] };

export function resetRouter() {
  Object.values(router).forEach((fn) => fn.mockClear());
  router.canGoBack.mockImplementation(() => true);
  routeState.params = {};
  routeState.segments = [];
}

export const expoRouterModule = {
  useRouter: () => router,
  useLocalSearchParams: () => routeState.params,
  useGlobalSearchParams: () => routeState.params,
  useSegments: () => routeState.segments,
  usePathname: () => '/',
  useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
  Stack: Object.assign(({ children }: any) => <>{children}</>, {
    Screen: ({ name }: { name: string }) => {
      const { Text } = require('react-native');
      return <Text testID="stack-screen">{name}</Text>;
    },
  }),
  Tabs: Object.assign(
    (props: any) => {
      tabsCapture.props = props;
      tabsCapture.screens = [];
      return (
        <>
          {props.screenOptions?.headerRight?.()}
          {props.children}
        </>
      );
    },
    {
      Screen: (props: any) => {
        tabsCapture.screens.push(props);
        return null;
      },
    },
  ),
};

// Jest también ejecuta este archivo como suite; el test omitido evita el error de suite vacía.
if (expect.getState().testPath === __filename) test.skip('archivo de apoyo', () => {});
