import { useState, useEffect, useRef } from 'react'
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

// ── Inline edit-slot form ─────────────────────────────────────────────────
function EditSlotForm({ slot, onClose }: { slot: SlotTemplate; onClose: () => void }) {
  const updateTemplate = useSchedulingStore(s => s.updateTemplate)
  const deleteTemplate = useSchedulingStore(s => s.deleteTemplate)
  const [label,     setLabel]     = useState(slot.label)
  const [group,     setGroup]     = useState<ShiftGroup>(slot.group)
  const [startTime, setStartTime] = useState(slot.startTime)
  const [endTime,   setEndTime]   = useState(slot.endTime)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave() {
    if (!label.trim()) return
    updateTemplate(slot.id, { label: label.trim(), group, startTime, endTime })
    onClose()
  }

  return (
    <>
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
          <button className={styles.saveBtn} onClick={handleSave}>שמור</button>
          <button className={styles.cancelBtn} onClick={onClose}>ביטול</button>
          <button className={styles.deleteForeverBtn} onClick={() => setConfirmDelete(true)}>מחק</button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDelete}
        title="למחוק לתמיד?"
        message={`"${slot.label}" תוסר לצמיתות מהרשימה.`}
        confirmLabel="מחק"
        onConfirm={() => { deleteTemplate(slot.id); setConfirmDelete(false); onClose() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ── Single slot row ───────────────────────────────────────────────────────
interface SlotRowProps {
  slot: SlotTemplate
  isDragging: boolean
  isOver: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}

function SlotRow({ slot, isDragging, isOver, onDragStart, onDragEnter, onDragEnd }: SlotRowProps) {
  const toggleTemplate = useSchedulingStore(s => s.toggleTemplate)
  const [editing, setEditing] = useState(false)

  const rowClass = [
    styles.slotRow,
    !slot.isActive ? styles.slotDisabled : '',
    isDragging ? styles.slotDragging : '',
    isOver ? styles.slotOver : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <div
        className={rowClass}
        draggable
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
        onDragEnter={e => { e.preventDefault(); onDragEnter() }}
        onDragOver={e => e.preventDefault()}
        onDragEnd={onDragEnd}
        onClick={() => setEditing(true)}
      >
        <div className={styles.dragHandle} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <DragIcon />
        </div>
        <div className={styles.slotInfo}>
          <span className={styles.slotLabel}>{slot.label}</span>
          <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
        </div>
        <div className={styles.slotRight}>
          <span className={`${styles.groupBadge} ${styles[`group-${slot.group}`]}`}>
            {SHIFT_GROUP_LABELS[slot.group]}
          </span>
          <button
            className={styles.deleteBtn}
            onClick={e => { e.stopPropagation(); toggleTemplate(slot.id) }}
            aria-label={slot.isActive ? 'הסר זמנית' : 'שחזר'}
            title={slot.isActive ? 'הסר זמנית' : 'שחזר'}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {editing && <EditSlotForm slot={slot} onClose={() => setEditing(false)} />}
    </>
  )
}

// ── Day section ───────────────────────────────────────────────────────────
function DaySection({ dayOfWeek, slots }: { dayOfWeek: number; slots: SlotTemplate[] }) {
  const updateTemplate = useSchedulingStore(s => s.updateTemplate)
  const [addOpen, setAddOpen]     = useState(false)
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    [...slots].sort((a, b) => a.sortOrder - b.sortOrder).map(s => s.id),
  )
  const draggedId = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId]         = useState<string | null>(null)

  // Sync when slots change (add / delete)
  useEffect(() => {
    setOrderedIds(prev => {
      const slotIds = new Set(slots.map(s => s.id))
      const filtered = prev.filter(id => slotIds.has(id))
      const added    = slots.filter(s => !filtered.includes(s.id)).map(s => s.id)
      return [...filtered, ...added]
    })
  }, [slots])

  const orderedSlots = orderedIds
    .map(id => slots.find(s => s.id === id))
    .filter((s): s is SlotTemplate => Boolean(s))

  function handleDragStart(id: string) {
    draggedId.current = id
    setDraggingId(id)
  }

  function handleDragEnter(targetId: string) {
    if (!draggedId.current || draggedId.current === targetId) return
    setOverId(targetId)
    setOrderedIds(prev => {
      const from = prev.indexOf(draggedId.current!)
      const to   = prev.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, draggedId.current!)
      return next
    })
  }

  function handleDragEnd() {
    draggedId.current = null
    setDraggingId(null)
    setOverId(null)
    // Persist new sort orders
    orderedIds.forEach((id, idx) => updateTemplate(id, { sortOrder: idx + 1 }))
  }

  function sortByTime() {
    const byTime = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const newIds = byTime.map(s => s.id)
    setOrderedIds(newIds)
    newIds.forEach((id, idx) => updateTemplate(id, { sortOrder: idx + 1 }))
  }

  return (
    <div className={styles.daySection}>
      <div className={styles.dayHeader}>
        <span className={styles.dayName}>{DAY_NAMES[dayOfWeek]}</span>
        <div className={styles.dayHeaderActions}>
          <button className={styles.sortBtn} onClick={sortByTime} title="מיין לפי שעת התחלה" aria-label="מיין לפי שעה">
            <SortIcon />
          </button>
          <button className={styles.addSlotBtn} onClick={() => setAddOpen(v => !v)} aria-label="הוסף משמרת">
            <PlusIcon />
          </button>
        </div>
      </div>
      <div className={styles.slotList}>
        {orderedSlots.map(s => (
          <SlotRow
            key={s.id}
            slot={s}
            isDragging={draggingId === s.id}
            isOver={overId === s.id}
            onDragStart={() => handleDragStart(s.id)}
            onDragEnter={() => handleDragEnter(s.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
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

function DragIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4.5" cy="3.5" r="1.2" fill="currentColor"/>
      <circle cx="9.5" cy="3.5" r="1.2" fill="currentColor"/>
      <circle cx="4.5" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="9.5" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="4.5" cy="10.5" r="1.2" fill="currentColor"/>
      <circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/>
    </svg>
  )
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}
