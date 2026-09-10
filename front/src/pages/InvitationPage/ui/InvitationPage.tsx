import { useNavigate } from 'react-router';

import { Button, Logo } from '@/shared/ui/v2';
import { HeroScreen } from '@/widgets/HeroScreen';

import './InvitationPage.scss';

const INVITER_NAME_PLACEHOLDER = 'Ваня';

export const InvitationPage = () => {
  const navigate = useNavigate();

  return (
    <HeroScreen title="Приглашение в ВИЖУ">
      <Logo label={null} />

      <p className="invitation__text">
        <strong className="invitation__inviter">{INVITER_NAME_PLACEHOLDER}</strong> хочет добавить
        вас в свои близкие контакты — чтобы звонить вам напрямую и обращаться за помощью в трудных
        ситуациях. Зарегистрируйтесь, чтобы принять приглашение.
      </p>

      <Button onClick={() => void navigate('/auth/phone')}>Начать</Button>
    </HeroScreen>
  );
};
