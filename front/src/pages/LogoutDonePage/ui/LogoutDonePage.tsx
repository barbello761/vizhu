import { useNavigate } from 'react-router';

import { ResultScreen } from '@/widgets/ResultScreen';

export const LogoutDonePage = () => {
  const navigate = useNavigate();

  return (
    <ResultScreen
      title={'Вы вышли\nиз аккаунта'}
      description="Перейдите на стартовый экран приложения по кнопке ниже."
      onDone={() => void navigate('/auth', { replace: true })}
      announce="Вы вышли из аккаунта."
    />
  );
};
