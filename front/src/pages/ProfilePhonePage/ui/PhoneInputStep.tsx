import { type FormEvent, useEffect, useState } from 'react';

import { toApiPhone, validatePhone } from '@/features/profile';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, CallIcon, Input } from '@/shared/ui/';
import { FormScreen } from '@/widgets/FormScreen';

import './ProfilePhonePage.scss';

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'profile-phone-form';

const SEND_ERROR = 'Не удалось отправить код. Попробуйте ещё раз.';

interface PhoneInputStepProps {
  initialValue: string;
  /** Получает номер уже в формате API (11 цифр с 7). */
  onSubmit: (phone: string) => Promise<void>;
  onBack: () => void;
}

/** Шаг 2 смены номера: новый номер. Код уходит звонком на него же. */
export const PhoneInputStep = ({ initialValue, onSubmit, onBack }: PhoneInputStepProps) => {
  const [phone, setPhone] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    announceRouteChange('Введите новый номер телефона');
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validatePhone(phone);
    if (validationError) {
      setError(validationError);
      announceRouteChange(validationError);
      return;
    }

    setIsSending(true);
    try {
      await onSubmit(toApiPhone(phone));
    } catch (submitError) {
      // «Номер уже используется другим аккаунтом» и «это ваш текущий номер»
      // бэк формулирует точнее, чем общая фраза.
      const message = apiErrorMessage(submitError, SEND_ERROR);
      setError(message);
      announceRouteChange(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <FormScreen
      title="Введите новый номер телефона"
      description="Мы позвоним на него и продиктуем код — так мы убедимся, что номер ваш"
      onBack={onBack}
      backLabel="Назад, к подтверждению по почте"
      actions={
        <Button type="submit" form={FORM_ID} disabled={!phone.trim()} loading={isSending}>
          Продолжить
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="profile-phone__form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        aria-label="Форма смены номера телефона"
      >
        <Input
          label="Номер телефона"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setError(null);
          }}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 900 123 45 67"
          startIcon={<CallIcon />}
          error={error ?? undefined}
        />
      </form>
    </FormScreen>
  );
};
