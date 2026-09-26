import { useNavigate } from 'react-router';

import { env } from '@/shared/config';
import { Button, TextTile } from '@/shared/ui/';
import { FormScreen } from '@/widgets/FormScreen';

import './DemoNoticePage.scss';

/**
 * Код читается скринридером по цифрам: «8153» целиком он произносит
 * как «восемь тысяч сто пятьдесят три», и на слух его легко перепутать.
 */
const SpelledCode = ({ code }: { code: string }) => (
  <>
    <span className="demo-notice__code" aria-hidden="true">
      {code}
    </span>
    <span className="visually-hidden">{code.split('').join(' ')}</span>
  </>
);

/**
 * Только сборка демо-стенда (`env.isDemo`): экран между «Начать» и вводом
 * номера. Роут в router.tsx подключается под тем же флагом.
 */
export const DemoNoticePage = () => {
  const navigate = useNavigate();

  return (
    <FormScreen
      title="Это демо-версия ВИЖУ"
      description="Здесь можно попробовать все возможности приложения. Перед входом — несколько важных моментов."
      onBack={() => void navigate('/auth')}
      actions={<Button onClick={() => void navigate('/auth/phone')}>Понятно, продолжить</Button>}
    >
      <div className="demo-notice__tiles">
        <TextTile title="Данные временные">
          <p>Номер, имя, почта и история диалогов будут удалены после окончания демонстрации.</p>
        </TextTile>

        <TextTile title="Код для входа">
          <p>Мы позвоним на ваш номер и продиктуем код.</p>
          {env.demoOtpCode && (
            <p>
              Если звонок не поступил, введите код <SpelledCode code={env.demoOtpCode} />.
            </p>
          )}
        </TextTile>

        <TextTile title="Звонки волонтёрам">
          <p>
            Соединяют только участников демонстрации: с основным приложением демо-версия не связана.
          </p>
        </TextTile>
      </div>
    </FormScreen>
  );
};
