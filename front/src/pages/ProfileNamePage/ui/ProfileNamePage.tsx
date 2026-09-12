import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useUpdateProfile, validateName } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { Button, Input } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './ProfileNamePage.scss';

// Кнопка «Продолжить» живёт в нижней стопке, вне <form> — связываем их по id.
const FORM_ID = 'profile-name-form';

const SAVE_ERROR = 'Не удалось сохранить имя. Попробуйте ещё раз.';

/**
 * «Введите новое имя» — смена имени отдельным экраном (макет 2844:23813).
 * Поле открывается пустым, как в макете: пользователь вводит имя заново,
 * а не правит старое.
 */
export const ProfileNamePage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile/settings');
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    announceRouteChange('Введите новое имя');
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const next = name.trim();
    const validationError = validateName(next);
    if (validationError) {
      setError(validationError);
      announceRouteChange(validationError);
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: next });
      announceRouteChange(`Имя обновлено: ${next}`);
      void navigate('/profile/settings', { replace: true });
    } catch {
      setError(SAVE_ERROR);
      announceRouteChange(SAVE_ERROR);
    }
  };

  return (
    <FormScreen
      title="Введите новое имя"
      description="Нужно, чтобы обращаться к вам по имени. Данные конфиденциальны и никому не передаются"
      onBack={goBack}
      backLabel="Назад, к настройкам профиля"
      actions={
        <Button
          type="submit"
          form={FORM_ID}
          disabled={!name.trim()}
          loading={updateProfile.isPending}
        >
          Продолжить
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="profile-name__form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        aria-label="Форма смены имени"
      >
        <Input
          label="Имя"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          type="text"
          autoComplete="name"
          placeholder="Например, Ваня"
          error={error ?? undefined}
        />
      </form>
    </FormScreen>
  );
};
