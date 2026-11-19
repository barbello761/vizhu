import './icons.scss';

interface IconProps {
  className?: string;
}

/** Компьютер: сеанс в браузере на Windows, macOS, Linux. */
export const DesktopIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M7 5H25C26.6569 5 28 6.34315 28 8V19C28 20.6569 26.6569 22 25 22H7C5.34315 22 4 20.6569 4 19V8C4 6.34315 5.34315 5 7 5Z"
      fill="currentColor"
    />
    <path
      d="M13.2 23.5H18.8L19.4 26H21C21.5523 26 22 26.4477 22 27C22 27.5523 21.5523 28 21 28H11C10.4477 28 10 27.5523 10 27C10 26.4477 10.4477 26 11 26H12.6L13.2 23.5Z"
      fill="currentColor"
    />
  </svg>
);
