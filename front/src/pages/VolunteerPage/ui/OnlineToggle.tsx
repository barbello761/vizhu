import { BrailleEye, MovingGradient } from '@/shared/ui/';

import './OnlineToggle.scss';

interface OnlineToggleProps {
  /** Волонтёр на линии — принимает звонки. */
  online: boolean;
  /** Переключить состояние линии. */
  onToggle: () => void;
}

/**
 * Крупная круглая кнопка-переключатель «на линии / не на линии»
 */
export const OnlineToggle = ({ online, onToggle }: OnlineToggleProps) => (
  <button
    type="button"
    className={['online-toggle', online && 'online-toggle--online'].filter(Boolean).join(' ')}
    aria-pressed={online}
    aria-label={online ? 'Уйти с линии' : 'Встать на линию'}
    onClick={onToggle}
  >
    {online && <MovingGradient className="online-toggle__gradient" />}
    <BrailleEye off={!online} className="online-toggle__eye" />
  </button>
);
