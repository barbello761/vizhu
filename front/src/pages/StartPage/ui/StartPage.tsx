import { useNavigate } from 'react-router';

import type { UserRole } from '@/entities/user';
import { useAuthStore } from '@/features/auth';
import { env } from '@/shared/config';
import { Button, Logo } from '@/shared/ui/';
import { HeroScreen } from '@/widgets/HeroScreen';

import './StartPage.scss';

export const StartPage = () => {
  const navigate = useNavigate();
  const setRole = useAuthStore((s) => s.setRole);

  const continueAs = (role: UserRole) => () => {
    setRole(role);
    // На демо-стенде перед входом — экран о временных данных и запасном коде.
    void navigate(env.isDemo ? '/auth/demo' : '/auth/phone');
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

      <Button onClick={continueAs('blind')}>Начать</Button>
    </HeroScreen>
  );
};
