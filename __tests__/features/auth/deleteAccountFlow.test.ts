import { deleteAccountAndLeave } from '@/features/auth/model/deleteAccountFlow';

function deps(overrides: Partial<Parameters<typeof deleteAccountAndLeave>[0]> = {}) {
  const calls: string[] = [];
  const router = { dismissTo: jest.fn(() => { calls.push('dismissTo'); }) };
  const deleteAccount = jest.fn(async () => { calls.push('deleteAccount'); });
  const logout = jest.fn(async () => { calls.push('logout'); });
  return { calls, router, deleteAccount, logout, args: { password: 'secreto', deleteAccount, logout, router, ...overrides } };
}

describe('deleteAccountAndLeave', () => {
  it('borra la cuenta con la contraseña, cierra la sesión y vuelve a las pestañas, en ese orden', async () => {
    const d = deps();
    await deleteAccountAndLeave(d.args);
    expect(d.deleteAccount).toHaveBeenCalledWith('secreto');
    expect(d.calls).toEqual(['deleteAccount', 'logout', 'dismissTo']);
    expect(d.router.dismissTo).toHaveBeenCalledWith('/(tabs)');
  });

  it('vuelve a las pestañas existentes en vez de apilar otras (no usa replace)', async () => {
    const d = deps();
    const router = { dismissTo: d.router.dismissTo, replace: jest.fn() };
    await deleteAccountAndLeave({ ...d.args, router });
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
  });

  it('si el servidor rechaza el borrado, no cierra la sesión ni navega y propaga el error', async () => {
    const d = deps({ deleteAccount: jest.fn(async () => { throw new Error('contraseña incorrecta'); }) });
    await expect(deleteAccountAndLeave(d.args)).rejects.toThrow('contraseña incorrecta');
    expect(d.logout).not.toHaveBeenCalled();
    expect(d.router.dismissTo).not.toHaveBeenCalled();
  });

  it('espera a que el cierre de sesión termine antes de navegar', async () => {
    const order: string[] = [];
    const d = deps({
      logout: async () => { await Promise.resolve(); order.push('logout-listo'); },
      router: { dismissTo: () => order.push('dismissTo') },
    });
    await deleteAccountAndLeave(d.args);
    expect(order).toEqual(['logout-listo', 'dismissTo']);
  });
});
