/**
 * @layer features/auth/model
 * @description Eliminar la cuenta y volver al mapa sin crear otra instancia de las pestañas.
 */

interface DeleteAccountDeps {
  password: string;
  deleteAccount: (password: string) => Promise<unknown>;
  logout: () => Promise<void> | void;
  router: { dismissTo: (href: '/(tabs)') => void };
}

export async function deleteAccountAndLeave({ password, deleteAccount, logout, router }: DeleteAccountDeps) {
  await deleteAccount(password);
  await logout();
  // Las pestañas ya existen debajo: se vuelve a ellas en lugar de apilar otras.
  router.dismissTo('/(tabs)');
}
