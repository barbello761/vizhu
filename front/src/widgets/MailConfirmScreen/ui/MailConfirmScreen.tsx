import { useCallback, useEffect, useRef, useState } from 'react';

import {
  confirmVerified,
  type EmailPurpose,
  emailVerificationApi,
} from '@/features/email-verification';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { ActionScreen } from '@/widgets/ActionScreen';

const SEND_ERROR = 'Не удалось отправить письмо. Попробуйте ещё раз.';
const CONFIRM_ERROR = 'Мы ещё не увидели переход по ссылке. Проверьте почту и попробуйте снова.';

export interface MailVerification {
  id: string;
  email: string;
}

interface MailConfirmScreenProps {
  /** Какое действие подтверждаем — определяет текст письма на бэкенде. */
  purpose: EmailPurpose;
  lead: string;
  verification: MailVerification | null;
  onVerificationChange: (verification: MailVerification) => void;
  /** Что сделать после того, как переход по ссылке подтверждён. */
  onConfirmed: (verificationId: string) => void | Promise<void>;
  confirmLabel?: string;
  tone?: 'accent' | 'danger';
  onBack?: () => void;
  backLabel?: string;
}

export const MailConfirmScreen = ({
  purpose,
  lead,
  verification,
  onVerificationChange,
  onConfirmed,
  confirmLabel = 'Я перешёл по ссылке',
  tone = 'accent',
  onBack,
  backLabel,
}: MailConfirmScreenProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // StrictMode монтирует эффекты дважды — без флага письмо улетало бы два раза.
  const hasRequested = useRef(false);

  const sendLetter = useCallback(async () => {
    const { data } = await emailVerificationApi.request(purpose);
    onVerificationChange({ id: data.id, email: data.email });
    return data.email;
  }, [purpose, onVerificationChange]);

  const report = useCallback((message: string) => {
    setError(message);
    announceRouteChange(message);
  }, []);

  useEffect(() => {
    if (hasRequested.current || verification) {
      return;
    }
    hasRequested.current = true;

    void sendLetter().catch((sendError: unknown) => {
      report(apiErrorMessage(sendError, SEND_ERROR));
    });
  }, [sendLetter, verification, report]);

  const handleConfirm = async () => {
    // Кнопка приглушена через aria-disabled и нажатие всё равно доходит сюда:
    // молча его съесть значило бы оставить пользователя без объяснения.
    if (!verification) {
      report('Письмо ещё отправляется. Подождите пару секунд и попробуйте снова.');
      return;
    }
    setIsConfirming(true);
    setError(null);
    try {
      await confirmVerified(verification.id);
      await onConfirmed(verification.id);
    } catch (confirmError) {
      // confirmVerified бросает обычный Error с готовым текстом, действие
      // родителя — ошибку axios; apiErrorMessage разбирает второй случай.
      report(
        confirmError instanceof Error && !('isAxiosError' in confirmError)
          ? confirmError.message
          : apiErrorMessage(confirmError, CONFIRM_ERROR),
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      const email = await sendLetter();
      announceRouteChange(`Отправили письмо ещё раз на ${email}`);
    } catch (resendError) {
      report(apiErrorMessage(resendError, SEND_ERROR));
    }
  };

  const description = verification
    ? `${lead} Мы отправили письмо на ${verification.email}. Перейдите по ссылке в письме`
    : `${lead} Отправляем письмо на вашу почту…`;

  return (
    <ActionScreen
      title={'Проверьте\nпочту'}
      description={description}
      note={error ?? undefined}
      tone={tone}
      confirmLabel={confirmLabel}
      confirmDisabled={!verification}
      confirmLoading={isConfirming}
      onConfirm={() => void handleConfirm()}
      cancelLabel="Отправить письмо ещё раз"
      onCancel={() => void handleResend()}
      onBack={onBack}
      backLabel={backLabel}
      announce={`Проверьте почту. ${lead} Перейдите по ссылке в письме, затем нажмите «${confirmLabel}».`}
    />
  );
};
