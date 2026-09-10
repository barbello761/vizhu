import { useParams } from 'react-router';

import { HistoryDialog } from './HistoryDialog';
import { PhotoDialog } from './PhotoDialog';

/**
 * «Диалог о фото» — один экран с двумя источниками переписки:
 * `/dialog` продолжает активную сессию с камеры, `/dialog/:id` открывает
 * запись из истории.
 */
export const DialogPage = () => {
  const { id } = useParams<{ id?: string }>();

  return id ? <HistoryDialog id={id} /> : <PhotoDialog />;
};
