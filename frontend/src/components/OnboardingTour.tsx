import { useEffect, useState } from 'react';
import { IconSparkles, IconX } from '@tabler/icons-react';
import { updateUserSettings } from '../api/client';
import './OnboardingTour.css';

const STEPS = [
  {
    title: 'Welcome to Campus360',
    body: 'Your AI helpdesk routes questions to the right department and keeps everything in one place.',
  },
  {
    title: 'Ask the AI anything',
    body: 'Use the chat on your dashboard — it can open tickets, book appointments, and explain next steps.',
  },
  {
    title: 'Track your tickets',
    body: 'My Tickets shows live status, staff replies, and what to bring to appointments.',
  },
];

type OnboardingTourProps = {
  open: boolean;
  onComplete: () => void;
};

export function OnboardingTour({ open, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function finish() {
    try {
      await updateUserSettings({ onboardingComplete: true });
    } catch {
      // still dismiss locally
    }
    onComplete();
  }

  return (
    <div className="c360-onboard" role="dialog" aria-modal="true" aria-labelledby="c360-onboard-title">
      <div className="c360-onboard__backdrop" onClick={() => void finish()} />
      <div className="c360-onboard__card">
        <button
          type="button"
          className="c360-onboard__close"
          aria-label="Dismiss tour"
          onClick={() => void finish()}
        >
          <IconX size={16} />
        </button>
        <div className="c360-onboard__badge">
          <IconSparkles size={16} aria-hidden />
          Quick tour
        </div>
        <h2 id="c360-onboard-title">{current.title}</h2>
        <p>{current.body}</p>
        <div className="c360-onboard__dots" aria-hidden>
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={index === step ? 'active' : undefined}
            />
          ))}
        </div>
        <div className="c360-onboard__actions">
          {step > 0 && (
            <button type="button" className="c360-onboard__ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="c360-onboard__primary"
            onClick={() => {
              if (isLast) {
                void finish();
              } else {
                setStep((s) => s + 1);
              }
            }}
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
