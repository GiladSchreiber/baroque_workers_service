import { useState, useEffect } from 'react'
import { useSchedulingStore } from '../../../store/schedulingStore'
import { PageHeader } from '../../../components/layout/PageHeader'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { DAY_NAMES, SHIFT_GROUP_LABELS } from '../../../types/scheduling'
import type { SlotTemplate, ShiftGroup } from '../../../types/scheduling'
import { SchedulingSubNav } from './ArrangementPage'
import styles from './ShiftTemplatesPage.module.scss'

const GROUP_OPTIONS: { value: ShiftGroup; label: string }[] = [
  { value: 'main',    label: SHIFT_GROUP_LABELS.main },
  { value: 'kitchen', label: SHIFT_GROUP_LABELS.kitchen },
  { value: 'support', label: SHIFT_GROUP_LABELS.support },
  { value: 'duty',    label: SHIFT_GROUP_LABELS.duty },
]

// ── Inline add-slot form ──────────────────────────────────────────────────
function AddSlotForm({ dayOfWeek, onClose }: { dayOfWeek: number; onClose: () => void }) {
  const addTemplate = useSchedulingStore(s => s.addTemplate)
  const templates   = useSchedulingStore(s => s.templates)
  const [label,     setLabel]     = useState('')
  const [group,     setGroup]     = useState<ShiftGroup>('main')
  const [startTime, setStartTime] = useState('07:30')
  const [endTime,   setEndTime]   = useState('14:00')

  function handleAdd() {
    if (!label.trim()) return
    const maxOrder = Math.max(0, ...templates.filter(t => t.dayOfWeek === dayOfWeek).map(t => t.sortOrder))
    addTemplate({ dayOfWeek, label: label.trim(), group, startTime, endTime, sortOrder: maxOrder + 1, isActive: true })
    onClose()
  }

  return (
    <div className={styles.addForm}>
      <input className={styles.addInput} placeholder="שם המשמרת" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
      <div className={styles.addRow}>
        <select className={styles.addSelect} value={group} onChange={e => setGroup(e.target.value as ShiftGroup)}>
          {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input className={styles.addTime} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <span className={styles.timeSep}>–</span>
        <input className={styles.addTime} type="time" value={endTime}   onChange={e => setEndTime(e.target.value)} />
      </div>
      <div className={styles.addActions}>
        <button className={styles.saveBtn} onClick={handleAdd}>הוסף</button>
        <button className={styles.cancelBtn} onClick={onClose}>ביטול</button>
      </div>
    </div>
  )
}

// ── Single slot row ───────────────────────────────────────────────────────
function SlotRow({ slot }: { slot: SlotTemplate }) {
  const toggleTemplate = useSchedulingStore(s => s.toggleTemplate)
  const deleteTemplate = useSchedulingStore(s => s.deleteTemplate)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div
        className={`${styles.slotRow} ${!slot.isActive ? styles.slotDisabled : ''}`}
        onClick={() => toggleTemplate(slot.id)}
      >
        <div className={styles.slotInfo}>
          <span className={styles.slotLabel}>{slot.label}</span>
          <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
        </div>
        <div className={styles.slotRight}>
          <span className={`${styles.groupBadge} ${styles[`group-${slot.group}`]}`}>
            {SHIFT_GROUP_LABELS[slot.group]}
          </span>
          {!slot.isActive && (
            <button
              className={styles.deleteBtn}
              onClick={e => { e.stopPropagation(); setConfirmOpen(true) }}
              aria-label="מחק לתמיד"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="למחוק לתמיד?"
        message={`"${slot.label}" תוסר לצמיתות מהרשימה.`}
        confirmLabel="מחק"
        onConfirm={() => { deleteTemplate(slot.id); setConfirmOpen(false) }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

// ── Day section ───────────────────────────────────────────────────────────
function DaySection({ dayOfWeek, slots }: { dayOfWeek: number; slots: SlotTemplate[] }) {
  const [addOpen, setAddOpen] = useState(false)
  const sorted = [...slots].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className={styles.daySection}>
      <div className={styles.dayHeader}>
        <span className={styles.dayName}>{DAY_NAMES[dayOfWeek]}</span>
        <button className={styles.addSlotBtn} onClick={() => setAddOpen(v => !v)} aria-label="הוסף משמרת">
          <PlusIcon />
        </button>
      </div>
      <div className={styles.slotList}>
        {sorted.map(s => <SlotRow key={s.id} slot={s} />)}
        {addOpen && <AddSlotForm dayOfWeek={dayOfWeek} onClose={() => setAddOpen(false)} />}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export function ShiftTemplatesPage() {
  const templates = useSchedulingStore(s => s.templates)
  const fetchTemplates = useSchedulingStore(s => s.fetchTemplates)
  const loadingTemplates = useSchedulingStore(s => s.loadingTemplates)

  useEffect(() => { fetchTemplates() }, [])

  return (
    <div className={styles.page}>
      <PageHeader title="הגדרת משמרות" />
      <SchedulingSubNav active="templates" />
      <div className={styles.content}>
        {loadingTemplates && <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>טוען...</div>}
        {[0, 1, 2, 3, 4, 5, 6].map(dow => (
          <DaySection key={dow} dayOfWeek={dow} slots={templates.filter(t => t.dayOfWeek === dow)} />
        ))}
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}
