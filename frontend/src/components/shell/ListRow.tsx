import { cn } from '@/lib/utils';
import { Badge, Button } from '../ui';
import type { ListRowMeta } from '@/types/ui';

interface ListRowProps {
  title: string;
  description?: string;
  meta?: ListRowMeta[];
  onClick?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function ListRow({
  title,
  description,
  meta = [],
  onClick,
  actionLabel,
  onAction,
  className,
}: ListRowProps) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn('ui-list-row', onClick && 'ui-list-row--interactive', className)}
    >
      <div className="min-w-0 flex-1 text-left">
        <p className="ui-list-row__title">{title}</p>
        {description && <p className="ui-list-row__description">{description}</p>}
        {meta.length > 0 && (
          <div className="ui-list-row__meta">
          {meta.map((item) => (
            <Badge key={`${item.label}-${item.value}`} tone={item.tone ?? 'neutral'}>
              {item.label}: {item.value}
            </Badge>
          ))}
          </div>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onAction();
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default ListRow;
