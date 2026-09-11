import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { ActionScreen } from '@/widgets/ActionScreen';

const IN_DEVELOPMENT = 'Выход со всех устройств появится в одном из следующих обновлений';

export const LogoutAllPage = () => {
  const goBack = useGoBack('/profile/settings');

  return (
    <ActionScreen
      title={'Выйти со всех\nустройств?'}
      description="Приложение завершит сеанс на всех устройствах, где вы вошли в аккаунт, кроме данного."
      confirmLabel="Выйти со всех устройств"
      confirmDisabled
      onConfirm={() => announceRouteChange(IN_DEVELOPMENT)}
      onCancel={goBack}
      announce="Выйти со всех устройств? Сеансы на других устройствах будут завершены."
    />
  );
};
