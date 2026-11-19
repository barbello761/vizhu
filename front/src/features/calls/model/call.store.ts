import type { Socket } from 'socket.io-client';

import type { UserRole } from '@/features/profile';
import { createStore } from '@/shared/lib/zustand';

import { loadSocket } from './socket';
import type { CallCancelled, CallIntent, CallPhase, IncomingCall, MatchInfo } from './types';

/** Пауза перед ручным переподключением, когда socket.io сам сдался. */
const MANUAL_RECONNECT_MS = 3_000;

/** Фазы незрячего, в которых он ждёт волонтёра и принимает call:matched. */
const BLIND_SEEKING: readonly CallPhase[] = ['requesting', 'waiting', 'searching'];

interface CallState {
  phase: CallPhase;
  intent: CallIntent;
  match: MatchInfo | null;
  incoming: IncomingCall | null;
  /** Внутреннее: слушатели сокета уже навешаны. */
  bound: boolean;
  /** Только для dev-превью: форс-роль экрана звонка, минуя профиль. */
  previewRole: UserRole | null;
  /**
   * Метка времени, когда сервер снял волонтёра с линии за пропущенный звонок.
   * По её смене оркестратор озвучивает и показывает уведомление.
   */
  missedAt: number | null;
}

interface CallActions {
  /** Навесить обработчики сокета один раз (вызывается оркестратором). */
  init: () => void;
  /** Волонтёр встаёт на линию. */
  goOnline: () => void;
  /** Волонтёр уходит с линии. */
  goOffline: () => void;
  /** Незрячий зовёт помощь. */
  requestHelp: () => void;
  /** Незрячий отменяет запрос (до соединения). */
  cancelRequest: () => void;
  /** Волонтёр принимает входящий. */
  accept: (requestId: string) => void;
  /** Волонтёр отклоняет входящий. */
  decline: (requestId: string) => void;
  /** Звонок завершён — сбрасываем состояние и отключаем сокет матчинга. */
  endCall: () => void;
  /** Волонтёр завершил звонок, но остаётся на линии — снова в пул свободных. */
  returnToLine: () => void;
  reset: () => void;
}

type CallStore = CallState & CallActions;

