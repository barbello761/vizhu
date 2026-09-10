import { useNavigate } from 'react-router';

import { useOnboardingStore } from '@/features/onboarding';
import { Button } from '@/shared/ui/v2';
import { FormScreen } from '@/widgets/FormScreen';

import './OnboardingPage.scss';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const markSeen = useOnboardingStore((s) => s.markSeen);

  const finish = () => {
    markSeen();
    void navigate('/', { replace: true });
  };

  return (
    <FormScreen title="Добро пожаловать!" actions={<Button onClick={finish}>Начать</Button>}>
      <p className="onboarding__text">
        В разделе «ИИ камера» нажмите на кнопку, чтобы открыть камеру, сделайте снимок — ИИ опишет,
        что вокруг. Слева от затвора есть голосовой ассистент: с его помощью можно задать конкретный
        вопрос о том, что вас окружает.
      </p>

      <p className="onboarding__text">
        Чтобы позвать ассистента, скажите «Окей, Вижу», а затем попросите его сделать снимок.
        Ассистентом можно пользоваться и для навигации по приложению.
      </p>

      <p className="onboarding__text">
        Если ИИ не справляется — позвоните волонтёру. Можно пригласить в волонтёры близкого
        человека: обращаться к нему комфортнее, а звонок через ВИЖУ быстрее, чем через любой
        мессенджер.
      </p>
    </FormScreen>
  );
};
