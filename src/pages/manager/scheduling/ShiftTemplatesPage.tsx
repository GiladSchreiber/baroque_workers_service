import { useState } from 'react'
import { useSchedulingStore } from '../../../store/schedulingStore'
import { PageHeader } from '../../../components/layout/PageHeader'
import { DAY_NAMES, SHIFT_GROUP_LABELS } from '../../../types/scheduling'
import type { SlotTemplate, ShiftGroup } from '../../../types/scheduling'
import styles from './ShiftTemplatesPage.module.scss'

const GROUP_OPTIONS: { value: ShiftGroup; label: string }[] = [
  { value: 'main',    label: SHIFT_GROUP_LABELS.main },
  { value: 'kitchen', label: SHIFT_GROUP_LABELS.kitchen },
  { value: 'support', label: SHIFT_GROUP_LABELS.support },
  { value: 'duty',    label: SHIFT_GROUP_LABELS.duty },
]

// ── Add-slot form (inline, collapsed by default) ──────────────────────────
function AddSlotForm({ dayOfWeek, onClose }: { dayOfWeek: number; onClose: () => void }) {
  const addTemplate = useSchedulingStore(s => s.addTemplate)
  const templates   = useSchedulingStore(s => s.templates)
  const [label, setLabel]       = useState('')
  const [group, setGroup]       = useState<ShiftGroup>('main')
  const [startTime, setStart]   = useState('07:30')
  const [endTime, setEnd]       = useState('14:00')

  function handleAdd() {
    if (!label.trim()) return
    const existing = templates.filter(t => t.dayOfWeek === dayOfWeek)
    const maxOrder = existing.length ? Math.max(...existing.map(t => t.sortOrder)) : 0
    addTemplate({ dayOfWeek, label: label.trim(), group, startTime, endTime, sortOrder: maxOrder + 1, isActive: true })
    onClose()
  }

  return (
    <div className={styles.addForm}>
      <input
        className={styles.addInput}
        placeholder="שם המשמרת"
        value={label}
        onChange={e => setLabel(e.target.value)}
        autoFocus
      />
      <div className={styles.addRow}>
        <select className={styles.addSelect} value={group} onChange={e => setGroup(e.target.value as ShiftGroup)}>
          {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input className={styles.addTime} type="time" value={startTime} onChange={e => setStart(e.target.value)} />
        <span className={styles.timeSep}>–</span>
        <input className={styles.addTime} type="time" value={endTime}   onChange={e => setEnd(e.target.value)} />
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
  const updateTemplate = useSchedulingStore(s => s.updateTemplate)
  const [editing, setEditing] = useState(false)
  const [label, setLabel]     = useState(slot.label)
  const [group, setGroup]     = useState<ShiftGroup>(slot.group)
  const [start, setStart]     = useState(slot.startTime)
  const [end, setEnd]         = useState(slot.endTime)

  function save() {
    updateTemplate(slot.id, { label, group, startTime: start, endTime: end })
    setEditing(false)
  }

  function cancel() {
    setLabel(slot.label); setGroup(slot.group)
    setStart(slot.startTime); setEnd(slot.endTime)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={styles.addForm}>
        <input className={styles.addInput} value={label} onChange={e => setLabel(e.target.value)} autoFocus />
        <div className={styles.addRow}>
          <select className={styles.addSelect} value={group} onChange={e => setGroup(e.target.value as ShiftGroup)}>
            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className={styles.addTime} type="time" value={start} onChange={e => setStart(e.target.value)} />
          <span className={styles.timeSep}>–</span>
          <input className={styles.addTime} type="time" value={end}   onChange={e => setEnd(e.target.value)} />
        </div>
        <div className={styles.addActions}>
          <button className={styles.saveBtn} onClick={save}>שמור</button>
          <button className={styles.cancelBtn} onClick={cancel}>ביטול</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.slotRow} ${!slot.isActive ? styles.slotInactive : ''}`}>
      <label className={styles.slotToggle}>
        <input
          type="checkbox"
          checked={slot.isActive}
          onChange={() => toggleTemplate(slot.id)}
          className={styles.checkbox}
        />
        <span className={styles.slotLabel}>{slot.label}</span>
      </label>
      <div className={styles.slotMeta}>
        <span className={`${styles.groupBadge} ${styles[`group-${slot.group}`]}`}>
          {SHIFT_GROUP_LABELS[slot.group]}
        </span>
        <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
        <button className={styles.editSlotBtn} onClick={() => setEditing(true)} aria-label="ערוך">
          <EditIcon />
        </button>
      </div>
    </div>
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

// ── Page ─────────────────────────────────────────────────────────────────
export function ShiftTemplatesPage() {
  const templates = useSchedulingStore(s => s.templates)
  const [showInactive, setShowInactive] = useState(true)

  const displayed = showInactive ? templates : templates.filter(t => t.isActive)

  return (
    <div className={styles.page}>
      <PageHeader title="הגדרת משמרות" />

      <div className={styles.toolbar}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className={styles.checkbox}
          />
          הצג משמרות מושבתות
        </label>
      </div>

      <div className={styles.content}>
        {[0, 1, 2, 3, 4, 5, 6].map(dow => {
          const daySlots = displayed.filter(t => t.dayOfWeek === dow)
          return <DaySection key={dow} dayOfWeek={dow} slots={daySlots} />
        })}
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

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
