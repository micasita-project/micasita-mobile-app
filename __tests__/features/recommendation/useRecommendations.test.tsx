jest.mock('@/features/recommendation/api/recommendation.api', () => ({
  getGuestRecommendations: jest.fn(),
  generateRecommendations: jest.fn(),
  getLatestRecommendations: jest.fn(),
}));

import { act } from 'react-test-renderer';
import * as api from '@/features/recommendation/api/recommendation.api';
import {
  recommendKeys,
  guestGenerateKey,
  useGuestRecommendations,
  useGuestRecommendationsQuery,
  useLatestRecommendations,
  useGenerateRecommendations,
} from '@/features/recommendation/model/useRecommendations';
import {
  mountHook,
  waitUntil,
  flush,
  createTestQueryClient,
  makeQueryWrapper,
} from '../../_helpers/state/mountHook';

const mocked = api as jest.Mocked<typeof api>;

const REQ = {
  work_lat: -12,
  work_lon: -77,
  budget: 1000,
  preferred_transportation: 'driving',
} as any;
const PAGE = { results: [{ id: 1 }], total: 1 } as any;

let client: ReturnType<typeof createTestQueryClient>;
beforeEach(() => {
  client = createTestQueryClient();
});
const setup = <T,>(hook: () => T) => mountHook(hook, makeQueryWrapper(client));

describe('recommendKeys', () => {
  it('la clave de invitado depende de coordenadas, presupuesto y transporte', () => {
    expect(recommendKeys.guest(REQ)).toEqual(['recommendations', 'guest', -12, -77, 1000, 'driving']);
    expect(recommendKeys.guest({ ...REQ, budget: 2000 })).not.toEqual(recommendKeys.guest(REQ));
    expect(recommendKeys.guest({ ...REQ, preferred_transportation: 'walking' })).not.toEqual(
      recommendKeys.guest(REQ),
    );
  });

  it('la clave de invitado con null no lanza', () => {
    expect(recommendKeys.guest(null)).toEqual([
      'recommendations', 'guest', undefined, undefined, undefined, undefined,
    ]);
  });

  it('latest y generate tienen claves estables', () => {
    expect(recommendKeys.latest(4)).toEqual(['recommendations', 'latest', 4]);
    expect(recommendKeys.generate).toEqual(['recommendations', 'generate']);
    expect(guestGenerateKey).toEqual(['recommendations', 'guest-generate']);
  });
});

describe('useGuestRecommendations (mutation)', () => {
  it('no llama a la API hasta que se ejecuta la mutación', async () => {
    setup(() => useGuestRecommendations());
    await flush();
    expect(mocked.getGuestRecommendations).not.toHaveBeenCalled();
  });

  it('ejecuta la petición con los datos y devuelve la página', async () => {
    mocked.getGuestRecommendations.mockResolvedValue(PAGE);
    const { result } = setup(() => useGuestRecommendations());
    let data: any;
    await act(async () => {
      data = await result.current.mutateAsync(REQ);
    });
    expect(mocked.getGuestRecommendations).toHaveBeenCalledWith(REQ);
    expect(data).toEqual(PAGE);
  });

  it('propaga el error', async () => {
    mocked.getGuestRecommendations.mockRejectedValue(new Error('x'));
    const { result } = setup(() => useGuestRecommendations());
    await act(async () => {
      await result.current.mutateAsync(REQ).catch(() => {});
    });
    await flush();
    expect(result.current.isError).toBe(true);
  });
});

