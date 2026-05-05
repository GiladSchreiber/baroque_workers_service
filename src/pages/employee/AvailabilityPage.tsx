import { useMemo, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSchedulingStore } from '../../store/schedulingStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { DAY_NAMES, SHIFT_GROUP_LABELS } from '../../types/scheduling'
import type { AvailabilitySubmission, WeekSlot } from '../../types/scheduling'
import {
  getNextWeekStart, getWeekTitle, getEffectiveSlotsForWeek, isAvailabilityOpen,
} from '../../lib/schedulingUtils'
import styles from './AvailabilityPage.module.scss'

const NEXT_WEEK  = getNextWeekStart()
const WEEK_TITLE = getWeekTitle(NEXT_WEEK)

// ── Single slot row ───────────────────────────────────────────────────────
function SlotRow({ slot, selected, disabled, onToggle }: {
  slot: WeekSlot
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`${styles.slotRow} ${selected ? styles.slotSelected : ''} ${disabled ? styles.slotDisabled : ''}`}
      onClick={disabled ? undefined : onToggle}
    >
      <span className={styles.slotName}>{slot.label}</span>
      <span className={`${styles.groupBadge} ${styles[`group-${slot.group}`]}`}>
        {SHIFT_GROUP_LABELS[slot.group]}
      </span>
      <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
      <span className={styles.checkmark}>{selected ? <CheckIcon /> : null}</span>
    </div>
  )
}

// ── Day section ───────────────────────────────────────────────────────────
function DaySection({ dow, slots, selected, blocked, onToggleSlot, onSelectAll, onBlockDay }: {
  dow: number
  slots: WeekSlot[]
  selected: Set<string>
  blocked: boolean
  onToggleSlot: (id: string) => void
  onSelectAll: (dow: number) => void
  onBlockDay:  (dow: number) => void
}) {
  return (
    <div className={`${styles.dayCard} ${blocked ? styles.dayCardBlocked : ''}`}>
      <div className={styles.dayHeader}>
        <span className={styles.dayName}>{DAY_NAMES[dow]}</span>
        <div className={styles.dayActions}>
          <button
            className={`${styles.dayBtn} ${styles.dayBtnCheck} ${!blocked && slots.every(s => selected.has(s.id)) ? styles.dayBtnActive : ''}`}
            onClick={() => onSelectAll(dow)}
            type="button"
            aria-label="בחר הכל"
          >
            <CheckIcon />
          </button>
          <button
            className={`${styles.dayBtn} ${styles.dayBtnX} ${blocked ? styles.dayBtnActive : ''}`}
            onClick={() => onBlockDay(dow)}
            type="button"
            aria-label="לא פנוי"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {!blocked && (
        <div className={styles.slotList}>
          {slots.map(slot => (
            <SlotRow
              key={slot.id}
              slot={slot}
              selected={selected.has(slot.id)}
              disabled={false}
              onToggle={() => onToggleSlot(slot.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────
export function AvailabilityPage() {
  const currentUser = useAuthStore(s => s.currentUser)!
  const templates   = useSchedulingStore(s => s.templates)
  const overrides   = useSchedulingStore(s => s.overrides)
  const submissions = useSchedulingStore(s => s.submissions)
  const upsertSub   = useSchedulingStore(s => s.upsertSubmission)

  const slots = useMemo(
    () => getEffectiveSlotsForWeek(NEXT_WEEK, templates, overrides),
    [templates, overrides],
  )

  const existing = submissions.find(
    s => s.employeeId === currentUser.id && s.weekStart === NEXT_WEEK,
  )

  const [submitted,   setSubmitted]   = useState(!!existing)
  const [editing,     setEditing]     = useState(false)
  const [isVacation,  setIsVacation]  = useState(existing?.isVacation ?? false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set(existing?.selectedSlotIds ?? []))
  const [blockedDays, setBlockedDays] = useState<Set<number>>(new Set(existing?.blockedDays ?? []))
  const [notes,       setNotes]       = useState(existing?.notes ?? '')

  const isOpen = isAvailabilityOpen(NEXT_WEEK)

  function toggleSlot(slotId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(slotId) ? next.delete(slotId) : next.add(slotId)
      return next
    })
  }

  function selectAll(dow: number) {
    const ids = slots.filter(s => s.dayOfWeek === dow).map(s => s.id)
    const allSelected = ids.every(id => selected.has(id))
    setBlockedDays(prev => { const n = new Set(prev); n.delete(dow); return n })
    setSelected(prev => {
      const n = new Set(prev)
      if (allSelected) {
        ids.forEach(id => n.delete(id))  // second tap → deselect all
      } else {
        ids.forEach(id => n.add(id))     // first tap → select all
      }
      return n
    })
  }

  function blockDay(dow: number) {
    const ids = slots.filter(s => s.dayOfWeek === dow).map(s => s.id)
    if (blockedDays.has(dow)) {
      // un-block (expand without selecting)
      setBlockedDays(prev => { const n = new Set(prev); n.delete(dow); return n })
    } else {
      // block: collapse + deselect all
      setBlockedDays(prev => { const n = new Set(prev); n.add(dow); return n })
      setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    }
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
    const sub   = submissions.find(s => s.employeeId === currentUser.id && s.weekStart === NEXT_WEEK)
    const count = sub?.selectedSlotIds.length ?? 0
    return (
      <div className={styles.page}>
        <PageHeader title="הגשת סידור" />
        <div className={styles.submittedCard}>
          <span className={styles.submittedIcon}>✓</span>
          <p className={styles.submittedTitle}>ההגשה התקבלה</p>
          <p className={styles.submittedSub}>{WEEK_TITLE}</p>
          {sub?.isVacation
            ? <p className={styles.submittedDetail}>חופשה שבועית</p>
            : <p className={styles.submittedDetail}>{count} משמרות נבחרו</p>
          }
          {sub?.notes && <p className={styles.submittedNotes}>"{sub.notes}"</p>}
          {isOpen && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>עריכת הגשה</button>
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

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <PageHeader title="הגשת סידור" />
      <div className={styles.weekBanner}>{WEEK_TITLE}</div>

      <div className={styles.form}>
        <label className={styles.vacationRow}>
          <input type="checkbox" checked={isVacation} onChange={e => setIsVacation(e.target.checked)} className={styles.vacationCheck} />
          <span className={styles.vacationLabel}>אני בחופשה השבוע</span>
        </label>

        {!isVacation && (
          <div className={styles.days}>
            {[0, 1, 2, 3, 4, 5, 6].map(dow => {
              // duty slots are manager-assigned only — workers don't see them
              const daySlots = slots.filter(s => s.dayOfWeek === dow && s.group !== 'duty')
              if (daySlots.length === 0) return null
              return (
                <DaySection
                  key={dow}
                  dow={dow}
                  slots={daySlots}
                  selected={selected}
                  blocked={blockedDays.has(dow)}
                  onToggleSlot={toggleSlot}
                  onSelectAll={selectAll}
                  onBlockDay={blockDay}
                />
              )
            })}
          </div>
        )}

        <div className={styles.notesSection}>
          <label className={styles.notesLabel} htmlFor="notes">הערות (אופציונלי)</label>
          <textarea
            id="notes"
            className={styles.notesInput}
            placeholder="כמות משמרות מועדפת, בקשות מיוחדות..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <button className={styles.submitBtn} onClick={handleSubmit}>
          {editing ? 'עריכת משמרות' : 'שליחת משמרות'}
        </button>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
