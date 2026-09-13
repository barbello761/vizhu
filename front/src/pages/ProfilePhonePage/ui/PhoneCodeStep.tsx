import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { formatPhone } from '@/features/auth';
import { profileApi } from '@/features/profile';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, CodeInput } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './ProfilePhonePage.scss';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'profile-phone-code-form';

const VERIFY_ERROR = 'Не удалось проверить код. Попробуйте позже.';
const RESEND_ERROR = 'Не удалось отправить код ещё раз. Попробуйте позже.';

interface PhoneCodeStepProps {
  /** Новый номер в формате API — на него уже ушёл звонок с предыдущего шага. */
  phone: string;
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
}

export const PhoneCodeStep = ({ phone, onSubmit, onBack }: PhoneCodeStepProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    announceRouteChange(`Введите код. Мы позвонили на номер ${formatPhone(phone)}.`);
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
        await onSubmit(value);
      } catch (verifyError) {
        const message = apiErrorMessage(verifyError, VERIFY_ERROR);
        setError(message);
        announceRouteChange(message);
        setCode('');
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, onSubmit],
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
      await profileApi.sendPhoneOtp(phone);
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      setError(null);
      announceRouteChange('Отправили код ещё раз');
    } catch (resendError) {
      setError(apiErrorMessage(resendError, RESEND_ERROR));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <FormScreen
      title="Введите код"
      description={`Мы позвонили на номер ${formatPhone(phone)} и продиктовали код`}
      onBack={onBack}
      backLabel="Назад, к вводу номера"
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
        className="profile-phone__form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Форма ввода кода из звонка"
      >
        <CodeInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          onComplete={(value) => void submit(value)}
          onSubmit={() => void submit(code)}
          label={`Код из звонка, ${CODE_LENGTH} цифры`}
          length={CODE_LENGTH}
          error={error ?? undefined}
          disabled={isVerifying}
        />
      </form>

      {secondsLeft > 0 && (
        <p className="profile-phone__hint">
          Вы сможете запросить код ещё раз через {secondsLeft} секунд
        </p>
      )}
    </FormScreen>
  );
};
