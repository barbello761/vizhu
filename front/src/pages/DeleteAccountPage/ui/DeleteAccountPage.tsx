import { useNavigate } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y';
import { ActionScreen } from '@/widgets/ActionScreen';

const IN_DEVELOPMENT = 'Удаление аккаунта появится в одном из следующих обновлений';

export const DeleteAccountPage = () => {
  const navigate = useNavigate();

  return (
    <ActionScreen
      title={'Удалить\nаккаунт?'}
      description="Мы отправим письмо для подтверждения. После перехода по ссылке аккаунт удалится безвозвратно вместе с историей и настройками."
      tone="danger"
      confirmLabel="Удалить аккаунт"
      confirmDisabled
      onConfirm={() => announceRouteChange(IN_DEVELOPMENT)}
      onCancel={() => void navigate(-1)}
      announce="Удалить аккаунт? Действие необратимо: аккаунт, история и настройки будут стёрты."
    />
  );
};
