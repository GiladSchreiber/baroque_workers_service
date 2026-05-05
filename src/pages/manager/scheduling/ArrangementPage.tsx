import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSchedulingStore } from '../../../store/schedulingStore'
import { useEmployeeStore } from '../../../store/employeeStore'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Modal } from '../../../components/ui/Modal'
import {
  getNextWeekStart,
  getWeekTitle,
  getEffectiveSlotsForWeek,
  buildArrangementMessage,
} from '../../../lib/schedulingUtils'
import {
  DAY_NAMES,
  SHIFT_GROUP_LABELS,
} from '../../../types/scheduling'
import type { WeekSlot } from '../../../types/scheduling'
import styles from './ArrangementPage.module.scss'

// ── Sub-nav tabs ─────────────────────────────────────────────────────────────
function SchedulingSubNav() {
  const navigate  = useNavigate()
  return (
    <div className={styles.subNav}>
      <button
        className={[styles.subTab, styles.subTabActive].join(' ')}
        onClick={() => navigate('/manager/scheduling/arrangement')}
      >
        סידור שבועי
      </button>
      <button
        className={styles.subTab}
        onClick={() => navigate('/manager/scheduling/templates')}
      >
        הגדרת משמרות
      </button>
    </div>
  )
}

// ── Assign Worker Modal ───────────────────────────────────────────────────────
interface AssignModalProps {
  slot: WeekSlot
  weekStart: string
  currentEmployeeId: string | null
  currentNote: string | null
  onClose: () => void
}

