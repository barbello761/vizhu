import { APP_ERROR_MESSAGES, formatErrorCode, type AppError } from '@/shared/lib/app-error';
import { ErrorScreen } from '@/shared/ui';

import { reloadWhenOnline } from './reload-when-online';

/**
 * Экран вместо всего приложения: упал рендер или сам запуск. Состояние после
 * такого не спасти, поэтому выход один — перезагрузка (при живой связи).
 */
export const FatalErrorScreen = ({ error }: { error: AppError }) => (
  <ErrorScreen
    message={APP_ERROR_MESSAGES[error.kind]}
    code={formatErrorCode(error)}
    onRetry={() => void reloadWhenOnline()}
  />
);
