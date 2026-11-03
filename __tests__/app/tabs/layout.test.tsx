import React from 'react';
import { render } from '@testing-library/react-native';
import TabsLayout from '@/app/(tabs)/_layout';
import { resetRouter, tabsCapture } from '@/__tests__/_helpers/app/expoRouter';

const mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => mockInsets }));

beforeEach(() => {
  resetRouter();
  mockInsets.bottom = 0;
});

const barStyle = () => tabsCapture.props.screenOptions.tabBarStyle;

describe('TabsLayout barra de pestañas', () => {
  it('sin área segura inferior aplica el relleno mínimo (12) y altura 68', async () => {
    mockInsets.bottom = 0;
    await render(<TabsLayout />);
    expect(barStyle().paddingBottom).toBe(12);
    expect(barStyle().height).toBe(68);
  });

  it('con área segura grande (34) la sube al relleno y a la altura', async () => {
    mockInsets.bottom = 34;
    await render(<TabsLayout />);
    expect(barStyle().paddingBottom).toBe(34);
    expect(barStyle().height).toBe(90);
  });

  it('con un área segura pequeña (8) mantiene el mínimo de 12', async () => {
    mockInsets.bottom = 8;
    await render(<TabsLayout />);
    expect(barStyle().paddingBottom).toBe(12);
    expect(barStyle().height).toBe(68);
  });
});

describe('TabsLayout pantallas', () => {
  it('declara Mapa, Viviendas, IA y Perfil en ese orden', async () => {
    await render(<TabsLayout />);
    expect(tabsCapture.screens.map((s) => [s.name, s.options.title])).toEqual([
      ['index', 'Mapa'],
      ['housing', 'Viviendas'],
      ['recommend', 'IA'],
      ['profile', 'Perfil'],
    ]);
  });

  it('el mapa oculta el encabezado y las demás pestañas lo conservan', async () => {
    await render(<TabsLayout />);
    const byName = Object.fromEntries(tabsCapture.screens.map((s) => [s.name, s.options]));
    expect(byName.index.headerShown).toBe(false);
    expect(byName.housing.headerShown).toBeUndefined();
    expect(byName.recommend.headerTitle).toBe('Recomendaciones IA');
    expect(byName.profile.headerTitle).toBe('Mi Perfil');
  });

  it('cada pestaña usa su icono', async () => {
    await render(<TabsLayout />);
    const icons = tabsCapture.screens.map(
      (s) => s.options.tabBarIcon({ color: 'c', size: 1 }).props.name,
    );
    expect(icons).toEqual(['map-outline', 'home-outline', 'sparkles-outline', 'person-outline']);
  });
});
