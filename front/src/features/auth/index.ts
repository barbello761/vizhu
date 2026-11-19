export { useAuthStore } from './model/auth.store';
export { bootstrapAuth } from './model/bootstrap';
export { authApi } from './api';
export type { VerifyOtpResponse, AuthErrorCode, AuthErrorResponse } from './api';
export { normalizePhone, formatPhone } from './lib/phone';
export {
  otpCallHint,
  otpCallAnnouncement,
  otpCodeLabel,
  OTP_FORM_LABEL,
  OTP_SEND_FAILED,
} from './lib/otp-copy';
