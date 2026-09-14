import { useState } from 'react';

import { SPAM_HINT } from '@/features/email-verification';
import { apiErrorMessage } from '@/shared/api';
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

export const EmailSentStep = ({ email, onConfirm, onResend, onBack }: EmailSentStepProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = (message: string) => {
    setError(message);
    announceRouteChange(message);
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      await onConfirm();
    } catch (confirmError) {
      report(apiErrorMessage(confirmError, CONFIRM_ERROR));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      await onResend();
      announceRouteChange(`Отправили письмо ещё раз на ${email}`);
    } catch (resendError) {
      report(apiErrorMessage(resendError, RESEND_ERROR));
    }
  };

  return (
    <ActionScreen
      title={'Проверьте\nпочту'}
      description={`Мы отправили письмо на ${email}. Перейдите по ссылке в письме. ${SPAM_HINT}`}
      note={error ?? undefined}
      confirmLabel="Я перешёл по ссылке"
      confirmLoading={isConfirming}
      onConfirm={() => void handleConfirm()}
      cancelLabel="Отправить письмо ещё раз"
      onCancel={() => void handleResend()}
      onBack={onBack}
      backLabel="Назад, к вводу почты"
      announce={`Проверьте почту. Мы отправили письмо на ${email}. Перейдите по ссылке в письме. ${SPAM_HINT}`}
    />
  );
};
