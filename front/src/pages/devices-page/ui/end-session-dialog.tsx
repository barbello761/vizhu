import { useId, useRef, useState } from 'react';

import { type Session, useRevokeSession } from '@/entities/session';
import { apiErrorMessage } from '@/shared/api';
import { announceRouteChange } from '@/shared/lib/a11y';
import { Modal } from '@/shared/ui';
import { ActionScreen } from '@/widgets/action-screen';

import './end-session-dialog.scss';

const END_ERROR = 'Не удалось завершить сеанс. Попробуйте ещё раз.';

interface EndSessionDialogProps {
  session: Session;
  onCancel: () => void;
  onEnded: (session: Session) => void;
}

/**
 * Подтверждение «Завершить сеанс?» — тем же экраном, что выход из аккаунта,
 * но окном поверх списка, а не роутом: системная «назад» и Escape просто
 * закрывают его, фокус возвращается на кнопку, с которой пришли, а в истории
 * не остаётся шага, на который после завершения пришлось бы возвращаться.
 */
export const EndSessionDialog = ({ session, onCancel, onEnded }: EndSessionDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  // Фокус — на содержимое окна, а не на первую кнопку: скринридер сначала
  // прочитает вопрос, и случайный двойной тап не завершит сеанс сам собой.
  const focusRef = useRef<HTMLDivElement>(null);
  const revoke = useRevokeSession();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await revoke.mutateAsync(session.id);
      onEnded(session);
    } catch (err) {
      const message = apiErrorMessage(err, END_ERROR);
      setError(message);
      announceRouteChange(message);
    }
  };

  return (
    <Modal
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onCancel}
      initialFocusRef={focusRef}
      className="end-session-dialog"
    >
      <div ref={focusRef} tabIndex={-1} className="end-session-dialog__content">
        <ActionScreen
          as="div"
          titleId={titleId}
          descriptionId={descriptionId}
          title={'Завершить\nсеанс?'}
          description={`На устройстве «${session.deviceName}» нужно будет снова войти по номеру телефона.`}
          note={error ?? undefined}
          confirmLabel="Завершить сеанс"
          confirmLoading={revoke.isPending}
          onConfirm={() => void handleConfirm()}
          onCancel={onCancel}
        />
      </div>
    </Modal>
  );
};
