import { emailVerificationApi } from '../api';

const NOT_YET_MESSAGE = 'Мы ещё не увидели переход по ссылке. Откройте письмо и попробуйте снова.';
const EXPIRED_MESSAGE = 'Срок действия ссылки истёк. Отправьте письмо ещё раз.';
const USED_MESSAGE = 'Это подтверждение уже использовано.';

export const confirmVerified = async (verificationId: string): Promise<void> => {
  const { data } = await emailVerificationApi.status(verificationId);

  switch (data.status) {
    case 'confirmed':
      return;
    case 'expired':
      throw new Error(EXPIRED_MESSAGE);
    case 'consumed':
      throw new Error(USED_MESSAGE);
    default:
      throw new Error(NOT_YET_MESSAGE);
  }
};
