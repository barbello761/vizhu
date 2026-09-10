import { useNavigate } from 'react-router';

import { useAuthStore, type UserRole } from '@/features/auth';
import { Button, Logo } from '@/shared/ui/v2';
import { HeroScreen } from '@/widgets/HeroScreen';

import './StartPage.scss';

export const StartPage = () => {
  const navigate = useNavigate();
  const setRole = useAuthStore((s) => s.setRole);

  const continueAs = (role: UserRole) => () => {
    setRole(role);
    void navigate('/auth/phone');
  };

  return (
    <HeroScreen
      title="ВИЖУ"
      actions={
        <Button variant="tertiary" onClick={continueAs('volunteer')}>
          Я волонтёр
        </Button>
      }
    >
      <Logo label={null} />

      <p className="start__tagline">
        Опишем, что вокруг, прочитаем текст, соединим с волонтёром по видеосвязи
      </p>

      <Button onClick={continueAs('user')}>Начать</Button>
    </HeroScreen>
  );
};
