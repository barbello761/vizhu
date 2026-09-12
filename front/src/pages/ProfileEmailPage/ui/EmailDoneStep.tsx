import { ResultScreen } from '@/widgets/ResultScreen';

interface EmailDoneStepProps {
  onDone: () => void;
}

/** Шаг 4 смены почты: адрес подтверждён (макет 2844:22049). */
export const EmailDoneStep = ({ onDone }: EmailDoneStepProps) => (
  <ResultScreen
    title={'Электронная почта\nизменена'}
    description="Теперь для входа используется новая почта. Уведомление об изменении отправлено на все ваши устройства."
    onDone={onDone}
    announce="Электронная почта изменена. Теперь для входа используется новая почта."
  />
);