export const useCallStore = createStore<CallStore>('Calls', (set, get) => {
  /**
   * Выполняет действие с сокетом, как только клиент загружен. Промис у всех
   * действий общий, поэтому колбэки отрабатывают в порядке вызова: слушатели
   * из init навешиваются раньше, чем goOnline/requestHelp подключаются.
   * Не загрузился — честно возвращаемся в idle, а не показываем «на линии»
   * без сокета.
   */
  const withSocket = (action: (socket: Socket) => void) => {
    loadSocket()
      .then(action)
      .catch((error: unknown) => {
        console.error('[calls] не удалось загрузить Socket.IO', error);
        set((d) => {
          d.bound = false;
          d.phase = 'idle';
          d.intent = null;
          d.incoming = null;
        });
      });
  };

  return {
    phase: 'idle',
    intent: null,
    match: null,
    incoming: null,
    bound: false,
    previewRole: null,
    missedAt: null,

    init: () => {
      if (get().bound) {
        return;
      }
      set((d) => {
        d.bound = true;
      });
      withSocket((socket) => {
        // На каждый (пере)коннект идемпотентно перезаявляем, кто мы (см. контракт §6a).
        // Важно: во время дозвона/звонка (incoming/matched) НЕ перезаявляем присутствие —
        // иначе волонтёр в разговоре снова попадёт в пул свободных.
        socket.on('connect', () => {
          const { intent, phase } = get();
          if (intent === 'volunteer' && (phase === 'volunteer-online' || phase === 'idle')) {
            socket.emit('volunteer:online');
            set((d) => {
              d.phase = 'volunteer-online';
            });
          }
          if (
            intent === 'blind' &&
            (phase === 'requesting' || phase === 'waiting' || phase === 'searching')
          ) {
            socket.emit('call:request');
          }
          // Сокет передёрнулся посреди активного звонка — просим сервер передоставить
          // матч. Раньше сервер слал его сам на каждый коннект, из-за чего свежий
          // звонок получал комнату ПРОШЛОГО (стороны разъезжались по разным комнатам).
          if (get().match && phase === 'matched') {
            socket.emit('call:resume');
          }
        });

        // Сервер отверг handshake (протухший/отозванный токен) или сам
        // отключил сокет. В обоих случаях socket.io больше не переподключается
        // сам — раньше это и был «тихий сход с линии». Пока намерение есть,
        // пробуем снова: auth-колбэк перед handshake обновит токен.
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleReconnect = () => {
          if (reconnectTimer || socket.active || !get().intent) {
            return;
          }
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (get().intent && !socket.connected) {
              socket.connect();
            }
          }, MANUAL_RECONNECT_MS);
        };

        socket.on('connect_error', (error: Error) => {
          console.warn('[calls] не удалось подключиться к матчингу:', error.message);
          scheduleReconnect();
        });

        socket.on('disconnect', (reason: string) => {
          if (reason === 'io server disconnect') {
            scheduleReconnect();
          }
        });

        socket.on('call:waiting', () => {
          set((d) => {
            if (d.intent === 'blind' && BLIND_SEEKING.includes(d.phase)) {
              d.phase = 'waiting';
            }
          });
        });

        socket.on('call:searching', () => {
          set((d) => {
            if (d.intent === 'blind' && BLIND_SEEKING.includes(d.phase)) {
              d.phase = 'searching';
            }
          });
        });

        socket.on('call:incoming', (payload: IncomingCall) => {
          const { intent, phase } = get();
          if (intent !== 'volunteer') {
            return;
          }
          // Входящий принимаем только в режиме ожидания. Посреди разговора или
          // поверх другого входящего он раньше перетирал состояние: звонок
          // терял фазу, а первый вызов продолжал висеть на сервере до таймаута.
          // Сразу отказываемся — сервер отдаст вызов другому волонтёру.
          if (phase !== 'volunteer-online') {
            socket.emit('call:decline', { requestId: payload.requestId });
            return;
          }
          set((d) => {
            d.incoming = payload;
            d.phase = 'incoming';
          });
        });

        socket.on('call:matched', (payload: MatchInfo) => {
          set((d) => {
            // Идемпотентность: повторный матч в ту же комнату игнорируем.
            if (d.match?.room === payload.room) {
              return;
            }
            // Матч ждём только из поиска (незрячий) или после «Принять»
            // (волонтёр). Запоздалый матч после отмены или второй матч во
            // время звонка уводил бы в чужую комнату — собеседники разъезжались.
            const expected =
              d.intent === 'blind' ? BLIND_SEEKING.includes(d.phase) : d.phase === 'incoming';
            if (!expected) {
              console.warn('[calls] неожиданный call:matched в фазе', d.phase);
              return;
            }
            d.match = payload;
            d.incoming = null;
            d.phase = 'matched';
          });
        });

        socket.on('call:cancelled', (payload?: Partial<CallCancelled>) => {
          const { intent, incoming } = get();
          // Отмена относится к конкретному вызову: запоздавшая отмена прошлого
          // не должна сбрасывать текущий входящий.
          if (intent !== 'volunteer' || !incoming) {
            return;
          }
          if (payload?.requestId && payload.requestId !== incoming.requestId) {
            return;
          }
          if (payload?.reason === 'missed') {
            // Сервер уже убрал волонтёра из пула — честно показываем «не на линии».
            set((d) => {
              d.intent = null;
              d.phase = 'idle';
              d.incoming = null;
              d.missedAt = Date.now();
            });
            socket.disconnect();
            return;
          }
          set((d) => {
            d.incoming = null;
            d.phase = 'volunteer-online';
          });
        });
      });
    },

    goOnline: () => {
      get().init();
      set((d) => {
        d.intent = 'volunteer';
        d.phase = 'volunteer-online';
      });
      withSocket((socket) => {
        if (socket.connected) {
          socket.emit('volunteer:online');
        } else {
          socket.connect();
        }
      });
    },

    goOffline: () => {
      set((d) => {
        d.intent = null;
        d.phase = 'idle';
        d.incoming = null;
      });
      withSocket((socket) => {
        // Явно объявляем уход: иначе сервер ещё 12с grace держит нас в пуле
        // и шлёт звонки в мёртвый сокет (незрячий видит «волонтёр найден» впустую).
        if (socket.connected) {
          socket.emit('volunteer:offline');
        }
        socket.disconnect();
      });
    },

    requestHelp: () => {
      get().init();
      set((d) => {
        d.intent = 'blind';
        d.phase = 'requesting';
        d.match = null;
      });
      withSocket((socket) => {
        if (socket.connected) {
          socket.emit('call:request');
        } else {
          socket.connect();
        }
      });
    },

    cancelRequest: () => {
      set((d) => {
        d.intent = null;
        d.phase = 'idle';
        d.match = null;
      });
      // Явная отмена: иначе запрос ещё 12с grace-окна жил на сервере, и
      // волонтёрам звонил вызов, которого уже нет.
      withSocket((socket) => {
        if (socket.connected) {
          socket.emit('call:cancel');
        }
        socket.disconnect();
      });
    },

    accept: (requestId) => {
      withSocket((socket) => socket.emit('call:accept', { requestId }));
    },

    decline: (requestId) => {
      withSocket((socket) => socket.emit('call:decline', { requestId }));
      set((d) => {
        d.incoming = null;
        d.phase = d.intent === 'volunteer' ? 'volunteer-online' : 'idle';
      });
    },

    endCall: () => {
      set((d) => {
        d.intent = null;
        d.phase = 'idle';
        d.match = null;
        d.incoming = null;
        d.previewRole = null;
      });
      withSocket((socket) => socket.disconnect());
    },

    returnToLine: () => {
      set((d) => {
        d.phase = 'volunteer-online';
        d.intent = 'volunteer';
        d.match = null;
        d.incoming = null;
        d.previewRole = null;
      });
      // Сокет НЕ рвём — просто снова заявляем присутствие, чтобы принимать звонки.
      withSocket((socket) => {
        if (socket.connected) {
          socket.emit('volunteer:online');
        } else {
          socket.connect();
        }
      });
    },

    reset: () => {
      set((d) => {
        d.phase = 'idle';
        d.intent = null;
        d.match = null;
        d.incoming = null;
        d.previewRole = null;
      });
    },
  };
});

// ─── Dev-превью без бэка ───────────────────────────────────────────────────────
// В деве кладём стор и хелперы на window, чтобы посмотреть экраны звонка/входящего
// из консоли (см. README-подсказку). В прод-сборку этот блок не попадает.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.__callStore = useCallStore;
  w.__previewIncoming = () =>
    useCallStore.setState({
      intent: 'volunteer',
      phase: 'incoming',
      incoming: { requestId: 'dev-request', blindUserId: 'dev-blind' },
    });
  w.__previewCall = (role: UserRole = 'volunteer') =>
    useCallStore.setState({
      phase: 'matched',
      previewRole: role,
      match: { url: 'wss://dev.invalid', room: 'dev-room', token: 'dev-token' },
    });
}
