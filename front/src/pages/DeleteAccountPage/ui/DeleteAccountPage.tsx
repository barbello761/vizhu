import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useDeleteProfile } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { ActionScreen } from '@/widgets/ActionScreen';

const DELETE_ERROR = 'Не удалось удалить аккаунт. Попробуйте ещё раз.';

export const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile/settings');
  const deleteProfile = useDeleteProfile();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      await deleteProfile.mutateAsync();
      // Сессия уже погашена мутацией — на экран «готово» уходим с replace,
      // чтобы «назад» не вернуло на подтверждение удаления несуществующего
      // аккаунта.
      void navigate('/delete-account/done', { replace: true });
    } catch {
      setError(DELETE_ERROR);
      announceRouteChange(DELETE_ERROR);
    }
  };

  return (
    <ActionScreen
      title={'Удалить\nаккаунт?'}
      description="Аккаунт, история запросов и настройки будут удалены безвозвратно. Восстановить их не получится."
      note={error ?? undefined}
      tone="danger"
      confirmLabel="Удалить аккаунт"
      confirmLoading={deleteProfile.isPending}
      onConfirm={() => void handleConfirm()}
      onCancel={goBack}
      announce="Удалить аккаунт? Действие необратимо: аккаунт, история и настройки будут стёрты."
    />
  );
};
