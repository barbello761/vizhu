import './icons.scss';

interface IconProps {
  className?: string;
}

/** Смартфон: устройство в списке сеансов и пункт меню «Устройства». */
export const PhonePortraitIcon = ({ className }: IconProps) => (
  <svg
    className={['icon', className].filter(Boolean).join(' ')}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.5 3H19.5C21.433 3 23 4.567 23 6.5V25.5C23 27.433 21.433 29 19.5 29H12.5C10.567 29 9 27.433 9 25.5V6.5C9 4.567 10.567 3 12.5 3ZM13.75 5.5C13.3358 5.5 13 5.83579 13 6.25C13 6.66421 13.3358 7 13.75 7H18.25C18.6642 7 19 6.66421 19 6.25C19 5.83579 18.6642 5.5 18.25 5.5H13.75Z"
      fill="currentColor"
    />
  </svg>
);
