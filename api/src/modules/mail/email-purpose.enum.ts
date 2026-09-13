export enum EmailPurpose {
  VERIFY_EMAIL = 'verify_email',
  /** Смена почты. Письмо уходит на НОВЫЙ адрес. */
  CHANGE_EMAIL = 'change_email',
  /** Смена номера телефона. Письмо уходит на текущий подтверждённый адрес. */
  CHANGE_PHONE = 'change_phone',
  /** Удаление аккаунта. Письмо уходит на текущий подтверждённый адрес. */
  DELETE_ACCOUNT = 'delete_account',
}

export const EMAIL_PURPOSES = Object.values(EmailPurpose) as string[];

export const PURPOSES_USING_ACCOUNT_EMAIL: ReadonlySet<EmailPurpose> = new Set([
  EmailPurpose.CHANGE_PHONE,
  EmailPurpose.DELETE_ACCOUNT,
]);
