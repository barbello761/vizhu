import { useNavigate } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y';
import { ActionScreen } from '@/widgets/ActionScreen';

const IN_DEVELOPMENT = 'Выход со всех устройств появится в одном из следующих обновлений';

export const LogoutAllPage = () => {
  const navigate = useNavigate();

  return (
    <ActionScreen
      title={'Выйти со всех\nустройств?'}
      description="Приложение завершит сеанс на всех устройствах, где вы вошли в аккаунт, кроме данного."
      confirmLabel="Выйти со всех устройств"
      confirmDisabled
      onConfirm={() => announceRouteChange(IN_DEVELOPMENT)}
      onCancel={() => void navigate(-1)}
      announce="Выйти со всех устройств? Сеансы на других устройствах будут завершены."
    />
  );
};
