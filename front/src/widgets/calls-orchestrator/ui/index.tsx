import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

import { useCallStore } from '@/features/calls';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

import { IncomingCallOverlay } from './incoming-call-overlay';

/**
 * Глобальный «дирижёр» матчинга. Живёт над всеми страницами (в RootLayout):
 *
 * - при сведении пары переводит на экран звонка,
 * - показывает волонтёру входящий поверх любой страницы,
 * - сообщает, что пропущенный звонок снял волонтёра с линии.
 */
const MISSED_MESSAGE = 'Вы пропустили звонок, поэтому мы сняли вас с линии';

export const CallsOrchestrator = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Слушатели сокета здесь не навешиваем: это делают goOnline/requestHelp
  // через init, а до них сокет не нужен — и его чанк не грузится на старте.
  const { phase, match, incoming, missedAt } = useCallStore(
    useShallow((s) => ({
      phase: s.phase,
      match: s.match,
      incoming: s.incoming,
      missedAt: s.missedAt,
    })),
  );

  useEffect(() => {
    if (missedAt === null) {
      return;
    }
    toast.info(MISSED_MESSAGE);
    announceRouteChange(`${MISSED_MESSAGE}. Чтобы снова принимать звонки, встаньте на линию.`);
  }, [missedAt]);

  const handledRoomRef = useRef<string | null>(null);

  // При матче — заводим обе стороны в комнату (один раз на комнату).
  useEffect(() => {
    if (phase === 'matched' && match && handledRoomRef.current !== match.room) {
      handledRoomRef.current = match.room;
      if (pathname !== '/call/room') {
        void navigate('/call/room');
      }
    }
    if (!match) {
      handledRoomRef.current = null;
    }
  }, [phase, match, pathname, navigate]);

  if (phase === 'incoming' && incoming) {
    return <IncomingCallOverlay requestId={incoming.requestId} />;
  }

  return null;
};
