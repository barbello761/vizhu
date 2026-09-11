import { VizhuStarIcon, WifiOffIcon } from '@/shared/ui/v2';

import './HistoryPlaceholder.scss';

interface HistoryPlaceholderProps {
  variant: 'empty' | 'error';
  message: string;
}

export const HistoryPlaceholder = ({ variant, message }: HistoryPlaceholderProps) => (
  <div
    className={`history-placeholder history-placeholder--${variant}`}
    role={variant === 'error' ? 'alert' : 'status'}
  >
    <span className="history-placeholder__icon">
      {variant === 'error' ? <WifiOffIcon /> : <VizhuStarIcon />}
    </span>
    <p className="history-placeholder__message">{message}</p>
  </div>
);
