import './icons.scss';

interface IconProps {
  className?: string;
}

export const EllipsisVerticalIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M16.0001 18.9979C17.657 18.9979 19.0001 17.6547 19.0001 15.9979C19.0001 14.341 17.657 12.9979 16.0001 12.9979C14.3433 12.9979 13.0001 14.341 13.0001 15.9979C13.0001 17.6547 14.3433 18.9979 16.0001 18.9979Z"
      fill="currentColor"
    />
    <path
      d="M16.0001 28.9979C17.657 28.9979 19.0001 27.6547 19.0001 25.9979C19.0001 24.341 17.657 22.9979 16.0001 22.9979C14.3433 22.9979 13.0001 24.341 13.0001 25.9979C13.0001 27.6547 14.3433 28.9979 16.0001 28.9979Z"
      fill="currentColor"
    />
    <path
      d="M16.0001 8.99186C17.657 8.99186 19.0001 7.64872 19.0001 5.99186C19.0001 4.33501 17.657 2.99186 16.0001 2.99186C14.3433 2.99186 13.0001 4.33501 13.0001 5.99186C13.0001 7.64872 14.3433 8.99186 16.0001 8.99186Z"
      fill="currentColor"
    />
  </svg>
);
