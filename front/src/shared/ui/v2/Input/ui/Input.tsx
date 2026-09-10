import { type InputHTMLAttributes, type ReactNode, type Ref, useId } from 'react';

import './Input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export const Input = ({
  label,
  error,
  startIcon,
  endIcon,
  className,
  id: externalId,
  disabled,
  ...nativeProps
}: InputProps) => {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;

  const cls = ['input', error && 'input--error', disabled && 'input--disabled', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      {label && (
        <label className="input__label" htmlFor={id}>
          {label}
        </label>
      )}

      <div className="input__field">
        {startIcon && (
          <span className="input__slot" aria-hidden="true">
            {startIcon}
          </span>
        )}

        <input
          {...nativeProps}
          id={id}
          className="input__control"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />

        {endIcon && (
          <span className="input__slot" aria-hidden="true">
            {endIcon}
          </span>
        )}
      </div>

      {error && (
        <p className="input__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
