import { formatPhone } from '@/features/auth';
import { ResultScreen } from '@/widgets/ResultScreen';

interface PhoneDoneStepProps {
  phone: string;
  onDone: () => void;
}

/** Шаг 4 смены номера: готово. */
export const PhoneDoneStep = ({ phone, onDone }: PhoneDoneStepProps) => (
  <ResultScreen
    title={'Номер телефона\nизменён'}
    description={`Теперь для входа используется ${formatPhone(phone)}. Вы остались в аккаунте на всех устройствах — заново входить не нужно.`}
    onDone={onDone}
    announce={`Номер телефона изменён. Теперь для входа используется ${formatPhone(phone)}.`}
  />
);
