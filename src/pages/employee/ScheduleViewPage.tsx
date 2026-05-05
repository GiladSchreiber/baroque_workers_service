import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSchedulingStore } from '../../store/schedulingStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { DAY_NAMES } from '../../types/scheduling'
import {
  getCurrentWeekStart,
  getNextWeekStart,
  getWeekTitle,
  getEffectiveSlotsForWeek,
} from '../../lib/schedulingUtils'
import styles from './ScheduleViewPage.module.scss'

// ── Sub-nav shared with AvailabilityPage ──────────────────────────────────────
export function SchedulingSubNav({ active }: { active: 'view' | 'submit' }) {
  const navigate = useNavigate()
  return (
    <div className={styles.subNav}>
      <button
        className={[styles.subTab, active === 'view' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate('/employee/scheduling/view')}
      >
        הסידור
      </button>
      <button
        className={[styles.subTab, active === 'submit' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate('/employee/scheduling')}
      >
        הגשת זמינות
      </button>
    </div>
  )
}

export function ScheduleViewPage() {
  const currentUser  = useAuthStore(s => s.currentUser)
  const { templates, overrides, assignments, weeks } = useSchedulingStore()
  const { employees } = useEmployeeStore()

  const [weekKey, setWeekKey] = useState<'current' | 'next'>('next')
  const [myOnly, setMyOnly]   = useState(false)

  const weekStart = weekKey === 'current' ? getCurrentWeekStart() : getNextWeekStart()
  const weekTitle = getWeekTitle(weekStart)

  const weekRecord   = weeks.find(w => w.weekStart === weekStart)
  const isPublished  = weekRecord?.isPublished ?? false

  const slots = useMemo(
    () => getEffectiveSlotsForWeek(weekStart, templates, overrides),
    [weekStart, templates, overrides],
  )

  const weekAssignments = useMemo(
    () => assignments.filter(a => a.weekStart === weekStart),
    [assignments, weekStart],
  )

  const myAssignedSlotIds = useMemo(
    () => new Set(weekAssignments.filter(a => a.employeeId === currentUser?.id).map(a => a.slotId)),
    [weekAssignments, currentUser?.id],
  )

  function empName(empId: string | null) {
    if (!empId) return null
    return employees.find(e => e.id === empId)?.name.split(' ')[0] ?? null
  }

  const [y, m, d] = weekStart.split('-').map(Number)

  return (
    <div className={styles.page}>
      <PageHeader title={weekTitle} />
      <SchedulingSubNav active="view" />

      {/* Week selector */}
      <div className={styles.weekTabs}>
        <button
          className={[styles.weekTab, weekKey === 'next' ? styles.weekTabActive : ''].join(' ')}
          onClick={() => setWeekKey('next')}
        >
          שבוע הבא
        </button>
        <button
          className={[styles.weekTab, weekKey === 'current' ? styles.weekTabActive : ''].join(' ')}
          onClick={() => setWeekKey('current')}
        >
          שבוע נוכחי
        </button>
      </div>

      {!isPublished ? (
        <div className={styles.unpublished}>
          <p className={styles.unpublishedTitle}>הסידור טרם פורסם</p>
          <p className={styles.unpublishedSub}>יפורסם בקרוב על ידי המנהל</p>
        </div>
      ) : (
        <>
          {/* My-only toggle */}
          <div className={styles.filterRow}>
            <button
              className={[styles.filterBtn, myOnly ? styles.filterBtnActive : ''].join(' ')}
              onClick={() => setMyOnly(o => !o)}
            >
              {myOnly ? 'כל המשמרות' : 'המשמרות שלי'}
            </button>
            {myAssignedSlotIds.size > 0 && (
              <span className={styles.myCount}>{myAssignedSlotIds.size} משמרות</span>
            )}
          </div>

          {/* Days */}
          <div className={styles.days}>
            {[0, 1, 2, 3, 4, 5, 6].map(dow => {
              const daySlots = slots.filter(s => s.dayOfWeek === dow)
              const relevantSlots = myOnly
                ? daySlots.filter(s => myAssignedSlotIds.has(s.id))
                : daySlots

              if (relevantSlots.length === 0) return null

              const dayDate = new Date(y, m - 1, d + dow)
              const dateStr = `${String(dayDate.getDate()).padStart(2, '0')}.${String(dayDate.getMonth() + 1).padStart(2, '0')}`

              return (
                <div key={dow} className={styles.dayCard}>
                  <div className={styles.dayHeader}>
                    <span className={styles.dayName}>{DAY_NAMES[dow]}</span>
                    <span className={styles.dayDate}>{dateStr}</span>
                  </div>
                  {relevantSlots.map(slot => {
                    const asgn    = weekAssignments.find(a => a.slotId === slot.id)
                    const name    = empName(asgn?.employeeId ?? null)
                    const isMe    = asgn?.employeeId === currentUser?.id
                    const isEmpty = !asgn?.employeeId

                    return (
                      <div
                        key={slot.id}
                        className={[
                          styles.slotRow,
                          isMe    ? styles.slotMine    : '',
                          isEmpty ? styles.slotEmpty   : '',
                        ].join(' ')}
                      >
                        <span className={styles.slotLabel}>{slot.label}</span>
                        <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
                        <span className={styles.slotAssignee}>
                          {name ? (
                            <>
                              {name}
                              {asgn?.internshipNote && (
                                <span className={styles.internNote}> + {asgn.internshipNote}</span>
                              )}
                            </>
                          ) : (
                            <span className={styles.emptyLabel}>—</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
