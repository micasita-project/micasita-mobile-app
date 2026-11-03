jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';

describe('queryClient', () => {
  it('es una instancia de QueryClient', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('considera los datos frescos durante 5 minutos', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('reintenta las consultas 2 veces', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(2);
  });

  it('el barrel @/shared/api exporta la misma instancia', () => {
    const barrel = require('@/shared/api');
    expect(barrel.queryClient).toBe(queryClient);
  });
});
