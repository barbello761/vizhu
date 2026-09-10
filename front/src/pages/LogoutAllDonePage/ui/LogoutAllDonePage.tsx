import { useNavigate } from 'react-router';

import { ResultScreen } from '@/widgets/ResultScreen';

/**
 * Экран результата выхода со всех устройств. Пока не участвует во флоу — кнопка
 * подтверждения на предыдущем экране отключена (нет метода на бэке), поэтому сюда
 * попадают только по прямой ссылке.
 */
export const LogoutAllDonePage = () => {
  const navigate = useNavigate();

  return (
    <ResultScreen
      title={'Вы вышли\nсо всех устройств'}
      description="Завершили сеансы на всех устройствах, кроме данного."
      onDone={() => void navigate('/profile', { replace: true })}
      announce="Вы вышли со всех устройств, кроме данного."
    />
  );
};
