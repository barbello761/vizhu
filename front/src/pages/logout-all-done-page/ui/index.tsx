import { useGoBack } from '@/shared/lib/navigation';
import { ResultScreen } from '@/widgets/result-screen';

/**
 * Результат выхода со всех устройств. Подтверждение ушло сюда с replace,
 * поэтому «назад» ведёт ровно на «Устройства», откуда пришли, — уже без
 * других сеансов в списке.
 */
export const LogoutAllDonePage = () => {
  const goBack = useGoBack('/profile/devices');

  return (
    <ResultScreen
      title={'Вы вышли\nсо всех устройств'}
      description="Завершили сеансы на всех устройствах, кроме данного."
      onDone={goBack}
      announce="Вы вышли со всех устройств, кроме данного."
    />
  );
};
