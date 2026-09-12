import axios from 'axios';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { type AuthErrorResponse, authApi } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, CodeInput } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './ProfileEmailPage.scss';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'profile-email-code-form';

const verifyErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError<AuthErrorResponse>(error)) {
    return 'Не удалось проверить код. Попробуйте позже.';
  }
  switch (error.response?.data.error) {
    case 'invalid_code':
      return 'Неверный код. Проверьте цифры и попробуйте снова.';
    case 'code_expired':
      return 'Срок действия кода истёк. Запросите новый.';
    case 'too_many_requests':
      return 'Слишком много попыток. Подождите немного.';
    default:
      return 'Не удалось проверить код. Попробуйте позже.';
  }
};

interface EmailVerifyStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

/**
 * Шаг 1 смены почты: подтверждаем, что за экраном тот же человек (макет
 * 2844:22045). Код уходит на телефон — единственный подтверждённый канал,
 * почты у аккаунта ещё нет.
 */
export const EmailVerifyStep = ({ phone, onVerified, onBack }: EmailVerifyStepProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // StrictMode монтирует эффекты дважды — без флага код улетал бы два раза.
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }
    hasRequested.current = true;
    announceRouteChange('Введите код. Мы отправили СМС с кодом на ваш телефон.');
    void authApi.sendOtp(phone).catch(() => {
      setError('Не удалось отправить код. Попробуйте позже.');
    });
  }, [phone]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Обратный отсчёт не озвучиваем посекундно — это забило бы скринридер.
  useEffect(() => {
    if (secondsLeft === 0) {
      announceRouteChange('Теперь можно запросить код ещё раз');
    }
  }, [secondsLeft]);

  const submit = useCallback(
    async (value: string) => {
      if (value.length < CODE_LENGTH || isVerifying) {
        return;
      }

      setIsVerifying(true);
      setError(null);
      try {
        await authApi.verifyOtp(phone, value);
        onVerified();
      } catch (verifyError) {
        setError(verifyErrorMessage(verifyError));
        setCode('');
      } finally {
        setIsVerifying(false);
      }
    },
    [phone, isVerifying, onVerified],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (code.length < CODE_LENGTH) {
      setError(`Введите все ${CODE_LENGTH} цифры кода`);
      return;
    }
    void submit(code);
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.sendOtp(phone);
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      setError(null);
      announceRouteChange('Отправили код ещё раз');
    } catch {
      setError('Не удалось отправить код. Попробуйте позже.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <FormScreen
      title="Введите код"
      description="Мы должны убедиться, что это вы. Отправили на ваш телефон СМС с кодом"
      onBack={onBack}
      backLabel="Назад, к настройкам профиля"
      actions={
        <>
          <Button type="submit" form={FORM_ID} loading={isVerifying}>
            Продолжить
          </Button>
          <Button
            variant="secondary"
            loading={isResending}
            disabled={secondsLeft > 0}
            onClick={() => void handleResend()}
          >
            Запросить ещё раз
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="profile-email__form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Форма ввода кода из СМС"
      >
        <CodeInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          onComplete={(value) => void submit(value)}
          onSubmit={() => void submit(code)}
          label={`Код из СМС, ${CODE_LENGTH} цифры`}
          length={CODE_LENGTH}
          error={error ?? undefined}
          disabled={isVerifying}
        />
      </form>

      {secondsLeft > 0 && (
        <p className="profile-email__hint">
          Вы сможете запросить код ещё раз через {secondsLeft} секунд
        </p>
      )}
    </FormScreen>
  );
};
