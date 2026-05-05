import { useMemo, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSchedulingStore } from '../../store/schedulingStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { DAY_NAMES } from '../../types/scheduling'
import type { AvailabilitySubmission } from '../../types/scheduling'
import {
  getNextWeekStart, getWeekTitle, getEffectiveSlotsForWeek, isAvailabilityOpen,
} from '../../lib/schedulingUtils'
import styles from './AvailabilityPage.module.scss'

const NEXT_WEEK = getNextWeekStart()
const WEEK_TITLE = getWeekTitle(NEXT_WEEK)

export function AvailabilityPage() {
  const currentUser  = useAuthStore(s => s.currentUser)!
  const templates    = useSchedulingStore(s => s.templates)
  const overrides    = useSchedulingStore(s => s.overrides)
  const submissions  = useSchedulingStore(s => s.submissions)
  const upsertSub    = useSchedulingStore(s => s.upsertSubmission)

  const slots = useMemo(
    () => getEffectiveSlotsForWeek(NEXT_WEEK, templates, overrides),
    [templates, overrides],
  )

  const existing = submissions.find(
    s => s.employeeId === currentUser.id && s.weekStart === NEXT_WEEK,
  )

  const [submitted, setSubmitted] = useState(!!existing)
  const [editing,   setEditing]   = useState(false)

  // form state — initialise from existing submission if any
  const [isVacation,   setIsVacation]   = useState(existing?.isVacation ?? false)
  const [selected,     setSelected]     = useState<Set<string>>(new Set(existing?.selectedSlotIds ?? []))
  const [blockedDays,  setBlockedDays]  = useState<Set<number>>(new Set(existing?.blockedDays ?? []))
  const [notes,        setNotes]        = useState(existing?.notes ?? '')

  const isOpen = isAvailabilityOpen(NEXT_WEEK)

  // ── Helpers ────────────────────────────────────────────────────────────
  function toggleSlot(slotId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(slotId) ? next.delete(slotId) : next.add(slotId)
      return next
    })
  }

  function toggleDay(dow: number) {
    const daySlotIds = slots.filter(s => s.dayOfWeek === dow).map(s => s.id)
    setBlockedDays(prev => {
      const next = new Set(prev)
      if (next.has(dow)) {
        // un-block
        next.delete(dow)
      } else {
        // block — also deselect all slots for that day
        next.add(dow)
        setSelected(sel => {
          const ns = new Set(sel)
          daySlotIds.forEach(id => ns.delete(id))
          return ns
        })
      }
      return next
    })
  }

  function handleSubmit() {
    const sub: AvailabilitySubmission = {
      id:              existing?.id ?? `sub-${currentUser.id}-${NEXT_WEEK}`,
      employeeId:      currentUser.id,
      weekStart:       NEXT_WEEK,
      isVacation,
      notes,
      submittedAt:     new Date().toISOString(),
      selectedSlotIds: isVacation ? [] : Array.from(selected),
      blockedDays:     isVacation ? [] : Array.from(blockedDays),
    }
    upsertSub(sub)
    setSubmitted(true)
    setEditing(false)
  }

  // ── Submitted view ──────────────────────────────────────────────────────
  if (submitted && !editing) {
    const sub = submissions.find(
      s => s.employeeId === currentUser.id && s.weekStart === NEXT_WEEK,
    )
    const count = sub?.selectedSlotIds.length ?? 0
    return (
      <div className={styles.page}>
        <PageHeader title="הגשת סידור" />
        <div className={styles.submittedCard}>
          <span className={styles.submittedIcon}>✓</span>
          <p className={styles.submittedTitle}>ההגשה התקבלה</p>
          <p className={styles.submittedSub}>{WEEK_TITLE}</p>
          {sub?.isVacation ? (
            <p className={styles.submittedDetail}>חופשה שבועית</p>
          ) : (
            <p className={styles.submittedDetail}>{count} משמרות נבחרו</p>
          )}
          {sub?.notes && (
            <p className={styles.submittedNotes}>"{sub.notes}"</p>
          )}
          {isOpen && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>
              עריכת הגשה
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Not yet open ────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div className={styles.page}>
        <PageHeader title="הגשת סידור" />
        <div className={styles.closedCard}>
          <p className={styles.closedTitle}>הגשות עוד לא פתוחות</p>
          <p className={styles.closedSub}>ניתן להגיש משמרות החל מיום שלישי</p>
          <p className={styles.weekLabel}>{WEEK_TITLE}</p>
        </div>
      </div>
    )
  }

  // ── Submission form ─────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <PageHeader title="הגשת סידור" />

      <div className={styles.weekBanner}>{WEEK_TITLE}</div>

      <div className={styles.form}>
        {/* Vacation toggle */}
        <label className={styles.vacationRow}>
          <input
            type="checkbox"
            checked={isVacation}
            onChange={e => setIsVacation(e.target.checked)}
            className={styles.vacationCheck}
          />
          <span className={styles.vacationLabel}>אני בחופשה השבוע</span>
        </label>

        {/* Slot selection (hidden when on vacation) */}
        {!isVacation && (
          <div className={styles.days}>
            {[0, 1, 2, 3, 4, 5, 6].map(dow => {
              const daySlots = slots.filter(s => s.dayOfWeek === dow)
              if (daySlots.length === 0) return null
              const isBlocked = blockedDays.has(dow)

              return (
                <div key={dow} className={`${styles.dayCard} ${isBlocked ? styles.dayBlocked : ''}`}>
                  <div className={styles.dayCardHeader}>
                    <span className={styles.dayCardName}>{DAY_NAMES[dow]}</span>
                    <button
                      className={`${styles.blockDayBtn} ${isBlocked ? styles.blockDayActive : ''}`}
                      onClick={() => toggleDay(dow)}
                      type="button"
                    >
                      {isBlocked ? 'לא פנוי – שחרר' : 'לא פנוי כל היום'}
                    </button>
                  </div>

                  <div className={styles.slotGrid}>
                    {daySlots.map(slot => {
                      const checked = selected.has(slot.id)
                      return (
                        <label
                          key={slot.id}
                          className={`${styles.slotChip} ${checked ? styles.slotChipSelected : ''} ${isBlocked ? styles.slotChipDisabled : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isBlocked}
                            onChange={() => toggleSlot(slot.id)}
                            className={styles.hiddenCheck}
                          />
                          <span className={styles.chipLabel}>{slot.label}</span>
                          <span className={styles.chipTime}>{slot.startTime}–{slot.endTime}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Notes */}
        <div className={styles.notesSection}>
          <label className={styles.notesLabel} htmlFor="notes">
            הערות (אופציונלי)
          </label>
          <textarea
            id="notes"
            className={styles.notesInput}
            placeholder="כמות משמרות מועדפת, בקשות מיוחדות..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit */}
        <button className={styles.submitBtn} onClick={handleSubmit}>
          {editing ? 'עדכן הגשה' : 'שלח הגשה'}
        </button>
      </div>
    </div>
  )
}
