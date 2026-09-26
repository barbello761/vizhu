import './icons.scss';

interface IconProps {
  className?: string;
}

export const PencilIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M22.4137 8.08563L5.40562 25.1356L4.375 27.6306L6.87 26.6L23.92 9.59188L22.4137 8.08563ZM25.8169 4.68313L25.08 5.41938L26.5863 6.92563L27.3231 6.18875C27.5165 5.99526 27.6251 5.73292 27.6251 5.45938C27.6251 5.18584 27.5165 4.9235 27.3231 4.73L27.2763 4.68313C27.1804 4.5873 27.0667 4.51128 26.9415 4.45942C26.8163 4.40755 26.6821 4.38086 26.5466 4.38086C26.411 4.38086 26.2769 4.40755 26.1517 4.45942C26.0265 4.51128 25.9127 4.5873 25.8169 4.68313Z"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
