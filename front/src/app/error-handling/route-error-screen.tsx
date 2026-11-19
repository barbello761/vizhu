import { useEffect } from 'react';
import { useRouteError } from 'react-router';

import { toAppError } from '@/shared/lib/app-error';

import { FatalErrorScreen } from './fatal-error-screen';

/**
 * `errorElement` роутов. Без него react-router показывает свою отладочную
 * заглушку «Unexpected Application Error!» со стеком — человеку она ничего не
 * говорит, а скринридер прочтёт стек вслух. Сюда попадают падения рендера
 * экрана, исключения в лоадерах и недогруженный чанк экрана.
 */
export const RouteErrorScreen = () => {
  const error = useRouteError();
  useEffect(() => {
    console.error('[router] Ошибка экрана', error);
  }, [error]);

  return <FatalErrorScreen error={toAppError(error)} />;
};
