import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PublishHousingScreen from '@/app/publish-housing';

const mockWizard = jest.fn((_props: any) => null);
const mockUser = { id: 7, email: 'ana@mail.com' };
jest.mock('@/features/auth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/features/publish-housing', () => ({
  PublishWizard: (props: any) => mockWizard(props),
}));

describe('PublishHousingScreen', () => {
  it('renderiza el asistente de publicación con el usuario, sin borrador ni id (alta nueva)', async () => {
    await render(<PublishHousingScreen />);
    expect(mockWizard).toHaveBeenCalledTimes(1);
    expect(mockWizard.mock.calls[0][0]).toEqual({ user: mockUser });
  });
});
