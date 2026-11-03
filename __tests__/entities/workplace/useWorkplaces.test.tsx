jest.mock('@/entities/workplace/api/workplace.api', () => ({
  fetchWorkplaces: jest.fn(),
  createWorkplace: jest.fn(),
  deleteWorkplace: jest.fn(),
  updateWorkplace: jest.fn(),
}));

import { act } from 'react-test-renderer';
import * as api from '@/entities/workplace/api/workplace.api';
import {
  workplaceKeys,
  useWorkplaces,
  useCreateWorkplace,
  useDeleteWorkplace,
  useUpdateWorkplace,
} from '@/entities/workplace/model/useWorkplaces';
import {
  mountHook,
  waitUntil,
  flush,
  createTestQueryClient,
  makeQueryWrapper,
} from '../../_helpers/state/mountHook';

const mocked = api as jest.Mocked<typeof api>;

let client: ReturnType<typeof createTestQueryClient>;
beforeEach(() => {
  client = createTestQueryClient();
});
const setup = <T,>(hook: () => T) => mountHook(hook, makeQueryWrapper(client));

describe('useWorkplaces', () => {
  it('carga los lugares de trabajo y los deja en cache bajo workplaceKeys.all', async () => {
    const list = [{ id: 1 }, { id: 2 }] as any;
    mocked.fetchWorkplaces.mockResolvedValue(list);
    const { result } = setup(() => useWorkplaces());
    await waitUntil(() => result.current.isSuccess);
    expect(result.current.data).toEqual(list);
    expect(client.getQueryData(workplaceKeys.all)).toEqual(list);
  });

  it('con enabled=false no consulta', async () => {
    const { result } = setup(() => useWorkplaces(false));
    await flush();
    expect(mocked.fetchWorkplaces).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('expone el error sin reintentar', async () => {
    mocked.fetchWorkplaces.mockRejectedValue(new Error('x'));
    const { result } = setup(() => useWorkplaces());
    await waitUntil(() => result.current.isError);
    expect(mocked.fetchWorkplaces).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateWorkplace', () => {
  it('crea e invalida workplaceKeys.all', async () => {
    mocked.createWorkplace.mockResolvedValue({ id: 3 } as any);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useCreateWorkplace());
    const data = { work_address: 'x', work_lat: 1, work_lon: 2 } as any;
    await act(async () => {
      await result.current.mutateAsync(data);
    });
    expect(mocked.createWorkplace).toHaveBeenCalledWith(data);
    expect(spy).toHaveBeenCalledWith({ queryKey: workplaceKeys.all });
  });

  it('si falla no invalida', async () => {
    mocked.createWorkplace.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useCreateWorkplace());
    await act(async () => {
      await result.current.mutateAsync({} as any).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useDeleteWorkplace', () => {
  it('elimina por id e invalida', async () => {
    mocked.deleteWorkplace.mockResolvedValue(undefined);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useDeleteWorkplace());
    await act(async () => {
      await result.current.mutateAsync(4);
    });
    expect(mocked.deleteWorkplace).toHaveBeenCalledWith(4);
    expect(spy).toHaveBeenCalledWith({ queryKey: workplaceKeys.all });
  });

  it('si falla no invalida', async () => {
    mocked.deleteWorkplace.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useDeleteWorkplace());
    await act(async () => {
      await result.current.mutateAsync(4).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useUpdateWorkplace', () => {
  it('actualiza con id y datos e invalida', async () => {
    mocked.updateWorkplace.mockResolvedValue({ id: 4 } as any);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useUpdateWorkplace());
    const data = { work_address: 'nuevo' } as any;
    await act(async () => {
      await result.current.mutateAsync({ id: 4, data });
    });
    expect(mocked.updateWorkplace).toHaveBeenCalledWith(4, data);
    expect(spy).toHaveBeenCalledWith({ queryKey: workplaceKeys.all });
  });

  it('si falla no invalida', async () => {
    mocked.updateWorkplace.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useUpdateWorkplace());
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: {} as any }).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
