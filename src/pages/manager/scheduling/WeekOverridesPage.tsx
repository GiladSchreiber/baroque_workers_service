import { useMemo, useState } from 'react'
import { useSchedulingStore } from '../../../store/schedulingStore'
import { PageHeader } from '../../../components/layout/PageHeader'
import { DAY_NAMES, SHIFT_GROUP_LABELS } from '../../../types/scheduling'
import type { ShiftGroup } from '../../../types/scheduling'
import {
  getEffectiveSlotsForWeek, getCurrentWeekStart, getNextWeekStart, getWeekTitle,
} from '../../../lib/schedulingUtils'
import { SchedulingSubNav } from './SchedulingSubNav'
import styles from './WeekOverridesPage.module.scss'

const WEEK_OPTIONS = [
  { value: getCurrentWeekStart(), label: `שבוע נוכחי — ${getWeekTitle(getCurrentWeekStart())}` },
  { value: getNextWeekStart(),    label: `שבוע הבא — ${getWeekTitle(getNextWeekStart())}` },
]

const GROUP_OPTIONS: { value: ShiftGroup; label: string }[] = [
  { value: 'main',    label: SHIFT_GROUP_LABELS.main },
  { value: 'kitchen', label: SHIFT_GROUP_LABELS.kitchen },
  { value: 'support', label: SHIFT_GROUP_LABELS.support },
  { value: 'duty',    label: SHIFT_GROUP_LABELS.duty },
]

function AddCustomSlotForm({ weekStart, dayOfWeek, onClose }: { weekStart: string; dayOfWeek: number; onClose: () => void }) {
  const addOverride = useSchedulingStore(s => s.addOverride)
  const [label,     setLabel]     = useState('')
  const [group,     setGroup]     = useState<ShiftGroup>('main')
  const [startTime, setStartTime] = useState('07:30')
  const [endTime,   setEndTime]   = useState('14:00')

  function handleAdd() {
    if (!label.trim()) return
    addOverride({
      weekStart,
      templateId: null,
      action: 'add',
      dayOfWeek,
      label: label.trim(),
      group,
      startTime,
      endTime,
      sortOrder: 99,
    })
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
        <input className={styles.addTime} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>
      <div className={styles.addActions}>
        <button className={styles.saveBtn} onClick={handleAdd}>הוסף</button>
        <button className={styles.cancelBtn} onClick={onClose}>ביטול</button>
      </div>
    </div>
  )
}

export function WeekOverridesPage() {
  const templates     = useSchedulingStore(s => s.templates)
  const overrides     = useSchedulingStore(s => s.overrides)
  const addOverride   = useSchedulingStore(s => s.addOverride)
  const removeOverride = useSchedulingStore(s => s.removeOverride)

  const [weekStart, setWeekStart] = useState(getNextWeekStart())
  const [addingDay, setAddingDay] = useState<number | null>(null)

  const weekOverrides = useMemo(
    () => overrides.filter(o => o.weekStart === weekStart),
    [overrides, weekStart],
  )

  const removedIds = useMemo(
    () => new Set(weekOverrides.filter(o => o.action === 'remove' && o.templateId).map(o => o.templateId!)),
    [weekOverrides],
  )

  const effectiveSlots = useMemo(
    () => getEffectiveSlotsForWeek(weekStart, templates, overrides),
    [weekStart, templates, overrides],
  )

  function toggleTemplateSlot(templateId: string) {
    const existing = weekOverrides.find(o => o.action === 'remove' && o.templateId === templateId)
    if (existing) {
      removeOverride(existing.id)   // restore
    } else {
      addOverride({ weekStart, templateId, action: 'remove' })
    }
  }

  function removeCustomSlot(overrideId: string) {
    removeOverride(overrideId)
  }

  return (
    <div className={styles.page}>
      <PageHeader title="סידור" />
      <SchedulingSubNav />

      <div className={styles.weekSelector}>
        <select
          className={styles.weekSelect}
          value={weekStart}
          onChange={e => setWeekStart(e.target.value)}
        >
          {WEEK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <p className={styles.hint}>
        לחץ על משמרת להסרתה השבוע. שינויים אלו לא ישפיעו על השבלונה הקבועה.
      </p>

      <div className={styles.content}>
        {[0, 1, 2, 3, 4, 5, 6].map(dow => {
          const dayTemplates = templates.filter(t => t.isActive && t.dayOfWeek === dow).sort((a, b) => a.sortOrder - b.sortOrder)
          const customSlots  = weekOverrides.filter(o => o.action === 'add' && o.templateId === null && o.dayOfWeek === dow)
          if (dayTemplates.length === 0 && customSlots.length === 0) return null

          return (
            <div key={dow} className={styles.daySection}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{DAY_NAMES[dow]}</span>
                <button
                  className={styles.addSlotBtn}
                  onClick={() => setAddingDay(addingDay === dow ? null : dow)}
                  aria-label="הוסף משמרת חד-פעמית"
                >
                  <PlusIcon />
                </button>
              </div>

              <div className={styles.slotList}>
                {/* Template slots — removable */}
                {dayTemplates.map(t => {
                  const isRemoved = removedIds.has(t.id)
                  return (
                    <div
                      key={t.id}
                      className={`${styles.slotRow} ${isRemoved ? styles.slotRemoved : ''}`}
                      onClick={() => toggleTemplateSlot(t.id)}
                    >
                      <div className={styles.slotInfo}>
                        <span className={styles.slotLabel}>{t.label}</span>
                        <span className={styles.slotTime}>{t.startTime}–{t.endTime}</span>
                      </div>
                      <div className={styles.slotRight}>
                        <span className={`${styles.groupBadge} ${styles[`group-${t.group}`]}`}>
                          {SHIFT_GROUP_LABELS[t.group]}
                        </span>
                        <span className={styles.removeHint}>{isRemoved ? 'הוסף' : 'הסר'}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Custom one-off additions */}
                {customSlots.map(ov => (
                  <div key={ov.id} className={`${styles.slotRow} ${styles.slotCustom}`}>
                    <div className={styles.slotInfo}>
                      <span className={styles.slotLabel}>{ov.label}</span>
                      <span className={styles.slotTime}>{ov.startTime}–{ov.endTime}</span>
                    </div>
                    <div className={styles.slotRight}>
                      <span className={`${styles.groupBadge} ${styles[`group-${ov.group}`]}`}>
                        {SHIFT_GROUP_LABELS[ov.group as ShiftGroup]}
                      </span>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => removeCustomSlot(ov.id)}
                        aria-label="מחק"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Inline add form */}
                {addingDay === dow && (
                  <AddCustomSlotForm weekStart={weekStart} dayOfWeek={dow} onClose={() => setAddingDay(null)} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <span className={styles.summaryText}>
          {effectiveSlots.length} משמרות פתוחות השבוע
          {removedIds.size > 0 && ` · ${removedIds.size} הוסרו`}
          {weekOverrides.filter(o => o.action === 'add').length > 0 &&
            ` · ${weekOverrides.filter(o => o.action === 'add').length} נוספו`}
        </span>
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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
