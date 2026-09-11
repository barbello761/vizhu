import { BrailleEye } from '@/shared/ui/v2/BrailleEye';
import { MovingGradient } from '@/shared/ui/v2/MovingGradient';

import './OnlineToggle.scss';

interface OnlineToggleProps {
  /** Волонтёр на линии — принимает звонки. */
  online: boolean;
  /** Переключить состояние линии. */
  onToggle: () => void;
}

/**
 * Крупная круглая кнопка-переключатель «на линии / не на линии» (макет
 * Figma 2851:34064 / 2851:34066) — главная цель экрана кабинета.
 *
 * Выключена — светлая плашка и перечёркнутый глаз; включена — заливка
 * фирменным плывущим градиентом (в макете это его же кадр, положенный
 * картинкой) и белый глаз. Глаз набран точками, как рельеф Брайля.
 *
 * Реализована как `toggle button` с `aria-pressed`: скринридер объявляет и
 * действие, и текущее состояние. Видимая подпись статуса живёт рядом на
 * странице в `role="status"` — здесь дублировать её не нужно, поэтому у кнопки
 * только доступное имя-действие.
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
