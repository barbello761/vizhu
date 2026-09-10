import { type InputHTMLAttributes, type ReactNode } from 'react';

import { CheckmarkIcon } from '../../icons';

import './Checkbox.scss';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  children: ReactNode;
}

export const Checkbox = ({ children, className, ...nativeProps }: CheckboxProps) => (
  <label className={['checkbox', className].filter(Boolean).join(' ')}>
    <input {...nativeProps} type="checkbox" className="checkbox__control visually-hidden" />
    <span className="checkbox__box" aria-hidden="true">
      <CheckmarkIcon className="checkbox__mark" />
    </span>
    <span className="checkbox__label">{children}</span>
  </label>
);
