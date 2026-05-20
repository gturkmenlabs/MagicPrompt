import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'segmented' | 'underline';
}

export function Tabs<T extends string>({ value, items, onChange, className, size = 'md', variant = 'segmented' }: TabsProps<T>) {
  return (
    <div className={cn('ui-segment', `ui-segment--${size}`, `ui-segment--${variant}`, className)} role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn('ui-segment-item', active && 'active')}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="ui-segment-count" aria-hidden="true">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
