import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * «Назад» с запасным маршрутом.
 *
 * `navigate(-1)` молча ничего не делает, если идти назад некуда: экран открыт
 * прямой ссылкой, редиректом из лоадера или это первый экран после холодного
 * старта приложения (частый случай в нативной оболочке). Кнопка при этом
 * выглядит рабочей — нажатие не даёт ничего.
 *
 * `location.key === 'default'` — признак первой записи в истории роутера:
 * в этом случае уходим на `fallback` с `replace`, чтобы не плодить лишний шаг.
 *
 * @param fallback путь, куда вести, если истории нет
 */
export const useGoBack = (fallback: string) => {
  const navigate = useNavigate();
  const { key } = useLocation();
  const isFirstEntry = key === 'default';

  return useCallback(() => {
    if (isFirstEntry) {
      void navigate(fallback, { replace: true });
      return;
    }
    void navigate(-1);
  }, [isFirstEntry, navigate, fallback]);
};

/**
 * Есть ли куда возвращаться. Нужно там, где при отсутствии истории кнопку
 * «назад» лучше не рисовать вовсе, чем вести куда-то наугад.
 */
export const useHasHistory = (): boolean => useLocation().key !== 'default';
