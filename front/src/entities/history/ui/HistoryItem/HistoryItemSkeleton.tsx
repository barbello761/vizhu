import { EllipsisVerticalIcon } from '@/shared/ui/v2';

import './HistoryItem.scss';

export const HistoryItemSkeleton = () => (
  <li className="history-item" aria-hidden="true">
    <div className="history-item__skeleton-col">
      <span className="history-item__skeleton-bar history-item__skeleton-bar--title" />
      <span className="history-item__skeleton-row">
        <span className="history-item__skeleton-bar history-item__skeleton-bar--date" />
        <span className="history-item__skeleton-bar history-item__skeleton-bar--time" />
      </span>
    </div>
    <span className="history-item__skeleton-slot">
      <EllipsisVerticalIcon />
    </span>
  </li>
);
