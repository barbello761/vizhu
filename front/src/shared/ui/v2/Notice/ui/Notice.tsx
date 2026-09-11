import { type ReactNode } from 'react';

import './Notice.scss';

interface NoticeProps {
  children: ReactNode;
  /**
   * `plate` (по умолчанию) — серая плашка, когда пояснение заменяет собой
   * целый раздел. `plain` — сноска курсивом без фона, когда она поясняет
   * то, что рядом уже нарисовано.
   */
  variant?: 'plate' | 'plain';
  className?: string;
}

/**
 * Пояснение к разделу, которым пока нельзя пользоваться («функционал
 * в разработке»).
 *
 * Обычный текст, без `role`: это статичная подпись, а не событие, и живой
 * регион тут только мешал бы скринридеру. Ничего интерактивного внутри нет —
 * значит и мёртвых остановок фокуса не появляется.
 */
export const Notice = ({ children, variant = 'plate', className }: NoticeProps) => (
  <p className={['notice', `notice--${variant}`, className].filter(Boolean).join(' ')}>
    {children}
  </p>
);
