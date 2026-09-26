import { type ReactNode, useId } from 'react';

import './TextTile.scss';

interface TextTileProps {
  /** Заголовок плитки — акцентный, крупный (Heading 2 из макета). */
  title: string;
  /** Тело: один-два абзаца пояснений. */
  children: ReactNode;
  /** Уровень заголовка секции. По умолчанию 2. */
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * Рендерится как `<section>` с собственным заголовком — попадает в карту
 * заголовков страницы и в ротор скринридера.
 */
export const TextTile = ({ title, children, headingLevel = 2, className }: TextTileProps) => {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;

  return (
    <section
      className={['text-tile', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <Heading className="text-tile__title" id={titleId}>
        {title}
      </Heading>
      <div className="text-tile__body">{children}</div>
    </section>
  );
};
