import { useNavigate } from 'react-router';

import { ResultScreen } from '@/widgets/ResultScreen';

/**
 * Экран успешной отправки жалобы.
 */
export const ReportDonePage = () => {
  const navigate = useNavigate();

  return (
    <ResultScreen
      title={'Жалоба\nотправлена'}
      description="Спасибо, за то что помогаете делать наше приложение лучше! В отношении волонтёра будут приняты меры."
      onDone={() => void navigate('/help', { replace: true })}
      announce="Жалоба на волонтера отправлена."
    />
  );
};
