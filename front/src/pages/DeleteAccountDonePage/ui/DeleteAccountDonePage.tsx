import { useNavigate } from 'react-router';

import { ResultScreen } from '@/widgets/ResultScreen';

/**
 * Экран «Проверьте почту» после запроса удаления аккаунта. Пока не участвует во
 * флоу — кнопка подтверждения на предыдущем экране отключена (нет метода на бэке).
 */
export const DeleteAccountDonePage = () => {
  const navigate = useNavigate();

  return (
    <ResultScreen
      title={'Проверьте\nпочту'}
      description="Мы отправили письмо на вашу электронную почту. Перейдите по ссылке в нём, чтобы подтвердить удаление аккаунта. Ссылка действует 24 часа."
      onDone={() => void navigate('/profile', { replace: true })}
      announce="Проверьте почту: мы отправили письмо для подтверждения удаления аккаунта."
    />
  );
};
