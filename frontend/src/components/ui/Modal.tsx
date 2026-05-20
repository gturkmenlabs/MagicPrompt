import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  actions,
  className,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center p-4">
      <div className={cn('modal-panel ui-card ui-card--glass w-full p-6', className)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="modal-title" className="text-[18px] font-semibold text-[var(--text-primary)]">{title}</h3>
            {description && <p className="ui-helper mt-2">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button"
            aria-label="Close modal"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {actions && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default Modal;
