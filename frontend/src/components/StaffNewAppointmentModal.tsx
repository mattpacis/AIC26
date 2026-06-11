import { useEffect, useState } from 'react';
import {
  createAppointment,
  getAppointmentAvailability,
  listStaffStudents,
  type StaffStudentListItem,
} from '../api/client';
import './StaffNewTicketModal.css';

type StaffNewAppointmentModalProps = {
  open: boolean;
  department: string;
  staffName: string;
  onClose: () => void;
  onCreated: () => void;
};

export function StaffNewAppointmentModal({
  open,
  department,
  staffName,
  onClose,
  onCreated,
}: StaffNewAppointmentModalProps) {
  const [students, setStudents] = useState<StaffStudentListItem[]>([]);
  const [studentUserId, setStudentUserId] = useState('');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<Array<{ startsAt: string; timeLabel: string; dateLabel: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setLoading(true);

    async function load() {
      try {
        const [{ students: rows }, availability] = await Promise.all([
          listStaffStudents(),
          getAppointmentAvailability({ department, year, month }),
        ]);
        if (cancelled) return;
        setStudents(rows);
        setStudentUserId((current) => {
          if (current && rows.some((row) => row.userId === current)) return current;
          return rows[0]?.userId ?? '';
        });
        const flat = availability.availability.slots.map((slot) => ({
          startsAt: slot.startsAt,
          timeLabel: slot.timeLabel,
          dateLabel: slot.dateLabel ?? slot.weekday ?? '',
        }));
        setSlots(flat.slice(0, 24));
        setSelectedSlot(flat[0]?.startsAt ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load form data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, department, year, month]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!studentUserId || !title.trim() || !selectedSlot || saving) return;

    setSaving(true);
    setError(null);
    try {
      await createAppointment({
        title: title.trim(),
        department,
        purpose: purpose.trim() || undefined,
        staffName,
        scheduledAt: selectedSlot,
        studentUserId,
      });
      setTitle('');
      setPurpose('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="staff-new-ticket__overlay" onClick={onClose}>
      <form
        className="staff-new-ticket__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-new-appt-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 id="staff-new-appt-title">New appointment</h2>
        <p className="staff-new-ticket__hint">
          Schedule a <strong>{department}</strong> appointment for a student.
        </p>

        <label className="staff-new-ticket__field">
          Student
          <select
            value={studentUserId}
            onChange={(event) => setStudentUserId(event.target.value)}
            disabled={loading || saving}
            required
          >
            {students.length === 0 ? (
              <option value="">No students available</option>
            ) : (
              students.map((student) => (
                <option key={student.userId} value={student.userId}>
                  {student.name} · {student.email}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="staff-new-ticket__field">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Registration follow-up"
            disabled={saving}
            required
          />
        </label>

        <label className="staff-new-ticket__field">
          Purpose (optional)
          <textarea
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            rows={2}
            disabled={saving}
          />
        </label>

        <label className="staff-new-ticket__field">
          Time slot
          <select
            value={selectedSlot ?? ''}
            onChange={(event) => setSelectedSlot(event.target.value)}
            disabled={loading || saving || slots.length === 0}
            required
          >
            {slots.length === 0 ? (
              <option value="">No slots available</option>
            ) : (
              slots.map((slot) => (
                <option key={slot.startsAt} value={slot.startsAt}>
                  {slot.dateLabel} · {slot.timeLabel}
                </option>
              ))
            )}
          </select>
        </label>

        {error && <p className="staff-new-ticket__error">{error}</p>}

        <div className="staff-new-ticket__actions">
          <button type="button" className="staff-new-ticket__cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="staff-new-ticket__submit" disabled={saving || loading}>
            {saving ? 'Scheduling…' : 'Schedule appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
