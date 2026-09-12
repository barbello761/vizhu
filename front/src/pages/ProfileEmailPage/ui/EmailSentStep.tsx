import { useState } from 'react';

import { announceRouteChange } from '@/shared/lib/a11y';
import { ActionScreen } from '@/widgets/ActionScreen';

const CONFIRM_ERROR = 'Мы ещё не увидели переход по ссылке. Проверьте почту и попробуйте снова.';
const RESEND_ERROR = 'Не удалось отправить письмо ещё раз. Попробуйте позже.';

interface EmailSentStepProps {
  email: string;
  onConfirm: () => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}

/**
 * Шаг 3 смены почты: ждём перехода по ссылке из письма (макет 2844:22945).
 * Подтверждение — не «Отмена», поэтому вторая кнопка шаблона переиспользована
 * под повторную отправку письма.
 */
export const EmailSentStep = ({ email, onConfirm, onResend, onBack }: EmailSentStepProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch {
      announceRouteChange(CONFIRM_ERROR);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    try {
      await onResend();
      announceRouteChange(`Отправили письмо ещё раз на ${email}`);
    } catch {
      announceRouteChange(RESEND_ERROR);
    }
  };

  return (
    <ActionScreen
      title={'Проверьте\nпочту'}
      description="Мы отправили письмо на вашу почту. Перейдите по ссылке в письме"
      confirmLabel="Я перешёл по ссылке"
      confirmLoading={isConfirming}
      onConfirm={() => void handleConfirm()}
      cancelLabel="Отправить письмо ещё раз"
      onCancel={() => void handleResend()}
      onBack={onBack}
      backLabel="Назад, к вводу почты"
      announce={`Проверьте почту. Мы отправили письмо на ${email}. Перейдите по ссылке в письме.`}
    />
  );
};
