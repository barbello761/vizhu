import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { registrationApi, useRegistrationStore } from '@/features/registration';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Button } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './RegistrationIpraPage.scss';

const IN_PROGRESS_NOTE = 'Подтверждение через Госуслуги пока в разработке';
const SAVE_ERROR = 'Не удалось сохранить профиль. Проверьте связь и попробуйте ещё раз.';

export const RegistrationIpraPage = () => {
  const navigate = useNavigate();
  const { name, reset } = useRegistrationStore();
  // Роль выбирается на стартовом экране («Начать» / «Я волонтёр») и лежит
  // в персисте авторизации. Если её почему-то нет — регистрируем незрячего.
  const role = useAuthStore((s) => s.role) ?? 'blind';
  const setRegistered = useAuthStore((s) => s.setRegistered);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await registrationApi.createProfile({ name, role });
    } catch (saveError) {
      // 409 — профиль уже создан (повторная отправка, прерванная регистрация).
      // Это не ошибка: регистрация завершена, идём дальше.
      const status = axios.isAxiosError(saveError) ? saveError.response?.status : undefined;
      if (status !== 409) {
        // Раньше здесь был `finally` с переходом — при ошибке пользователь
        // уходил в приложение без профиля на бэке. Теперь остаёмся на экране.
        setError(SAVE_ERROR);
        announceRouteChange(SAVE_ERROR);
        setIsSaving(false);
        return;
      }
    }

    setRegistered(true);
    reset();
    setIsSaving(false);
    void navigate('/onboarding', { replace: true });
  };

  return (
    <FormScreen
      title="Подтвердите статус ИПРА"
      description="Если у вас оформлен статус ИПРА, доступ к ВИЖУ без ограничений оплачивает государство — подтвердите статус через Госуслуги, это займёт меньше минуты. Мы не запрашиваем и не храним сам документ, только факт подтверждённого статуса."
      onBack={() => void navigate('/registration/email')}
      actions={
        <>
          <Button disabled aria-label={`Подтвердить статус ИПРА. ${IN_PROGRESS_NOTE}`}>
            Подтвердить статус ИПРА
          </Button>

          <Button variant="secondary" loading={isSaving} onClick={() => void handleSkip()}>
            Подтвердить позже
          </Button>
        </>
      }
    >
      <p className="reg-ipra__note" role="status">
        {IN_PROGRESS_NOTE}
      </p>

      {error && (
        <p className="reg-ipra__error" role="alert">
          {error}
        </p>
      )}
    </FormScreen>
  );
};
