import { useCallback, useEffect, useState } from 'react';
import {
  IconCalendarPlus,
  IconClock,
  IconEdit,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react';
import {
  listStaffAppointmentSlots,
  updateStaffAppointmentSlot,
  type StaffAppointmentSlot,
} from '../api/client';
import type { CalendarDay } from '../utils/calendar';
import { slotIsoFromExistingDate, toTimeInputValue } from '../utils/slotTimes';
import { StaffAddSlotModal } from './StaffAddSlotModal';
import './StaffAddSlotModal.css';
import './StaffAvailabilityPanel.css';

type StaffAvailabilityPanelProps = {
  year: number;
  month: number;
  selectedDay: CalendarDay | null;
  department: string;
};

export function StaffAvailabilityPanel({
  year,
  month,
  selectedDay,
  department,
}: StaffAvailabilityPanelProps) {
  const [slots, setSlots] = useState<StaffAppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');

  const dayFilter =
    selectedDay && !selectedDay.otherMonth ? selectedDay.day : undefined;

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { slots: rows } = await listStaffAppointmentSlots({
        year,
        month,
        day: dayFilter,
      });
      setSlots(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability slots');
    } finally {
      setLoading(false);
    }
  }, [year, month, dayFilter]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function handleToggle(slot: StaffAppointmentSlot) {
    setBusyId(slot.id);
    setError(null);
    try {
      await updateStaffAppointmentSlot(slot.id, { isOpen: !slot.isOpen });
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update slot');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(slot: StaffAppointmentSlot) {
    setBusyId(slot.id);
    setError(null);
    try {
      const startsAt = slotIsoFromExistingDate(slot.startsAt, editTime);
      await updateStaffAppointmentSlot(slot.id, { startsAt });
      setEditingId(null);
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update slot time');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="staff-availability">
        <div className="staff-dashboard__right-section-label staff-availability__heading">
          <IconClock size={14} aria-hidden />
          Availability slots
        </div>
        <p className="staff-availability__hint">
          Open slots appear to students when booking {department}. Close a slot to hide it
          without deleting it.
        </p>

        {error && <p className="staff-availability__error">{error}</p>}

        <button
          type="button"
          className="staff-dashboard__action-btn staff-dashboard__action-btn-success staff-availability__add-btn"
          onClick={() => setShowAddModal(true)}
        >
          <IconCalendarPlus size={13} aria-hidden />
          Add slot
        </button>

        <div className="staff-availability__list">
          {loading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div className="staff-availability__row staff-availability__row--loading" key={index} />
            ))}

          {!loading && slots.length === 0 && (
            <p className="staff-availability__empty">
              {dayFilter
                ? 'No slots on this day. Add one to open booking.'
                : 'No slots this month yet. Add your first available time.'}
            </p>
          )}

          {!loading &&
            slots.map((slot) => {
              const isEditing = editingId === slot.id;
              const statusLabel = slot.isBooked
                ? 'Booked'
                : slot.isOpen
                  ? 'Open'
                  : 'Closed';
              const statusClass = slot.isBooked
                ? 'booked'
                : slot.isOpen
                  ? 'open'
                  : 'closed';

              return (
                <div className="staff-availability__row" key={slot.id}>
                  <div className="staff-availability__row-main">
                    {isEditing ? (
                      <div className="staff-availability__edit-row">
                        <span className="staff-availability__date">{slot.dateLabel}</span>
                        <input
                          type="time"
                          className="staff-availability__time-input"
                          value={editTime}
                          onChange={(event) => setEditTime(event.target.value)}
                          disabled={busyId === slot.id}
                        />
                      </div>
                    ) : (
                      <>
                        <span className="staff-availability__time">{slot.timeLabel}</span>
                        <span className="staff-availability__date">{slot.dateLabel}</span>
                      </>
                    )}
                    <span
                      className={`staff-availability__status staff-availability__status--${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="staff-availability__row-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="staff-availability__icon-btn"
                          disabled={busyId === slot.id}
                          onClick={() => void handleSaveEdit(slot)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="staff-availability__icon-btn"
                          disabled={busyId === slot.id}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {!slot.isBooked && !slot.isPast && (
                          <button
                            type="button"
                            className="staff-availability__icon-btn"
                            title="Edit slot time"
                            disabled={busyId === slot.id}
                            onClick={() => {
                              setEditingId(slot.id);
                              setEditTime(toTimeInputValue(slot.startsAt));
                            }}
                          >
                            <IconEdit size={14} aria-hidden />
                          </button>
                        )}
                        {!slot.isBooked && !slot.isPast && (
                          <button
                            type="button"
                            className="staff-availability__icon-btn"
                            title={slot.isOpen ? 'Close slot' : 'Open slot'}
                            disabled={busyId === slot.id}
                            onClick={() => void handleToggle(slot)}
                          >
                            {slot.isOpen ? (
                              <IconLockOpen size={14} aria-hidden />
                            ) : (
                              <IconLock size={14} aria-hidden />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <StaffAddSlotModal
        open={showAddModal}
        department={department}
        initialMonth={{ year, month }}
        initialDay={selectedDay}
        onClose={() => setShowAddModal(false)}
        onCreated={() => void loadSlots()}
      />
    </>
  );
}
