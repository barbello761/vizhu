export { emailVerificationApi } from './api';
export type {
  ActiveVerificationResponse,
  EmailPurpose,
  EmailVerification,
  EmailVerificationState,
  VerificationStatus,
} from './api';
export { confirmVerified } from './lib/confirm-verified';
export { SPAM_HINT } from './lib/copy';
export { useVerificationStatus, verificationStatusKey } from './model/use-verification-status';
