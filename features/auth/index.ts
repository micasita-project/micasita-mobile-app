/**
 * @layer features/auth
 * @description Barrel export del feature de autenticación.
 */

export { AuthProvider, useAuth } from './model/AuthContext';
export type { GuestDataForTransfer } from './model/AuthContext';
export { LoginForm } from './ui/LoginForm';
export { VerifyEmailForm } from './ui/VerifyEmailForm';
export { ForgotPasswordForm } from './ui/ForgotPasswordForm';
export { ConsentModal } from './ui/ConsentModal';

export { changePassword, deleteAccount, updateProfile } from './api/auth.service';
export { deleteAccountAndLeave } from './model/deleteAccountFlow';
export { PRIVACY_POLICY_DATE, PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_VERSION } from './model/privacyPolicy';