describe('useGuestRecommendationsQuery', () => {
  it('con datos null no consulta', async () => {
    const { result } = setup(() => useGuestRecommendationsQuery(null));
    await flush();
    expect(mocked.getGuestRecommendations).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('con datos consulta y cachea bajo la clave de invitado', async () => {
    mocked.getGuestRecommendations.mockResolvedValue(PAGE);
    const { result } = setup(() => useGuestRecommendationsQuery(REQ));
    await waitUntil(() => result.current.isSuccess);
    expect(mocked.getGuestRecommendations).toHaveBeenCalledWith(REQ);
    expect(client.getQueryData(recommendKeys.guest(REQ))).toEqual(PAGE);
  });

  it('considera frescos los datos durante 5 minutos (un segundo montaje no vuelve a pedir)', async () => {
    mocked.getGuestRecommendations.mockResolvedValue(PAGE);
    const first = setup(() => useGuestRecommendationsQuery(REQ));
    await waitUntil(() => first.result.current.isSuccess);
    const second = setup(() => useGuestRecommendationsQuery(REQ));
    await flush();
    expect(second.result.current.data).toEqual(PAGE);
    expect(mocked.getGuestRecommendations).toHaveBeenCalledTimes(1);
  });

  it('expone el error', async () => {
    mocked.getGuestRecommendations.mockRejectedValue(new Error('x'));
    const { result } = setup(() => useGuestRecommendationsQuery(REQ));
    await waitUntil(() => result.current.isError);
    expect(result.current.isError).toBe(true);
  });
});

describe('useLatestRecommendations', () => {
  it('con workplaceId null no consulta', async () => {
    const { result } = setup(() => useLatestRecommendations(null));
    await flush();
    expect(mocked.getLatestRecommendations).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('con workplaceId consulta la última recomendación y la cachea', async () => {
    mocked.getLatestRecommendations.mockResolvedValue(PAGE);
    const { result } = setup(() => useLatestRecommendations(6));
    await waitUntil(() => result.current.isSuccess);
    expect(mocked.getLatestRecommendations).toHaveBeenCalledWith(6);
    expect(client.getQueryData(recommendKeys.latest(6))).toEqual(PAGE);
  });

  it('un workplaceId 0 sigue siendo válido y consulta', async () => {
    mocked.getLatestRecommendations.mockResolvedValue(PAGE);
    const { result } = setup(() => useLatestRecommendations(0));
    await waitUntil(() => result.current.isSuccess);
    expect(mocked.getLatestRecommendations).toHaveBeenCalledWith(0);
  });
});

describe('useGenerateRecommendations', () => {
  it('genera con workplaceId y opciones e invalida solo el latest de ese workplace', async () => {
    mocked.generateRecommendations.mockResolvedValue(PAGE);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useGenerateRecommendations());
    const options = { maxDistanceKm: 3 } as any;
    await act(async () => {
      await result.current.mutateAsync({ workplaceId: 6, options });
    });
    expect(mocked.generateRecommendations).toHaveBeenCalledWith(6, options);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ queryKey: recommendKeys.latest(6) });
  });

  it('sin opciones las pasa como undefined', async () => {
    mocked.generateRecommendations.mockResolvedValue(PAGE);
    const { result } = setup(() => useGenerateRecommendations());
    await act(async () => {
      await result.current.mutateAsync({ workplaceId: 2 });
    });
    expect(mocked.generateRecommendations).toHaveBeenCalledWith(2, undefined);
  });

  it('refresca la cache de latest tras generar', async () => {
    mocked.getLatestRecommendations
      .mockResolvedValueOnce({ results: [], total: 0 } as any)
      .mockResolvedValueOnce(PAGE);
    mocked.generateRecommendations.mockResolvedValue(PAGE);
    const latest = setup(() => useLatestRecommendations(6));
    await waitUntil(() => latest.result.current.isSuccess);
    const gen = setup(() => useGenerateRecommendations());
    await act(async () => {
      await gen.result.current.mutateAsync({ workplaceId: 6 });
    });
    await waitUntil(() => (client.getQueryData(recommendKeys.latest(6)) as any)?.total === 1);
    expect(mocked.getLatestRecommendations).toHaveBeenCalledTimes(2);
  });

  it('si falla no invalida', async () => {
    mocked.generateRecommendations.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useGenerateRecommendations());
    await act(async () => {
      await result.current.mutateAsync({ workplaceId: 6 }).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
