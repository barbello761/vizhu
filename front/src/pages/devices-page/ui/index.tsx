import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { type Session, SessionCard, useSessions } from '@/entities/session';
import { announceRouteChange } from '@/shared/lib/a11y';
import { useGoBack } from '@/shared/lib/navigation';
import { Button, ChevronBackIcon, Notice, Spinner } from '@/shared/ui';

import { EndSessionDialog } from './end-session-dialog';
import './devices-page.scss';

const NO_OTHERS_HINT = 'Других активных сеансов нет — выходить не из чего';
const LOADING_HINT = 'Список устройств ещё загружается';

const pluralSessions = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'сеанс';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'сеанса';
  }
  return 'сеансов';
};

const othersSummary = (count: number) =>
  count === 0
    ? 'Вход выполнен только на этом устройстве.'
    : `Кроме этого, активно ещё ${count} ${pluralSessions(count)}.`;

/**
 * «Устройства» — где выполнен вход в аккаунт. Сверху это устройство, ниже
 * остальные сеансы, у каждого своя кнопка «Завершить сеанс». Внизу — выход
 * со всех устройств, кроме этого.
 */
export const DevicesPage = () => {
  const navigate = useNavigate();
  const goBack = useGoBack('/profile');
  const { data, isPending } = useSessions();
  const [ending, setEnding] = useState<Session | null>(null);
  const [endedCount, setEndedCount] = useState(0);
  const othersHeadingRef = useRef<HTMLHeadingElement>(null);
  const announcedRef = useRef(false);

  const othersCount = data?.others.length;
  // Почему «Выйти со всех» сейчас не сработает. Пока список не пришёл, «других
  // сеансов нет» было бы неправдой — говорим, что он грузится.
  const logoutAllBlocker = !data ? LOADING_HINT : othersCount === 0 ? NO_OTHERS_HINT : null;

  // Объявляем один раз, когда список уже есть: «активно ещё 2 сеанса»
  // полезнее, чем «Устройства» в тишине загрузки. Дальше число меняется от
  // завершения сеансов — о них говорит handleEnded, повтор перебил бы его.
  useEffect(() => {
    if (othersCount === undefined || announcedRef.current) {
      return;
    }
    announcedRef.current = true;
    announceRouteChange(`Устройства. ${othersSummary(othersCount)}`);
  }, [othersCount]);

  // Кнопка, с которой открыли окно, исчезла вместе с сеансом — фокусу некуда
  // вернуться. Ставим его на заголовок раздела: человек остаётся там же, в
  // списке, а не улетает в начало экрана. Эффект родителя срабатывает после
  // очистки окна, поэтому его возврат фокуса не перебьёт этот.
  useEffect(() => {
    if (endedCount > 0) {
      othersHeadingRef.current?.focus();
    }
  }, [endedCount]);

  const handleEnded = (session: Session) => {
    setEnding(null);
    setEndedCount((n) => n + 1);
    const left = (othersCount ?? 1) - 1;
    announceRouteChange(
      `Сеанс на устройстве ${session.deviceName} завершён. ${othersSummary(left)}`,
    );
  };

  const handleLogoutAll = () => {
    if (logoutAllBlocker) {
      announceRouteChange(logoutAllBlocker);
      return;
    }
    void navigate('/logout-all');
  };

  return (
    <main
      id="main-content"
      className="devices-page"
      tabIndex={-1}
      aria-labelledby="devices-page-title"
    >
      <div className="devices-page__header">
        <Button variant="icon" aria-label="Назад" onClick={goBack}>
          <ChevronBackIcon />
        </Button>
        <h1 id="devices-page-title" className="devices-page__title">
          Устройства
        </h1>
      </div>

      <div className="devices-page__body">
        {isPending && (
          <p className="devices-page__loading" role="status">
            <Spinner />
            <span>Загружаем список устройств</span>
          </p>
        )}

        {/* Ошибку загрузки показывает общий экран ошибки (QueryCache), здесь
            без данных просто пусто — второе сообщение о том же не нужно. */}
        {data && (
          <>
            <section className="devices-page__section" aria-labelledby="devices-current">
              <h2 id="devices-current" className="devices-page__section-title">
                Это устройство
              </h2>
              <SessionCard session={data.current} current />
            </section>

            <section className="devices-page__section" aria-labelledby="devices-others">
              <h2
                id="devices-others"
                ref={othersHeadingRef}
                tabIndex={-1}
                className="devices-page__section-title"
              >
                Активные сеансы
              </h2>
              {data.others.length > 0 ? (
                <ul className="devices-page__list">
                  {data.others.map((session) => (
                    <li key={session.id}>
                      <SessionCard
                        session={session}
                        action={() => (
                          <Button variant="tertiary" onClick={() => setEnding(session)}>
                            {/* Кнопок «Завершить сеанс» на экране несколько —
                                в имени должно быть, какой именно. Пробел — вне
                                span: края скрытого текста обрезаются, и без
                                него слова склеились бы в «сеансна». */}
                            Завершить сеанс{' '}
                            <span className="visually-hidden">
                              на устройстве {session.deviceName}
                            </span>
                          </Button>
                        )}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <Notice>
                  Других активных сеансов нет. Если войти в аккаунт на другом телефоне или в
                  браузере, он появится здесь.
                </Notice>
              )}
            </section>
          </>
        )}
      </div>

      <div className="devices-page__actions">
        <Button
          // Главное действие экрана — primary. Риск случайного нажатия закрыт
          // экраном подтверждения, а красный в приложении — только для
          // необратимого (удаление аккаунта).
          variant="primary"
          // Не мёртвый disabled: кнопка в фокусе и объясняет голосом, почему
          // сейчас не работает.
          aria-disabled={Boolean(logoutAllBlocker) || undefined}
          onClick={handleLogoutAll}
        >
          Выйти со всех устройств
          {logoutAllBlocker && <span className="visually-hidden">. {logoutAllBlocker}</span>}
        </Button>
      </div>

      {ending && (
        <EndSessionDialog session={ending} onCancel={() => setEnding(null)} onEnded={handleEnded} />
      )}
    </main>
  );
};
