import { useNavigate } from 'react-router';

import { useAuthStore, type UserRole } from '@/features/auth';
import { Button, Logo } from '@/shared/ui/v2';

import './AuthPage.scss';

export const AuthPage = () => {
  const navigate = useNavigate();
  const setRole = useAuthStore((s) => s.setRole);

  const continueAs = (role: UserRole) => () => {
    setRole(role);
    void navigate('/auth/phone');
  };

  return (
    <main id="main-content" className="auth" tabIndex={-1} aria-labelledby="auth-title">
      <h1 id="auth-title" className="visually-hidden">
        ВИЖУ
      </h1>

      <div className="auth__center">
        <div className="auth__intro">
          <Logo label={null} />

          <p className="auth__tagline">
            Опишем, что вокруг, прочитаем текст, соединим с волонтёром по видеосвязи
          </p>

          <Button onClick={continueAs('user')}>Начать</Button>
        </div>
      </div>

      <Button variant="tertiary" onClick={continueAs('volunteer')}>
        Я волонтёр
      </Button>
    </main>
  );
};
