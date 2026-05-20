import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  success?: string;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'surface' | 'underline';
  fullWidth?: boolean;
}

export function Input({
  className,
  label,
  helper,
  error,
  success,
  leadingIcon,
  trailing,
  inputSize = 'md',
  variant = 'default',
  fullWidth = true,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (typeof label === 'string' ? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  const helperId = inputId ? `${inputId}-hint` : undefined;
  const message = error ?? success ?? helper;

  return (
    <label className={cn('ui-field', fullWidth && 'w-full')}>
      {label && <span className="ui-label">{label}</span>}
      <div className="relative group">
        {leadingIcon && (
          <span className="ui-input-leading">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={message ? helperId : undefined}
          className={cn(
            'ui-input premium-input',
            `ui-input--${inputSize}`,
            `ui-input--${variant}`,
            error && 'ui-input--error',
            success && !error && 'ui-input--success',
            leadingIcon ? 'pl-11' : undefined,
            trailing ? 'pr-12' : undefined,
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="ui-input-trailing">
            {trailing}
          </span>
        )}
      </div>
      {message && (
        <span
          id={helperId}
          className={cn('ui-helper-text', error && 'ui-helper-text--error', success && !error && 'ui-helper-text--success')}
        >
          {message}
        </span>
      )}
    </label>
  );
}

export default Input;
