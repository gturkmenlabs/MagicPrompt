export interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`ui-loading ${className}`.trim()} role="status" aria-live="polite" aria-label={label ?? 'Loading'}>
      <div className="ui-loading__spinner" aria-hidden="true" />
      {label && <p className="ui-helper mt-3">{label}</p>}
    </div>
  );
}
