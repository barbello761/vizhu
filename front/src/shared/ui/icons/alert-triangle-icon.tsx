interface IconProps {
  className?: string;
}

/** «alert-triangle-outline» из макета экрана ошибки — иллюстрация 128px, без `.icon`. */
export const AlertTriangleIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    width="128"
    height="128"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M53.8667 19.8667C60.6222 8.4 67.3778 8.4 74.1333 19.8667L118.933 96.9333C124.267 106.089 121.644 110.667 111.067 110.667H16.9333C6.35556 110.667 3.73333 106.089 9.06667 96.9333L53.8667 19.8667Z"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinejoin="round"
    />
    <path d="M64 44V70.6667" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path
      d="M64 90.9333C66.3564 90.9333 68.2667 89.0231 68.2667 86.6667C68.2667 84.3103 66.3564 82.4 64 82.4C61.6436 82.4 59.7333 84.3103 59.7333 86.6667C59.7333 89.0231 61.6436 90.9333 64 90.9333Z"
      fill="currentColor"
    />
  </svg>
);
