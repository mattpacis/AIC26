import type { ReactNode } from 'react';
import { IconInbox } from '@tabler/icons-react';
import './EmptyState.css';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="c360-empty">
      <div className="c360-empty__icon" aria-hidden>
        {icon ?? <IconInbox size={28} stroke={1.5} />}
      </div>
      <strong className="c360-empty__title">{title}</strong>
      {description && <p className="c360-empty__desc">{description}</p>}
      {action && <div className="c360-empty__action">{action}</div>}
    </div>
  );
}
