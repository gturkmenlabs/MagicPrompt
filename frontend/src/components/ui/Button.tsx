import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'surface' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  intent?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  className,
  variant = 'secondary',
  intent,
  size = 'md',
  type = 'button',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const activeVariant = intent ?? variant;
  const variants = {
    primary: 'ui-button--primary',
    secondary: 'ui-button--secondary',
    outline: 'ui-button--outline',
    ghost: 'ui-button--ghost',
    destructive: 'ui-button--destructive',
    surface: 'ui-button--surface',
    link: 'ui-button--link',
  };

  const sizes = {
    xs: 'ui-button--xs',
    sm: 'ui-button--sm',
    md: 'ui-button--md',
    lg: 'ui-button--lg',
    icon: 'ui-button--icon',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'ui-button btn-premium',
        variants[activeVariant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export default Button;
