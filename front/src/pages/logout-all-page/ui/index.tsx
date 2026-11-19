import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useRevokeOtherSessions } from '@/entities/session';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { ActionScreen } from '@/widgets/action-screen';

const LOGOUT_ALL_ERROR = 'Не удалось выйти с других устройств. Попробуйте ещё раз.';

export const LogoutAllPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile/devices');
  const revokeOthers = useRevokeOtherSessions();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await revokeOthers.mutateAsync();
      // replace: «назад» с экрана результата не должно возвращать к вопросу,
      // на который уже ответили.
      void navigate('/logout-all/done', { replace: true });
    } catch (err) {
      const message = apiErrorMessage(err, LOGOUT_ALL_ERROR);
      setError(message);
      announceRouteChange(message);
    }
  };

  return (
    <ActionScreen
      title={'Выйти со всех\nустройств?'}
      description="Приложение завершит сеанс на всех устройствах, где вы вошли в аккаунт, кроме данного."
      note={error ?? undefined}
      confirmLabel="Выйти со всех устройств"
      confirmLoading={revokeOthers.isPending}
      onConfirm={() => void handleConfirm()}
      onCancel={goBack}
      announce="Выйти со всех устройств? Сеансы на других устройствах будут завершены."
    />
  );
};
