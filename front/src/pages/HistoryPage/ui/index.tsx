import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type HistoryEntry,
  HistoryItem,
  HistoryItemSkeleton,
  HistoryPlaceholder,
  useDeleteHistoryEntry,
  useHistory,
  useRenameHistoryEntry,
} from '@/entities/history';
import { announceRouteChange } from '@/shared/lib/a11y';
import { formatDateGroup, formatTime } from '@/shared/lib/date';
import {
  ActionMenuItem,
  PencilIcon,
  SearchField,
  SegmentedControl,
  TrashIcon,
} from '@/shared/ui/v2';

import {
  CALLS_STUB_MESSAGE,
  HISTORY_PANEL_ID,
  HISTORY_SECTIONS,
  HISTORY_TAB_ID,
  type HistorySection,
} from '../model/sections';

import './HistoryPage.scss';

/** Сколько заглушек показать, пока список грузится, — примерно экран строк. */
const SKELETON_COUNT = 5;

const matchesQuery = (entry: HistoryEntry, query: string): boolean =>
  entry.title.toLowerCase().includes(query) ||
  entry.messages.some((message) => message.text.toLowerCase().includes(query));

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState<HistorySection>('chats');
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const { data: entries = [], isPending, isError } = useHistory();
  const renameMutation = useRenameHistoryEntry();
  const deleteMutation = useDeleteHistoryEntry();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      return entries;
    }
    return entries.filter((entry) => matchesQuery(entry, normalized));
  }, [entries, query]);

  const handleSectionChange = (next: HistorySection) => {
    setSection(next);
    if (next === 'calls') {
      announceRouteChange(`Звонки. ${CALLS_STUB_MESSAGE}`);
    }
  };

  const handleSearchSubmit = (value: string) => {
    announceRouteChange(
      value.trim()
        ? `Найдено записей: ${filtered.length}`
        : `Показаны все записи: ${entries.length}`,
    );
  };

  const handleRename = async (entry: HistoryEntry, title: string) => {
    setRenamingId(null);
    try {
      await renameMutation.mutateAsync({ id: entry.id, title });
      announceRouteChange(`Запись переименована: ${title}`);
    } catch {
      announceRouteChange('Не удалось переименовать запись. Попробуйте ещё раз.');
    }
  };

  const handleDelete = async (entry: HistoryEntry) => {
    try {
      await deleteMutation.mutateAsync(entry.id);
      announceRouteChange(`Запись удалена: ${entry.title}`);
    } catch {
      announceRouteChange('Не удалось удалить запись. Попробуйте ещё раз.');
    }
  };

  const renderChats = () => {
    if (isPending) {
      return (
        <>
          <p className="visually-hidden" role="status">
            Загружаем историю
          </p>
          <ul className="history-page__list" aria-hidden="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <HistoryItemSkeleton key={index} />
            ))}
          </ul>
        </>
      );
    }

    if (isError) {
      return <HistoryPlaceholder variant="error" message="Не удалось загрузить историю" />;
    }

    if (filtered.length === 0) {
      return (
        <HistoryPlaceholder
          variant="empty"
          message={query.trim() ? 'Ничего не найдено' : 'Здесь появится ваша история'}
        />
      );
    }

    return (
      <ul className="history-page__list" aria-label="Записи истории">
        {filtered.map((entry) => (
          <HistoryItem
            key={entry.id}
            title={entry.title}
            dateLabel={formatDateGroup(entry.createdAt)}
            time={formatTime(entry.createdAt)}
            menuLabel="Действия с чатом"
            onOpen={() => void navigate(`/dialog/${entry.id}`)}
            isRenaming={renamingId === entry.id}
            onRenameSubmit={(title) => void handleRename(entry, title)}
            onRenameCancel={() => setRenamingId(null)}
            menuItems={(close) => (
              <>
                <ActionMenuItem
                  icon={<PencilIcon />}
                  onClick={() => {
                    close();
                    setRenamingId(entry.id);
                  }}
                >
                  Переименовать чат
                </ActionMenuItem>
                <ActionMenuItem
                  danger
                  icon={<TrashIcon />}
                  onClick={() => {
                    close();
                    void handleDelete(entry);
                  }}
                >
                  Удалить чат
                </ActionMenuItem>
              </>
            )}
          />
        ))}
      </ul>
    );
  };

  return (
    <div className="history-page">
      <h1 className="history-page__title">История</h1>

      <div className="history-page__controls">
        <SearchField
          label="Поиск по истории"
          placeholder="Поиск по истории"
          value={query}
          onChange={setQuery}
          onSubmit={handleSearchSubmit}
        />

        <SegmentedControl
          aria-label="Раздел истории"
          options={HISTORY_SECTIONS}
          value={section}
          onChange={handleSectionChange}
        />
      </div>

      {section === 'chats' ? (
        <div
          id={HISTORY_PANEL_ID.chats}
          role="tabpanel"
          aria-labelledby={HISTORY_TAB_ID.chats}
          className="history-page__panel"
        >
          {renderChats()}
        </div>
      ) : (
        <div
          id={HISTORY_PANEL_ID.calls}
          role="tabpanel"
          aria-labelledby={HISTORY_TAB_ID.calls}
          className="history-page__panel"
          /* В панели нет ничего фокусируемого — даём ей собственную остановку Tab. */
          tabIndex={0}
        >
          <p className="history-page__stub">{CALLS_STUB_MESSAGE}</p>
        </div>
      )}
    </div>
  );
};
