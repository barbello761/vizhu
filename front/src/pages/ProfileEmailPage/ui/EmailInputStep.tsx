import { type FormEvent, useEffect, useState } from 'react';

import { validateEmail } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, Input, MailIcon } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './ProfileEmailPage.scss';

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'profile-email-form';

const SEND_ERROR = 'Не удалось отправить письмо. Попробуйте ещё раз.';

interface EmailInputStepProps {
  initialValue: string;
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
}

/** Шаг 2 смены почты: новый адрес (макет 2844:22894). */
export const EmailInputStep = ({ initialValue, onSubmit, onBack }: EmailInputStepProps) => {
  const [email, setEmail] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    announceRouteChange('Введите новую электронную почту');
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const next = email.trim();
    const validationError = validateEmail(next);
    if (validationError) {
      setError(validationError);
      announceRouteChange(validationError);
      return;
    }

    setIsSending(true);
    try {
      await onSubmit(next);
    } catch {
      setError(SEND_ERROR);
      announceRouteChange(SEND_ERROR);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <FormScreen
      title="Введите новую электронную почту"
      description="Мы отправим на неё письмо для подтверждения"
      onBack={onBack}
      backLabel="Назад, к вводу кода"
      actions={
        <Button type="submit" form={FORM_ID} disabled={!email.trim()} loading={isSending}>
          Продолжить
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="profile-email__form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        aria-label="Форма смены электронной почты"
      >
        <Input
          label="Электронная почта"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="example@mail.com"
          startIcon={<MailIcon />}
          error={error ?? undefined}
        />
      </form>
    </FormScreen>
  );
};
