export type EmailPurpose = 'verify_email' | 'change_email' | 'change_phone' | 'delete_account';

export type VerificationStatus = 'pending' | 'confirmed' | 'consumed' | 'expired';

/** Ответ на запрос письма. `id` нужен всем последующим шагам флоу. */
export type EmailVerification = {
  id: string;
  email: string;
  expiresAt: string;
};

export type EmailVerificationState = EmailVerification & {
  purpose: EmailPurpose;
  status: VerificationStatus;
};

/** GET /email/verifications/active — живое подтверждение действия, если оно есть. */
export type ActiveVerificationResponse = {
  verification: EmailVerificationState | null;
};
