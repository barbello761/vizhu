import { type ReactNode, useCallback, useId, useRef, useState } from 'react';

import { useDismiss } from '@/shared/lib/use-dismiss';
import { ActionMenu, EllipsisVerticalIcon } from '@/shared/ui/v2';

import { HistoryItemRename } from './HistoryItemRename';

import './HistoryItem.scss';

interface HistoryItemProps {
  title: string;
  dateLabel: string;
  time: string;
  onOpen: () => void;
  /**
   * Пункты меню записи (`ActionMenuItem`). Функция получает `close`, чтобы
   * пункт сам закрыл меню и вернул фокус на кнопку — иначе после действия
   * фокус остался бы на исчезнувшем элементе.
   */
  menuItems: (close: () => void) => ReactNode;
  menuLabel?: string;
  isRenaming?: boolean;
  onRenameSubmit?: (title: string) => void;
  onRenameCancel?: () => void;
}

export const HistoryItem = ({
  title,
  dateLabel,
  time,
  onOpen,
  menuItems,
  menuLabel = 'Действия с записью',
  isRenaming = false,
  onRenameSubmit,
  onRenameCancel,
}: HistoryItemProps) => {
  const menuId = useId();
  const containerRef = useRef<HTMLLIElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    moreRef.current?.focus();
  }, []);

  const handleDismiss = useCallback(
    (reason: 'escape' | 'outside') => {
      if (reason === 'escape') {
        closeMenu();
        return;
      }
      setIsMenuOpen(false);
    },
    [closeMenu],
  );

  useDismiss({ isOpen: isMenuOpen, containerRef, onDismiss: handleDismiss });

  if (isRenaming && onRenameSubmit && onRenameCancel) {
    return (
      <li className="history-item">
        <HistoryItemRename title={title} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
      </li>
    );
  }

  const accessibleMenuName = `${menuLabel}: ${title}`;
  const cls = ['history-item', isMenuOpen && 'history-item--active'].filter(Boolean).join(' ');

  return (
    <li ref={containerRef} className={cls}>
      {/* Имя собрано явно: иначе скринридер склеит заголовок, дату и время в одно слово. */}
      <button
        type="button"
        className="history-item__open"
        aria-label={`${title}. ${dateLabel}, ${time}`}
        onClick={onOpen}
      >
        <span className="history-item__title">{title}</span>
        <span className="history-item__meta">
          <span>{dateLabel}</span>
          <span aria-hidden="true">•</span>
          <span>{time}</span>
        </span>
      </button>

      <button
        ref={moreRef}
        type="button"
        className="history-item__more"
        aria-label={accessibleMenuName}
        aria-expanded={isMenuOpen}
        aria-controls={menuId}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        <EllipsisVerticalIcon />
      </button>

      {isMenuOpen && (
        <ActionMenu id={menuId} aria-label={accessibleMenuName} className="history-item__menu">
          {menuItems(closeMenu)}
        </ActionMenu>
      )}
    </li>
  );
};