function AssignWorkerModal({ slot, weekStart, currentEmployeeId, currentNote, onClose }: AssignModalProps) {
  const { employees } = useEmployeeStore()
  const { submissions, assignments, upsertAssignment, removeAssignment } = useSchedulingStore()

  const [selectedId, setSelectedId]  = useState<string | null>(currentEmployeeId)
  const [note, setNote]               = useState(currentNote ?? '')

  const weekAssignments = useMemo(
    () => assignments.filter(a => a.weekStart === weekStart),
    [assignments, weekStart],
  )

  const submission = useMemo(
    () => submissions.filter(s => s.weekStart === weekStart),
    [submissions, weekStart],
  )

  const activeEmployees = useMemo(
    () => employees.filter(e => e.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [employees],
  )

  function shiftCountFor(empId: string) {
    return weekAssignments.filter(a => a.employeeId === empId).length
  }

  function submittedThisSlot(empId: string) {
    return submission.find(s => s.employeeId === empId)?.selectedSlotIds.includes(slot.id) ?? false
  }

  function handleSave() {
    if (!selectedId) {
      removeAssignment(weekStart, slot.id)
    } else {
      upsertAssignment({
        id: `asgn-${weekStart}-${slot.id}`,
        weekStart,
        slotId: slot.id,
        employeeId: selectedId,
        internshipNote: note.trim() || null,
      })
    }
    onClose()
  }

  const grouped = useMemo(() => {
    const submitted  = activeEmployees.filter(e => submittedThisSlot(e.id))
    const rest       = activeEmployees.filter(e => !submittedThisSlot(e.id))
    return { submitted, rest }
  }, [activeEmployees, slot.id])

  return (
    <Modal isOpen title={`שיבוץ – ${slot.label}`} onClose={onClose}>
      <div className={styles.assignModal}>
        <p className={styles.assignSlotInfo}>
          {SHIFT_GROUP_LABELS[slot.group]} · {slot.startTime}–{slot.endTime}
        </p>

        <div className={styles.empList}>
          <button
            className={[styles.empRow, selectedId === null ? styles.empSelected : ''].join(' ')}
            onClick={() => setSelectedId(null)}
          >
            <span className={styles.empName}>ריק (אין שיבוץ)</span>
          </button>

          {grouped.submitted.length > 0 && (
            <div className={styles.empGroupLabel}>הגישו את המשמרת</div>
          )}
          {grouped.submitted.map(emp => (
            <button
              key={emp.id}
              className={[styles.empRow, styles.empAvail, selectedId === emp.id ? styles.empSelected : ''].join(' ')}
              onClick={() => setSelectedId(emp.id)}
            >
              <span className={styles.empName}>{emp.name}</span>
              <span className={styles.empCount}>{shiftCountFor(emp.id)} משמרות</span>
              <span className={styles.empCheck}>✓</span>
            </button>
          ))}

          {grouped.rest.length > 0 && (
            <div className={styles.empGroupLabel}>לא הגישו</div>
          )}
          {grouped.rest.map(emp => (
            <button
              key={emp.id}
              className={[styles.empRow, selectedId === emp.id ? styles.empSelected : ''].join(' ')}
              onClick={() => setSelectedId(emp.id)}
            >
              <span className={styles.empName}>{emp.name}</span>
              <span className={styles.empCount}>{shiftCountFor(emp.id)} משמרות</span>
            </button>
          ))}
        </div>

        <label className={styles.noteLabel}>
          הערה (למשל: התלמדות)
          <input
            className={styles.noteInput}
            type="text"
            placeholder="אופציונלי"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </label>

        <div className={styles.assignActions}>
          <button className={styles.saveBtn} onClick={handleSave}>שמור</button>
          <button className={styles.cancelBtn} onClick={onClose}>ביטול</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Single slot row ───────────────────────────────────────────────────────────
interface SlotRowProps {
  slot: WeekSlot
  weekStart: string
  onAssign: (slot: WeekSlot) => void
}

function SlotRow({ slot, weekStart, onAssign }: SlotRowProps) {
  const assignments = useSchedulingStore(s => s.assignments)
  const { employees } = useEmployeeStore()

  const assignment = assignments.find(a => a.weekStart === weekStart && a.slotId === slot.id)
  const employee   = employees.find(e => e.id === assignment?.employeeId)

  const isUnassigned = !assignment?.employeeId

  return (
    <div
      className={[styles.slotRow, isUnassigned ? styles.slotUnassigned : ''].join(' ')}
      onClick={() => onAssign(slot)}
    >
      <div className={styles.slotMeta}>
        <span className={styles.slotLabel}>{slot.label}</span>
        <span className={[styles.groupBadge, styles[`group_${slot.group}`]].join(' ')}>
          {SHIFT_GROUP_LABELS[slot.group]}
        </span>
        <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
      </div>
      <div className={styles.slotAssignee}>
        {employee ? (
          <>
            <span className={styles.assigneeName}>{employee.name.split(' ')[0]}</span>
            {assignment?.internshipNote && (
              <span className={styles.internTag}>{assignment.internshipNote}</span>
            )}
          </>
        ) : (
          <span className={styles.emptySlot}>+ שבץ</span>
        )}
      </div>
    </div>
  )
}

// ── Day card ──────────────────────────────────────────────────────────────────
function DayCard({ dow, slots, weekStart, onAssign }: {
  dow: number
  slots: WeekSlot[]
  weekStart: string
  onAssign: (slot: WeekSlot) => void
}) {
  const daySlots = slots.filter(s => s.dayOfWeek === dow)
  if (daySlots.length === 0) return null

  const [y, m, d] = weekStart.split('-').map(Number)
  const dayDate = new Date(y, m - 1, d + dow)
  const dateStr = `${String(dayDate.getDate()).padStart(2, '0')}.${String(dayDate.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className={styles.dayCard}>
      <div className={styles.dayHeader}>
        <span className={styles.dayName}>{DAY_NAMES[dow]}</span>
        <span className={styles.dayDate}>{dateStr}</span>
      </div>
      {daySlots.map(slot => (
        <SlotRow key={slot.id} slot={slot} weekStart={weekStart} onAssign={onAssign} />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ArrangementPage() {
  const { templates, overrides, submissions, assignments, weeks, upsertWeek, seedDemoData } = useSchedulingStore()
  const { employees, fetchAll } = useEmployeeStore()

  const weekStart = getNextWeekStart()
  const weekTitle = getWeekTitle(weekStart)

  const slots = useMemo(
    () => getEffectiveSlotsForWeek(weekStart, templates, overrides),
    [weekStart, templates, overrides],
  )

  const activeEmployees = useMemo(
    () => employees.filter(e => e.isActive),
    [employees],
  )

  const weekSubmissions = useMemo(
    () => submissions.filter(s => s.weekStart === weekStart),
    [submissions, weekStart],
  )

  const weekAssignments = useMemo(
    () => assignments.filter(a => a.weekStart === weekStart),
    [assignments, weekStart],
  )

  const weekRecord = weeks.find(w => w.weekStart === weekStart)
  const isPublished = weekRecord?.isPublished ?? false

  const [assigningSlot, setAssigningSlot] = useState<WeekSlot | null>(null)
  const [notesOpen, setNotesOpen]         = useState(false)
  const [publishing, setPublishing]       = useState(false)
  const [copied, setCopied]               = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (employees.length > 0) {
      const ids = employees.filter(e => e.isActive).map(e => e.id)
      seedDemoData(weekStart, ids)
    }
  }, [employees.length])

  // ── Counters ──────────────────────────────────────────────────────────────
  const counters = useMemo(() => {
    const map: Record<string, number> = {}
    for (const emp of activeEmployees) map[emp.id] = 0
    for (const a of weekAssignments) {
      if (a.employeeId) map[a.employeeId] = (map[a.employeeId] ?? 0) + 1
    }
    return map
  }, [activeEmployees, weekAssignments])

  // ── Warnings ──────────────────────────────────────────────────────────────
  const warnings = useMemo(() => {
    const warns: string[] = []

    // Same worker on two slots on same day
    const byDay: Record<number, Record<string, number>> = {}
    for (const a of weekAssignments) {
      if (!a.employeeId) continue
      const slot = slots.find(s => s.id === a.slotId)
      if (!slot) continue
      byDay[slot.dayOfWeek] ??= {}
      byDay[slot.dayOfWeek][a.employeeId] = (byDay[slot.dayOfWeek][a.employeeId] ?? 0) + 1
    }
    for (const [dow, empMap] of Object.entries(byDay)) {
      for (const [empId, count] of Object.entries(empMap)) {
        if (count > 1) {
          const emp = employees.find(e => e.id === empId)
          warns.push(`${emp?.name ?? empId} משובץ ${count}× ביום ${DAY_NAMES[Number(dow)]}`)
        }
      }
    }

    // 3+ consecutive days for one worker
    for (const emp of activeEmployees) {
      const assignedDays = [...new Set(
        weekAssignments
          .filter(a => a.employeeId === emp.id)
          .map(a => slots.find(s => s.id === a.slotId)?.dayOfWeek)
          .filter((d): d is number => d !== undefined),
      )].sort((a, b) => a - b)

      let streak = 1
      for (let i = 1; i < assignedDays.length; i++) {
        if (assignedDays[i] === assignedDays[i - 1] + 1) {
          streak++
          if (streak >= 3) {
            warns.push(`${emp.name} משובץ ${streak} ימים רצופים`)
            break
          }
        } else {
          streak = 1
        }
      }
    }

    return warns
  }, [weekAssignments, slots, employees, activeEmployees])

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notesItems = useMemo(
    () => weekSubmissions.filter(s => s.notes.trim()),
    [weekSubmissions],
  )

  // ── Submission status ─────────────────────────────────────────────────────
  const submissionStatus = useMemo(() => {
    return activeEmployees.map(emp => {
      const sub = weekSubmissions.find(s => s.employeeId === emp.id)
      return {
        emp,
        status: sub ? (sub.isVacation ? 'vacation' : 'submitted') : 'missing',
      } as const
    })
  }, [activeEmployees, weekSubmissions])

  // ── Publish ───────────────────────────────────────────────────────────────
  async function handlePublish() {
    setPublishing(true)
    const assignmentDisplay = weekAssignments.map(a => ({
      slotId:        a.slotId,
      employeeName:  employees.find(e => e.id === a.employeeId)?.name.split(' ')[0] ?? null,
      internshipNote: a.internshipNote,
    }))
    const msg = buildArrangementMessage(weekTitle, slots, assignmentDisplay)
    try {
      await navigator.clipboard.writeText(msg)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {/* ignore */ }

    upsertWeek({ weekStart, title: weekTitle, isPublished: true, publishedAt: new Date().toISOString() })
    setPublishing(false)
  }

  // ── Assign modal state ────────────────────────────────────────────────────
  const assigningAssignment = assigningSlot
    ? weekAssignments.find(a => a.slotId === assigningSlot.id)
    : null

  return (
    <div className={styles.page}>
      <PageHeader title={weekTitle} />
      <SchedulingSubNav />

      {/* Submission status chips */}
      <section className={styles.statusSection}>
        <div className={styles.statusRow}>
          {submissionStatus.map(({ emp, status }) => (
            <span
              key={emp.id}
              className={[
                styles.statusChip,
                styles[`status_${status}`],
              ].join(' ')}
              title={emp.name}
            >
              {emp.name.split(' ')[0]}
              {status === 'submitted' && <span className={styles.chipIcon}> ✓</span>}
              {status === 'vacation'  && <span className={styles.chipIcon}> 🏖</span>}
              {status === 'missing'   && <span className={styles.chipIcon}> ✗</span>}
            </span>
          ))}
        </div>
      </section>

      {/* Notes */}
      {notesItems.length > 0 && (
        <section className={styles.notesSection}>
          <button className={styles.notesToggle} onClick={() => setNotesOpen(o => !o)}>
            <span>הערות עובדים ({notesItems.length})</span>
            <span className={styles.chevron}>{notesOpen ? '▲' : '▼'}</span>
          </button>
          {notesOpen && (
            <div className={styles.notesList}>
              {notesItems.map(s => {
                const emp = employees.find(e => e.id === s.employeeId)
                return (
                  <div key={s.id} className={styles.noteItem}>
                    <span className={styles.noteName}>{emp?.name.split(' ')[0] ?? '?'}</span>
                    <span className={styles.noteText}>{s.notes}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Counters */}
      <section className={styles.countersSection}>
        <div className={styles.countersRow}>
          {activeEmployees
            .filter(emp => (counters[emp.id] ?? 0) > 0)
            .sort((a, b) => (counters[b.id] ?? 0) - (counters[a.id] ?? 0))
            .map(emp => (
              <span key={emp.id} className={styles.counterChip}>
                {emp.name.split(' ')[0]}
                <span className={styles.counterBadge}>{counters[emp.id]}</span>
              </span>
            ))}
        </div>
      </section>

      {/* Warnings */}
      {warnings.length > 0 && (
        <section className={styles.warnings}>
          {warnings.map((w, i) => (
            <div key={i} className={styles.warning}>⚠ {w}</div>
          ))}
        </section>
      )}

      {/* Day cards */}
      <div className={styles.days}>
        {[0, 1, 2, 3, 4, 5, 6].map(dow => (
          <DayCard
            key={dow}
            dow={dow}
            slots={slots}
            weekStart={weekStart}
            onAssign={setAssigningSlot}
          />
        ))}
      </div>

      {/* Publish button */}
      <div className={styles.publishBar}>
        {isPublished && (
          <span className={styles.publishedBadge}>פורסם ✓</span>
        )}
        <button
          className={[styles.publishBtn, copied ? styles.publishCopied : ''].join(' ')}
          onClick={handlePublish}
          disabled={publishing}
        >
          {copied ? 'הועתק ✓' : isPublished ? 'פרסם מחדש + העתק' : 'פרסם + העתק'}
        </button>
      </div>

      {/* Assign modal */}
      {assigningSlot && (
        <AssignWorkerModal
          slot={assigningSlot}
          weekStart={weekStart}
          currentEmployeeId={assigningAssignment?.employeeId ?? null}
          currentNote={assigningAssignment?.internshipNote ?? null}
          onClose={() => setAssigningSlot(null)}
        />
      )}
    </div>
  )
}
