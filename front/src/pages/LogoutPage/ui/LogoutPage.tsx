import { useState } from 'react';
import { useNavigate } from 'react-router';

import { authApi, useAuthStore } from '@/features/auth';
import { ActionScreen } from '@/widgets/ActionScreen';

export const LogoutPage = () => {
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    // Сервер лучше уведомить, но даже при ошибке сессию завершаем локально.
    await authApi.logout().catch(() => undefined);
    storeLogout();
    void navigate('/logout/done', { replace: true });
  };

  return (
    <ActionScreen
      title={'Выйти\nиз аккаунта?'}
      description="Вы сможете войти в любой момент, используя свой номер телефона."
      confirmLabel="Выйти из аккаунта"
      confirmLoading={pending}
      onConfirm={() => void handleConfirm()}
      onCancel={() => void navigate(-1)}
      announce="Выйти из аккаунта? Вы сможете войти снова по номеру телефона."
    />
  );
};
