import { useState } from 'react';
import { useNavigate } from 'react-router';

import { registrationApi, useRegistrationStore } from '@/features/registration';
import { Button } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './RegistrationIpraPage.scss';

const IN_PROGRESS_NOTE = 'Подтверждение через Госуслуги пока в разработке';

export const RegistrationIpraPage = () => {
  const navigate = useNavigate();
  const { name, blindnessTypeId, reset } = useRegistrationStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await registrationApi.createProfile({
        name,
        ...(blindnessTypeId !== null && { blindnessTypeId }),
      });
      reset();
    } finally {
      setIsSaving(false);
      void navigate('/onboarding', { replace: true });
    }
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
    </FormScreen>
  );
};
