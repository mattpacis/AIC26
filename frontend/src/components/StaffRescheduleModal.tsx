import { useEffect, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import {
  getAppointmentAvailability,
  type DepartmentAvailability,
} from '../api/client';
import { DEMO_TODAY } from '../config/demoDate';
import {
  buildCalendarGrid,
  dayKey,
  MONTH_NAMES,
  sameCalendarDay,
  type CalendarDay,
} from '../utils/calendar';
import './StaffRescheduleModal.css';

type StaffRescheduleModalProps = {
  department: string;
  ticketLabel: string;
  excludeAppointmentId?: string | null;
  initialStartsAt?: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (startsAt: string) => void;
};

export function StaffRescheduleModal({
  department,
  ticketLabel,
  excludeAppointmentId,
  initialStartsAt,
  busy = false,
  onClose,
  onConfirm,
}: StaffRescheduleModalProps) {
  const initial = initialStartsAt
    ? new Date(initialStartsAt)
    : new Date(DEMO_TODAY.year, DEMO_TODAY.month, DEMO_TODAY.day);
  const [pickerMonth, setPickerMonth] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [pickerDay, setPickerDay] = useState<CalendarDay | null>(null);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(
    initialStartsAt ?? null,
  );
  const [availability, setAvailability] = useState<DepartmentAvailability | null>(
    null,
  );
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    void getAppointmentAvailability({
      department,
      year: pickerMonth.year,
      month: pickerMonth.month,
      excludeAppointmentId: excludeAppointmentId ?? undefined,
    })
      .then((data) => {
        if (!cancelled) setAvailability(data.availability);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [department, pickerMonth.year, pickerMonth.month, excludeAppointmentId]);

  const calendarDays = buildCalendarGrid(pickerMonth.year, pickerMonth.month);
  const availableDayKeys = new Set(
    (availability?.slots ?? []).map((slot) =>
      dayKey({ year: slot.year, month: slot.month, day: slot.day }),
    ),
  );
  const daySlots =
    pickerDay && availability
      ? availability.slots.filter((slot) => sameCalendarDay(slot, pickerDay))
      : [];

  function shiftMonth(delta: number) {
    const next = new Date(pickerMonth.year, pickerMonth.month + delta, 1);
    setPickerMonth({ year: next.getFullYear(), month: next.getMonth() });
    setPickerDay(null);
  }

  return (
    <div className="staff-reschedule__overlay" role="presentation" onClick={onClose}>
      <div
        className="staff-reschedule__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-reschedule-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="staff-reschedule__header">
          <div>
            <h3 id="staff-reschedule-title">Reschedule appointment</h3>
            <p>{ticketLabel}</p>
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
            const available = availableDayKeys.has(key);
            const selected =
              pickerDay &&
              sameCalendarDay(day, pickerDay) &&
              !day.otherMonth;
            return (
              <button
                key={key}
                type="button"
                disabled={!available || day.otherMonth}
                className={`staff-reschedule__day${selected ? ' selected' : ''}${day.otherMonth ? ' muted' : ''}`}
                onClick={() => setPickerDay(day)}
              >
                {day.day}
              </button>
            );
          })}
        </div>

        <div className="staff-reschedule__slots">
          {loadingSlots && <p>Loading available times…</p>}
          {!loadingSlots && !pickerDay && (
            <p className="staff-reschedule__hint">Select a date to see time slots.</p>
          )}
          {!loadingSlots && pickerDay && daySlots.length === 0 && (
            <p className="staff-reschedule__hint">No slots on this date.</p>
          )}
          {daySlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={`staff-reschedule__slot${selectedStartsAt === slot.startsAt ? ' selected' : ''}`}
              onClick={() => setSelectedStartsAt(slot.startsAt)}
            >
              {slot.timeLabel}
            </button>
          ))}
        </div>

        <div className="staff-reschedule__actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!selectedStartsAt || busy}
            onClick={() => selectedStartsAt && onConfirm(selectedStartsAt)}
          >
            {busy ? 'Saving…' : 'Confirm reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
