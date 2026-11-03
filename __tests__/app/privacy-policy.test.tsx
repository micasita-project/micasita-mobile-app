import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import PrivacyPolicyScreen from '@/app/privacy-policy';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_DATE,
} from '@/features/auth/model/privacyPolicy';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);

beforeEach(resetRouter);

describe('PrivacyPolicyScreen', () => {
  it('muestra la versión y la fecha de la política', async () => {
    await render(<PrivacyPolicyScreen />);
    expect(
      screen.getByText(`Versión ${PRIVACY_POLICY_VERSION} · ${PRIVACY_POLICY_DATE}`),
    ).toBeTruthy();
  });

  it('muestra el título de cada sección y todos sus párrafos', async () => {
    await render(<PrivacyPolicyScreen />);
    for (const section of PRIVACY_POLICY_SECTIONS) {
      expect(screen.getByText(section.title)).toBeTruthy();
      for (const p of section.paragraphs) expect(screen.getByText(p)).toBeTruthy();
    }
  });

  it('el botón de retroceso vuelve a la pantalla anterior', async () => {
    await render(<PrivacyPolicyScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
