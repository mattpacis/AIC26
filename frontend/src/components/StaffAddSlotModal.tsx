import { useEffect, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import { createStaffAppointmentSlotsBatch } from '../api/client';
import { DEMO_TODAY } from '../config/demoDate';
import {
  buildCalendarGrid,
  dayKey,
  MONTH_NAMES,
  sameCalendarDay,
  type CalendarDay,
} from '../utils/calendar';
import { buildSlotStartsAtList } from '../utils/slotTimes';
import './StaffAddSlotModal.css';
import './StaffRescheduleModal.css';

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes (1 slot)' },
  { value: 60, label: '1 hour (2 slots)' },
  { value: 90, label: '1.5 hours (3 slots)' },
  { value: 120, label: '2 hours (4 slots)' },
] as const;

type StaffAddSlotModalProps = {
  open: boolean;
  department: string;
  initialMonth: { year: number; month: number };
  initialDay: CalendarDay | null;
  onClose: () => void;
  onCreated: () => void;
};

function isPastDay(day: CalendarDay) {
  const candidate = new Date(day.year, day.month, day.day);
  const today = new Date(DEMO_TODAY.year, DEMO_TODAY.month, DEMO_TODAY.day);
  return candidate < today;
}

export function StaffAddSlotModal({
  open,
  department,
  initialMonth,
  initialDay,
  onClose,
  onCreated,
}: StaffAddSlotModalProps) {
  const [pickerMonth, setPickerMonth] = useState(initialMonth);
  const [pickerDay, setPickerDay] = useState<CalendarDay | null>(
    initialDay && !initialDay.otherMonth ? initialDay : null,
  );
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickerMonth(initialMonth);
    setPickerDay(initialDay && !initialDay.otherMonth ? initialDay : null);
    setStartTime('09:00');
    setDurationMinutes(30);
    setError(null);
  }, [open, initialMonth, initialDay]);

  if (!open) return null;

  const calendarDays = buildCalendarGrid(pickerMonth.year, pickerMonth.month);
  const previewSlots =
    pickerDay && !pickerDay.otherMonth
      ? buildSlotStartsAtList(pickerDay, startTime, durationMinutes)
      : [];

  function shiftMonth(delta: number) {
    const next = new Date(pickerMonth.year, pickerMonth.month + delta, 1);
    setPickerMonth({ year: next.getFullYear(), month: next.getMonth() });
    setPickerDay(null);
  }

  async function handleSave() {
    if (!pickerDay || pickerDay.otherMonth || previewSlots.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const { slots, errors } = await createStaffAppointmentSlotsBatch(previewSlots);
      if (slots.length > 0) {
        onCreated();
      }

      if (errors.length === 0) {
        onClose();
        return;
      }

      if (slots.length > 0) {
        setError(
          `Added ${slots.length} slot${slots.length === 1 ? '' : 's'}. Some times were skipped: ${errors[0]}`,
        );
        return;
      }

      setError(errors[0] ?? 'Failed to add slots');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add slots');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="staff-reschedule__overlay" role="presentation" onClick={onClose}>
      <div
        className="staff-reschedule__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-add-slot-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="staff-reschedule__header">
          <div>
            <h3 id="staff-add-slot-title">Add availability slots</h3>
            <p>{department}</p>
          </div>
          <button type="button" className="staff-reschedule__close" onClick={onClose}>
            <IconX size={16} aria-hidden />
          </button>
        </div>

        <div className="staff-reschedule__month">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <IconChevronLeft size={16} aria-hidden />
          </button>
          <span>
            {MONTH_NAMES[pickerMonth.month]} {pickerMonth.year}
          </span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">
            <IconChevronRight size={16} aria-hidden />
          </button>
        </div>

        <div className="staff-reschedule__calendar">
          {calendarDays.map((day) => {
            const key = dayKey(day);
            const selected =
              pickerDay && sameCalendarDay(day, pickerDay) && !day.otherMonth;
            const disabled = day.otherMonth || isPastDay(day);
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                className={`staff-reschedule__day${selected ? ' selected' : ''}${day.otherMonth ? ' muted' : ''}`}
                onClick={() => setPickerDay(day)}
              >
                {day.day}
              </button>
            );
          })}
        </div>

        {!pickerDay && (
          <p className="staff-reschedule__hint">Pick a date on the calendar to continue.</p>
        )}

        {pickerDay && (
          <div className="staff-add-slot__fields">
            <label className="staff-add-slot__field">
              <span>Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="staff-add-slot__field">
              <span>Duration</span>
              <select
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                disabled={busy}
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {previewSlots.length > 0 && (
              <p className="staff-add-slot__preview">
                This will open{' '}
                {previewSlots
                  .map((iso) =>
                    new Date(iso).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    }),
                  )
                  .join(', ')}{' '}
                on{' '}
                {new Date(
                  pickerDay.year,
                  pickerDay.month,
                  pickerDay.day,
                ).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                .
              </p>
            )}
          </div>
        )}

        {error && <p className="staff-add-slot__error">{error}</p>}

        <div className="staff-reschedule__actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!pickerDay || previewSlots.length === 0 || busy}
            onClick={() => void handleSave()}
          >
            {busy ? 'Saving…' : 'Save slots'}
          </button>
        </div>
      </div>
    </div>
  );
}
