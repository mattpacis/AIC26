import { Fragment } from 'react';
import { IconCheck, IconCircle, IconClock } from '@tabler/icons-react';
import './StaffTicketStatusTrack.css';

export type StaffTrackStep = {
  label: string;
  sub: string;
  state: string;
  lineState?: string;
  icon?: string;
};

type StaffTicketStatusTrackProps = {
  steps: StaffTrackStep[];
};

function StepIcon({ state }: { state: string }) {
  if (state === 'done') return <IconCheck size={11} stroke={2.5} />;
  if (state === 'active') return <IconClock size={11} stroke={2} />;
  return <IconCircle size={9} stroke={2} />;
}

export function StaffTicketStatusTrack({ steps }: StaffTicketStatusTrackProps) {
  if (steps.length === 0) return null;

  return (
    <div className="staff-track staff-track--horizontal" aria-label="Ticket status progress">
      {steps.map((step, index) => (
        <Fragment key={`${step.label}-${index}`}>
          {index > 0 && (
            <span
              className={`staff-track__connector staff-track__connector--${steps[index - 1]?.lineState ?? steps[index - 1]?.state ?? 'pending'}`}
              aria-hidden
            />
          )}
          <div className={`staff-track__node staff-track__node--${step.state}`}>
            <span className="staff-track__dot">
              <StepIcon state={step.state} />
            </span>
            <strong className="staff-track__label">{step.label}</strong>
            <span className="staff-track__sub">{step.sub}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
