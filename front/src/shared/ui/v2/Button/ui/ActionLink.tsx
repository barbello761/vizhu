import { type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

import './Button.scss';

type Variant = 'primary' | 'secondary' | 'tertiary';

interface CommonProps {
  children: ReactNode;
  /** Совпадает с вариантами `Button` — оформление берётся из тех же классов. */
  variant?: Variant;
  className?: string;
}

interface InternalLinkProps extends CommonProps, Omit<LinkProps, 'className' | 'children'> {
  to: LinkProps['to'];
  href?: never;
}

interface ExternalLinkProps
  extends
    CommonProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> {
  href: string;
  to?: never;
}

export type ActionLinkProps = InternalLinkProps | ExternalLinkProps;

/**
 * Нужен там, где действие — это переход (внешний ресурс или роут), а не поступок
 * на странице: тогда элемент должен быть настоящим `<a>`/`<Link>`, а не `<button>`,
 * чтобы работали Enter, контекстное меню и «открыть в новой вкладке».
 */
export const ActionLink = ({
  children,
  variant = 'primary',
  className,
  ...rest
}: ActionLinkProps) => {
  const cls = ['btn-v2', `btn-v2--${variant}`, className].filter(Boolean).join(' ');
  const content = <span className="btn-v2__label">{children}</span>;

  if ('href' in rest && rest.href !== undefined) {
    const { href, target, rel, ...anchorRest } = rest as ExternalLinkProps;
    const isExternal = /^https?:/i.test(href);

    return (
      <a
        {...anchorRest}
        className={cls}
        href={href}
        target={target ?? (isExternal ? '_blank' : undefined)}
        rel={rel ?? (isExternal ? 'noopener noreferrer' : undefined)}
      >
        {content}
      </a>
    );
  }

  const { to, ...linkRest } = rest as InternalLinkProps;
  return (
    <Link {...linkRest} to={to} className={cls}>
      {content}
    </Link>
  );
};
