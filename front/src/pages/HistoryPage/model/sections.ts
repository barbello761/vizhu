import type { SegmentedControlOption } from '@/shared/ui/v2';

export type HistorySection = 'chats' | 'calls';

/** id нужны, чтобы связать вкладку с её панелью через aria-controls/aria-labelledby. */
export const HISTORY_TAB_ID: Record<HistorySection, string> = {
  chats: 'history-tab-chats',
  calls: 'history-tab-calls',
};

export const HISTORY_PANEL_ID: Record<HistorySection, string> = {
  chats: 'history-panel-chats',
  calls: 'history-panel-calls',
};

export const HISTORY_SECTIONS: readonly SegmentedControlOption<HistorySection>[] = [
  {
    value: 'chats',
    label: 'Чаты',
    id: HISTORY_TAB_ID.chats,
    controls: HISTORY_PANEL_ID.chats,
  },
  {
    value: 'calls',
    label: 'Звонки',
    id: HISTORY_TAB_ID.calls,
    controls: HISTORY_PANEL_ID.calls,
  },
];

export const HISTORY_SECTION_LABEL: Record<HistorySection, string> = {
  chats: 'Чаты',
  calls: 'Звонки',
};

/** Звонков ещё нет на бэкенде — раздел открывается, но остаётся заглушкой. */
export const CALLS_STUB_MESSAGE = 'Меню в разработке';
