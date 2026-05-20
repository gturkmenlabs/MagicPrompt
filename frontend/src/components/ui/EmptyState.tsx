import { ArrowUpDown } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  language?: string;
  onQuickStart?: (intent: string) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  title?: string;
  description?: string;
  reason?: string;
  primaryCta?: string;
  secondaryCta?: string;
}

const QUICK_STARTS = [
  'Write a React hook',
  'Design a REST API',
  'Optimize an SQL query',
  'Simplify a CI/CD flow',
];

export function EmptyState({
  
  onQuickStart,
  onPrimaryAction,
  onSecondaryAction,
  title,
  description,
  reason,
  primaryCta,
  secondaryCta,
}: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state__icon" aria-hidden="true">
        <ArrowUpDown size={26} strokeWidth={1.8} />
      </div>
      <h2 className="ui-empty-state__title">{title ?? ('Nothing here yet')}</h2>
      <p className="ui-empty-state__description">
        {description ?? ('This surface will populate after the first interaction.')}
      </p>
      {reason && <p className="ui-empty-state__reason">{reason}</p>}

      {(onPrimaryAction || onSecondaryAction) && (
        <div className="ui-empty-state__actions">
          {onPrimaryAction && (
            <Button variant="primary" size="lg" onClick={onPrimaryAction}>
              {primaryCta ?? ('Get started')}
            </Button>
          )}
          {onSecondaryAction && (
            <Button variant="secondary" size="lg" onClick={onSecondaryAction}>
              {secondaryCta ?? ('Use demo data')}
            </Button>
          )}
        </div>
      )}

      {onQuickStart && !onPrimaryAction && (
        <div className="ui-empty-state__quickstarts">
          {QUICK_STARTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onQuickStart(item)}
              className="ui-chip-button"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
