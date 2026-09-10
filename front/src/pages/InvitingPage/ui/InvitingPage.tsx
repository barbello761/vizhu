import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { announceRouteChange } from '@/shared/lib/a11y';
import { Button, ChevronBackIcon, CopyIcon, MockQr } from '@/shared/ui/v2';

import { INVITE_URL, INVITE_URL_LABEL } from '../model/invite';

import './InvitingPage.scss';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const InvitingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    announceRouteChange('Пригласите близкого. Покажите QR-код или отправьте ссылку-приглашение.');
  }, []);

  const handleCopy = async () => {
    announceRouteChange(
      (await copyToClipboard(INVITE_URL))
        ? 'Ссылка-приглашение скопирована'
        : 'Не удалось скопировать ссылку',
    );
  };

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Приглашение в ВИЖУ',
          text: 'Присоединяйтесь ко мне в ВИЖУ',
          url: INVITE_URL,
        });
        return;
      } catch (error) {
        // Пользователь закрыл системную шторку — это не ошибка.
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    }
    // Web Share API недоступен — запасной путь: копируем ссылку.
    await handleCopy();
  };

  return (
    <main id="main-content" className="inviting" tabIndex={-1} aria-labelledby="inviting-title">
      <div className="inviting__top">
        <Button variant="icon" aria-label="Назад" onClick={() => void navigate(-1)}>
          <ChevronBackIcon />
        </Button>
      </div>

      <div className="inviting__content">
        <h1 id="inviting-title" className="inviting__title">
          Пригласите близкого
        </h1>
        <p className="inviting__subtitle">Покажите QR-код или отправьте ссылку</p>

        <MockQr value={INVITE_URL} />

        <div className="inviting__link">
          <span className="inviting__link-value">{INVITE_URL_LABEL}</span>
          <button
            type="button"
            className="inviting__copy"
            aria-label={`Скопировать ссылку ${INVITE_URL_LABEL}`}
            onClick={() => void handleCopy()}
          >
            <CopyIcon />
          </button>
        </div>
      </div>

      <div className="inviting__actions">
        <Button onClick={() => void handleShare()}>Поделиться ссылкой</Button>
      </div>
    </main>
  );
};
