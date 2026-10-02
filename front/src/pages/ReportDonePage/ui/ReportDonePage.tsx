import { useNavigate } from 'react-router';

import { useProfile } from '@/features/profile';
import { ResultScreen } from '@/widgets/ResultScreen';

/**
 * Экран успешной отправки жалобы.
 */
export const ReportDonePage = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const isBlind = profile?.role === 'blind';
  return (
    <ResultScreen
      title={'Жалоба\nотправлена'}
      description={`Спасибо за то, что помогаете делать наше приложение лучше! В отношении ${isBlind ? 'волонтёра' : 'незрячего'} будут приняты меры.`}
      onDone={() => void navigate(`${isBlind ? '/help' : '/volunteer'}`, { replace: true })}
      announce={`Жалоба на ${isBlind ? 'волонтёра' : 'незрячего'} отправлена.`}
    />
  );
};
