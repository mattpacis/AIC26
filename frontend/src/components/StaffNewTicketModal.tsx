import { useEffect, useState } from 'react';
import {
  createStaffTicket,
  listStaffStudents,
  type StaffStudentListItem,
} from '../api/client';
import './StaffNewTicketModal.css';

type StaffNewTicketModalProps = {
  open: boolean;
  department: string;
  onClose: () => void;
  onCreated: (ticketId: string) => void;
};

export function StaffNewTicketModal({
  open,
  department,
  onClose,
  onCreated,
}: StaffNewTicketModalProps) {
  const [students, setStudents] = useState<StaffStudentListItem[]>([]);
  const [studentUserId, setStudentUserId] = useState('');
  const [concern, setConcern] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setLoadingStudents(true);

    async function loadStudents() {
      try {
        const { students: rows } = await listStaffStudents();
        if (cancelled) return;
        setStudents(rows);
        setStudentUserId((current) => {
          if (current && rows.some((row) => row.userId === current)) return current;
          return rows[0]?.userId ?? '';
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load students');
        }
      } finally {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      }
    }

    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!studentUserId || !concern.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      const { ticket } = await createStaffTicket({
        studentUserId,
        concern: concern.trim(),
        description: description.trim() || undefined,
        urgency,
      });
      onCreated(ticket.id);
      setConcern('');
      setDescription('');
      setUrgency('MEDIUM');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
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
        aria-labelledby="staff-new-ticket-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 id="staff-new-ticket-title">New ticket</h2>
        <p className="staff-new-ticket__hint">
          Creates a ticket in <strong>{department}</strong> and assigns it to you.
        </p>

        <label className="staff-new-ticket__field">
          Student
          <select
            value={studentUserId}
            onChange={(event) => setStudentUserId(event.target.value)}
            disabled={loadingStudents || saving}
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
          Concern
          <input
            value={concern}
            onChange={(event) => setConcern(event.target.value)}
            placeholder="Brief summary of the issue"
            maxLength={200}
            disabled={saving}
            required
          />
        </label>

        <label className="staff-new-ticket__field">
          Details
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional additional context"
            rows={3}
            maxLength={2000}
            disabled={saving}
          />
        </label>

        <label className="staff-new-ticket__field">
          Urgency
          <select
            value={urgency}
            onChange={(event) =>
              setUrgency(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')
            }
            disabled={saving}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>

        {error && <p className="staff-new-ticket__error">{error}</p>}

        <div className="staff-new-ticket__actions">
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            className="staff-new-ticket__submit"
            disabled={saving || !studentUserId || !concern.trim()}
          >
            {saving ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
