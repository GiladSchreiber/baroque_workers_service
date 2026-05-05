import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { useSchedulingStore } from '../../../store/schedulingStore'
import { useEmployeeStore } from '../../../store/employeeStore'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Modal } from '../../../components/ui/Modal'
import {
  getCurrentWeekStart,
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
export function SchedulingSubNav({
  active,
  onWeekChange,
}: {
  active: 'current' | 'next' | 'templates' | 'submit'
  onWeekChange?: (k: 'current' | 'next') => void
}) {
  const navigate  = useNavigate()
  const role      = useAuthStore(s => s.currentUser?.role)
  const base      = role === 'scheduler' ? '/scheduler' : '/manager'
  const isScheduler = role === 'scheduler'

  return (
    <div className={styles.subNav}>
      <button
        className={[styles.subTab, active === 'current' ? styles.subTabActive : ''].join(' ')}
        onClick={() => { navigate(`${base}/scheduling/arrangement`); onWeekChange?.('current') }}
      >
        שבוע נוכחי
      </button>
      <button
        className={[styles.subTab, active === 'next' ? styles.subTabActive : ''].join(' ')}
        onClick={() => { navigate(`${base}/scheduling/arrangement`); onWeekChange?.('next') }}
      >
        שבוע הבא
      </button>
      <button
        className={[styles.subTab, active === 'templates' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate(`${base}/scheduling/templates`)}
      >
        הגדרת משמרות
      </button>
      {isScheduler && (
        <button
          className={[styles.subTab, active === 'submit' ? styles.subTabActive : ''].join(' ')}
          onClick={() => navigate(`${base}/scheduling/submit`)}
        >
          הגשת סידור
        </button>
      )}
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
  const { submissions, assignments, upsertAssignment } = useSchedulingStore()

  const [note, setNote]         = useState(currentNote ?? '')
  const [restOpen, setRestOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(!!currentNote)

  const weekAssignments = useMemo(
    () => assignments.filter(a => a.weekStart === weekStart),
    [assignments, weekStart],
  )

  const activeEmployees = useMemo(
    () => employees.filter(e => e.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [employees],
  )

  const submittedIds = useMemo(
    () => new Set(submissions.filter(s => s.weekStart === weekStart && s.selectedSlotIds.includes(slot.id)).map(s => s.employeeId)),
    [submissions, weekStart, slot.id],
  )

  const rest = useMemo(
    () => activeEmployees.filter(e => !submittedIds.has(e.id)),
    [activeEmployees, submittedIds],
  )

  function handleSelectFromRest(empId: string) {
    upsertAssignment({
      id: `asgn-${weekStart}-${slot.id}`,
      weekStart,
      slotId: slot.id,
      employeeId: empId,
      internshipNote: note.trim() || null,
    })
    onClose()
  }

  function saveNote(n: string | null) {
    if (!currentEmployeeId) return
    upsertAssignment({
      id: `asgn-${weekStart}-${slot.id}`,
      weekStart,
      slotId: slot.id,
      employeeId: currentEmployeeId,
      internshipNote: n,
    })
    onClose()
  }

  return (
    <Modal isOpen title={slot.label} onClose={onClose} subtitle={`${slot.startTime}–${slot.endTime}`}>
      <div className={styles.assignModal}>

        <div className={styles.togglesRow}>
          {rest.length > 0 && (
            <button className={[styles.toggleBtn, restOpen ? styles.toggleBtnActive : ''].join(' ')} onClick={() => setRestOpen(o => !o)}>
              לא הגישו ({rest.length})
            </button>
          )}
          <button className={[styles.toggleBtn, noteOpen ? styles.toggleBtnActive : ''].join(' ')} onClick={() => setNoteOpen(o => !o)}>
            התלמדות
          </button>
        </div>

        {restOpen && (
          <div className={styles.empList}>
            {rest.map(emp => (
              <button
                key={emp.id}
                className={[styles.empRow, currentEmployeeId === emp.id ? styles.empSelected : ''].join(' ')}
                onClick={() => handleSelectFromRest(emp.id)}
              >
                <span className={styles.empName}>{emp.name}</span>
                <span className={styles.empCount}>{weekAssignments.filter(a => a.employeeId === emp.id).length} משמרות</span>
              </button>
            ))}
          </div>
        )}

        {noteOpen && (
          <div className={styles.noteRow}>
            <input
              className={styles.noteInput}
              type="text"
              placeholder="שם המתלמד/ת"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
            {currentEmployeeId && currentNote && (
              <button className={styles.noteClearBtn} onClick={() => saveNote(null)} aria-label="הסר התלמדות">✕</button>
            )}
            {currentEmployeeId && (
              <button className={styles.noteConfirmBtn} onClick={() => saveNote(note.trim() || null)}>✓</button>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}

// ── Internships modal ─────────────────────────────────────────────────────────
function InternshipsModal({ slots, weekStart, onClose }: {
  slots: WeekSlot[]
  weekStart: string
  onClose: () => void
}) {
  const { assignments, upsertAssignment } = useSchedulingStore()
  const weekAssignments = assignments.filter(a => a.weekStart === weekStart && a.employeeId)

  type Row = { slotId: string; internName: string }
  const [rows, setRows] = useState<Row[]>(() => {
    const existing = weekAssignments
      .filter(a => a.internshipNote)
      .map(a => ({ slotId: a.slotId, internName: a.internshipNote! }))
    return existing.length > 0 ? existing : [{ slotId: '', internName: '' }]
  })

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  }

  function handleSave() {
    // Remove internship notes from all assigned slots first, then apply new ones
    const toSave = rows.filter(r => r.slotId && r.internName.trim())
    for (const a of weekAssignments) {
      const match = toSave.find(r => r.slotId === a.slotId)
      upsertAssignment({ ...a, internshipNote: match ? match.internName.trim() : null })
    }
    onClose()
  }

  const assignedSlots = slots.filter(s => weekAssignments.some(a => a.slotId === s.id))

  return (
    <Modal isOpen title="התלמדויות" onClose={onClose}>
      <div className={styles.internsModal}>
        {rows.map((row, i) => (
          <div key={i} className={styles.internsRow}>
            <select
              className={styles.internsSelect}
              value={row.slotId}
              onChange={e => updateRow(i, { slotId: e.target.value })}
            >
              <option value="">בחר משמרת</option>
              {assignedSlots.map(s => (
                <option key={s.id} value={s.id}>
                  {DAY_NAMES[s.dayOfWeek]} – {s.label}
                </option>
              ))}
            </select>
            <input
              className={styles.internsInput}
              type="text"
              placeholder="שם המתלמד/ת"
              value={row.internName}
              onChange={e => updateRow(i, { internName: e.target.value })}
            />
            <button
              className={styles.internsRemoveBtn}
              onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
            >–</button>
          </div>
        ))}
        <button
          className={styles.internsAddBtn}
          onClick={() => setRows(r => [...r, { slotId: '', internName: '' }])}
        >
          + הוסף
        </button>
        <button className={styles.internsSaveBtn} onClick={handleSave}>שמור</button>
      </div>
    </Modal>
  )
}

// ── Single slot row ───────────────────────────────────────────────────────────
interface SlotRowProps {
  slot: WeekSlot
  weekStart: string
}

function SlotRow({ slot, weekStart }: SlotRowProps) {
  const assignments      = useSchedulingStore(s => s.assignments)
  const submissions      = useSchedulingStore(s => s.submissions)
  const upsertAssignment = useSchedulingStore(s => s.upsertAssignment)
  const removeAssignment = useSchedulingStore(s => s.removeAssignment)
  const { employees }    = useEmployeeStore()

  const assignment = assignments.find(a => a.weekStart === weekStart && a.slotId === slot.id)

  // Workers who submitted this slot — never changes based on assignment state
  const submitters = useMemo(() =>
    submissions
      .filter(s => s.weekStart === weekStart && s.selectedSlotIds.includes(slot.id))
      .map(s => employees.find(e => e.id === s.employeeId))
      .filter((e): e is typeof employees[0] => !!e),
    [submissions, weekStart, slot.id, employees],
  )

  // Track workers manually added via modal even after they're deselected
  const [manualExtras, setManualExtras] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (assignment?.employeeId && !submitters.some(e => e.id === assignment.employeeId)) {
      initial.add(assignment.employeeId)
    }
    return initial
  })

  // When a new non-submitter gets assigned, add them to the persistent extra set
  useEffect(() => {
    if (assignment?.employeeId && !submitters.some(e => e.id === assignment.employeeId)) {
      setManualExtras(prev => {
        if (prev.has(assignment.employeeId!)) return prev
        return new Set([...prev, assignment.employeeId!])
      })
    }
  }, [assignment?.employeeId])

  const allPills = useMemo(() => {
    const extras = [...manualExtras]
      .map(id => employees.find(e => e.id === id))
      .filter((e): e is typeof employees[0] => !!e && !submitters.some(s => s.id === e.id))
    return [...submitters, ...extras]
  }, [submitters, manualExtras, employees])

  const slotState = assignment?.employeeId ? 'assigned'
    : submitters.length > 0               ? 'available'
    :                                        'empty'

  const [expanded, setExpanded] = useState(false)

  function handleToggle(empId: string) {
    if (assignment?.employeeId === empId) {
      removeAssignment(weekStart, slot.id)
    } else {
      upsertAssignment({
        id: `asgn-${weekStart}-${slot.id}`,
        weekStart,
        slotId: slot.id,
        employeeId: empId,
        internshipNote: assignment?.internshipNote ?? null,
      })
      setExpanded(false)
    }
  }

  function handleRowClick() {
    if (allPills.length === 0) setExpanded(e => !e)
  }

  return (
    <div
      className={[styles.slotRow, styles[`slot_${slotState}`], allPills.length === 0 ? styles.slotClickable : ''].join(' ')}
      onClick={handleRowClick}
    >
      <span className={styles.slotLabel}>{slot.label}</span>

      <div className={styles.submitterBtns}>
        {allPills.map(emp => {
          const isSelected = assignment?.employeeId === emp.id
          return (
            <button
              key={emp.id}
              className={[
                styles.submitterBtn,
                isSelected ? styles.submitterSelected : '',
                isSelected && assignment?.internshipNote ? styles.submitterWithIntern : '',
              ].join(' ')}
              onClick={e => { e.stopPropagation(); handleToggle(emp.id) }}
            >
              {emp.name.split(' ')[0]}
              {isSelected && assignment?.internshipNote && (
                <span className={styles.internNote}> ({assignment.internshipNote})</span>
              )}
            </button>
          )
        })}
        {allPills.length === 0 && !expanded && (
          <span className={styles.noSubmitters}>אין מועמדים</span>
        )}
      </div>

      {expanded && (
        <div className={styles.inlinePickerOverlay} onClick={e => e.stopPropagation()}>
          {employees.filter(e => e.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he')).map(emp => (
            <button
              key={emp.id}
              className={styles.inlinePickerBtn}
              onClick={() => handleToggle(emp.id)}
            >
              {emp.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Day card ──────────────────────────────────────────────────────────────────
function DayCard({ dow, slots, weekStart }: {
  dow: number
  slots: WeekSlot[]
  weekStart: string
}) {
  const daySlots = slots.filter(s => s.dayOfWeek === dow)
  if (daySlots.length === 0) return null

  const [collapsed, setCollapsed] = useState(false)

  const [y, m, d] = weekStart.split('-').map(Number)
  const dayDate = new Date(y, m - 1, d + dow)
  const dateStr = `${String(dayDate.getDate()).padStart(2, '0')}.${String(dayDate.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className={[styles.dayCard, collapsed ? styles.dayCardCollapsed : ''].join(' ')}>
      <button className={styles.dayHeader} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.dayName}>{DAY_NAMES[dow]}</span>
        <span className={styles.dayDate}>{dateStr}</span>
        <span className={styles.dayChevron}>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && daySlots.map(slot => (
        <SlotRow key={slot.id} slot={slot} weekStart={weekStart} />
      ))}
    </div>
  )
}

// ── Add Shifts modal ──────────────────────────────────────────────────────────
function AddShiftsModal({ slots, weekStart, onClose }: {
  slots: WeekSlot[]
  weekStart: string
  onClose: () => void
}) {
  const { assignments, upsertAssignment } = useSchedulingStore()
  const { employees } = useEmployeeStore()

  const allActive = useMemo(
    () => employees.filter(e => e.isActive).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [employees],
  )

  type Row = { empId: string; slotId: string }
  const [rows, setRows] = useState<Row[]>([{ empId: '', slotId: '' }])

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  }

  function handleSave() {
    const valid = rows.filter(r => r.empId && r.slotId)
    for (const r of valid) {
      const existing = assignments.find(a => a.weekStart === weekStart && a.slotId === r.slotId)
      upsertAssignment({
        id: `asgn-${weekStart}-${r.slotId}`,
        weekStart,
        slotId: r.slotId,
        employeeId: r.empId,
        internshipNote: existing?.internshipNote ?? null,
      })
    }
    onClose()
  }

  return (
    <Modal isOpen title="הוספת משמרות" onClose={onClose}>
      <div className={styles.internsModal}>
        {rows.map((row, i) => (
          <div key={i} className={styles.internsRow}>
            <select
              className={styles.internsSelect}
              value={row.slotId}
              onChange={e => updateRow(i, { slotId: e.target.value })}
            >
              <option value="">בחר משמרת</option>
              {slots.map(s => (
                <option key={s.id} value={s.id}>
                  {DAY_NAMES[s.dayOfWeek]} – {s.label}
                </option>
              ))}
            </select>
            <select
              className={styles.internsSelect}
              value={row.empId}
              onChange={e => updateRow(i, { empId: e.target.value })}
            >
              <option value="">בחר עובד</option>
              {allActive.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <button
              className={styles.internsRemoveBtn}
              onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
            >–</button>
          </div>
        ))}
        <button
          className={styles.internsAddBtn}
          onClick={() => setRows(r => [...r, { empId: '', slotId: '' }])}
        >
          + הוסף
        </button>
        <button className={styles.internsSaveBtn} onClick={handleSave}>שמור</button>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ArrangementPage() {
  const { templates, overrides, submissions, assignments, weeks, upsertWeek, fetchTemplates, fetchWeekData, loadingWeek } = useSchedulingStore()
  const { employees, fetchAll } = useEmployeeStore()

  const [weekKey, setWeekKey] = useState<'next' | 'current'>('next')
  const weekStart = weekKey === 'next' ? getNextWeekStart() : getCurrentWeekStart()
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

  const [notesOpen, setNotesOpen]           = useState(false)
  const [statusOpen, setStatusOpen]         = useState<'submitted'|'vacation'|'missing'|null>(null)
  const [publishing, setPublishing]         = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [internsOpen, setInternsOpen]       = useState(false)
  const [addShiftsOpen, setAddShiftsOpen]   = useState(false)

  useEffect(() => {
    fetchAll()
    fetchTemplates()
  }, [])

  useEffect(() => {
    fetchWeekData(weekStart)
  }, [weekStart])

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
    return activeEmployees.flatMap(emp => {
      const sub = weekSubmissions.find(s => s.employeeId === emp.id)
      if (!sub && emp.role !== 'employee') return []
      const effectiveStatus = sub
        ? (sub.isVacation ? 'vacation' : 'submitted')
        : 'missing'
      return [{ emp, status: effectiveStatus } as const]
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

    const existingWeek = weeks.find(w => w.weekStart === weekStart)
    upsertWeek({
      id: existingWeek?.id ?? '',
      weekStart,
      title: weekTitle,
      isPublished: true,
      publishedAt: new Date().toISOString(),
    })
    setPublishing(false)
  }


  const isLoadingThisWeek = loadingWeek[weekStart]

  return (
    <div className={styles.page}>
      <PageHeader title={weekTitle} />
      <SchedulingSubNav active={weekKey} onWeekChange={setWeekKey} />
      {isLoadingThisWeek && <div className={styles.loadingBar}>טוען...</div>}

      {/* Submission status – 3 buttons in one row, expands below */}
      <section className={styles.statusSection}>
        <div className={styles.statusBtnRow}>
          {(
            [
              { key: 'submitted' as const, label: 'הגישו',    cls: styles.statusSubmitted },
              { key: 'vacation'  as const, label: 'חופשה',    cls: styles.statusVacation  },
              { key: 'missing'   as const, label: 'לא הגישו', cls: styles.statusMissing   },
            ] as const
          ).map(({ key, label, cls }) => {
            const names = submissionStatus.filter(x => x.status === key).map(x => x.emp.name.split(' ')[0])
            if (names.length === 0) return null
            return (
              <button
                key={key}
                className={[styles.statusBtn, cls, statusOpen === key ? styles.statusBtnActive : ''].join(' ')}
                onClick={() => setStatusOpen(statusOpen === key ? null : key)}
              >
                {label} ({names.length})
              </button>
            )
          })}
        </div>
        {statusOpen && (() => {
          const names = submissionStatus.filter(x => x.status === statusOpen).map(x => x.emp.name.split(' ')[0])
          return <div className={styles.statusExpanded}>{names.join(', ')}</div>
        })()}
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

      {/* Counters – all workers who submitted, 0-count highlighted */}
      <section className={styles.countersSection}>
        <div className={styles.countersRow}>
          {activeEmployees
            .filter(emp => weekSubmissions.some(s => s.employeeId === emp.id && !s.isVacation))
            .sort((a, b) => (counters[a.id] ?? 0) - (counters[b.id] ?? 0))
            .map(emp => {
              const count = counters[emp.id] ?? 0
              return (
                <span
                  key={emp.id}
                  className={[styles.counterChip, count === 0 ? styles.counterChipZero : ''].join(' ')}
                >
                  {emp.name.split(' ')[0]}
                  <span className={styles.counterBadge}>{count}</span>
                </span>
              )
            })}
        </div>
      </section>

      {/* Day cards */}
      <div className={styles.days}>
        {[0, 1, 2, 3, 4, 5, 6].map(dow => (
          <DayCard
            key={dow}
            dow={dow}
            slots={slots}
            weekStart={weekStart}
          />
        ))}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <section className={styles.warnings}>
          {warnings.map((w, i) => (
            <div key={i} className={styles.warning}>⚠ {w}</div>
          ))}
        </section>
      )}

      {/* Publish bar */}
      <div className={styles.publishBar}>
        <div className={styles.publishBarActions}>
          <button className={styles.internsBtn} onClick={() => setInternsOpen(true)}>
            התלמדויות
          </button>
          <button className={styles.internsBtn} onClick={() => setAddShiftsOpen(true)}>
            הוספת משמרות
          </button>
        </div>
        <button
          className={[styles.publishBtn, copied ? styles.publishCopied : ''].join(' ')}
          onClick={handlePublish}
          disabled={publishing}
        >
          {copied ? 'הועתק ✓' : isPublished ? 'עדכן' : 'פרסם'}
        </button>
      </div>

      {/* Internships modal */}
      {internsOpen && (
        <InternshipsModal
          slots={slots}
          weekStart={weekStart}
          onClose={() => setInternsOpen(false)}
        />
      )}

      {/* Add shifts modal */}
      {addShiftsOpen && (
        <AddShiftsModal
          slots={slots}
          weekStart={weekStart}
          onClose={() => setAddShiftsOpen(false)}
        />
      )}
    </div>
  )
}
