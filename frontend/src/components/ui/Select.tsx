import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  error?: string;
  selectSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  options: SelectOption[];
}

export function Select({
  className,
  label,
  helper,
  error,
  selectSize = 'md',
  fullWidth = true,
  options,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? (typeof label === 'string' ? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  const helperId = selectId ? `${selectId}-hint` : undefined;
  const message = error ?? helper;

  return (
    <label className={cn('ui-field', fullWidth && 'w-full')}>
      {label && <span className="ui-label">{label}</span>}
      <span className="ui-input-wrap">
        <select
          id={selectId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={message ? helperId : undefined}
          className={cn('ui-select appearance-none pr-12', `ui-select--${selectSize}`, error && 'ui-select--error', className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="ui-input-trailing pointer-events-none">
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </span>
      {message && <span id={helperId} className={cn('ui-helper-text', error && 'ui-helper-text--error')}>{message}</span>}
    </label>
  );
}

export default Select;
