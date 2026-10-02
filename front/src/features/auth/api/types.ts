export type VerifyOtpResponse = {
  accessToken: string;
  isNewUser: boolean;
  /** Только для нативного клиента (X-Client: native) — web получает httpOnly-куку. */
  refreshToken?: string;
};

export type AuthErrorCode = 'invalid_code' | 'code_expired' | 'too_many_requests';

export type AuthErrorResponse = {
  error: AuthErrorCode;
  message: string;
};
