import axios from 'axios';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { type AuthErrorResponse, authApi, useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, CodeInput } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './CodePage.scss';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'code-form';

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

export const CodePage = () => {
  const navigate = useNavigate();
  const phone = useAuthStore((s) => s.phone);
  const login = useAuthStore((s) => s.login);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeen);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Обратный отсчёт не озвучиваем посекундно — это забило бы скринридер.
  // Сообщаем один раз, когда повторный запрос снова доступен.
  useEffect(() => {
    if (secondsLeft === 0) {
      announceRouteChange('Теперь можно запросить код ещё раз');
    }
  }, [secondsLeft]);

  const nextRouteAfterLogin = (isNewUser: boolean) => {
    if (isNewUser) {
      return '/registration/name';
    }
    return hasSeenOnboarding ? '/' : '/onboarding';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (code.length < CODE_LENGTH) {
      setError(`Введите все ${CODE_LENGTH} цифры кода`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data } = await authApi.verifyOtp(phone ?? '', code);
      login(data.accessToken);
      void navigate(nextRouteAfterLogin(data.isNewUser), { replace: true });
    } catch (verifyError) {
      setError(verifyErrorMessage(verifyError));
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      return;
    }

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
      description="Отправили на ваш телефон СМС с кодом"
      onBack={() => void navigate('/auth/phone')}
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
          <Button
            variant="secondary"
            onClick={() => announceRouteChange('Код звонком — функция в разработке')}
          >
            Получить код звонком
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="code-page__form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        aria-label="Форма ввода кода из СМС"
      >
        <CodeInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          label={`Код из СМС, ${CODE_LENGTH} цифры`}
          length={CODE_LENGTH}
          error={error ?? undefined}
          disabled={isVerifying}
        />
      </form>

      {secondsLeft > 0 && (
        <p className="code-page__hint">
          Вы сможете запросить код ещё раз через {secondsLeft} секунд
        </p>
      )}
    </FormScreen>
  );
};
