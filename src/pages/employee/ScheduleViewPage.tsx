import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { SchedulingSubNav as ManagerSchedulingSubNav } from '../manager/scheduling/ArrangementPage'
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
export function SchedulingSubNav({
  active,
  onWeekChange,
}: {
  active: 'current' | 'next' | 'submit'
  onWeekChange?: (k: 'current' | 'next') => void
}) {
  const navigate = useNavigate()
  const roles    = useAuthStore(s => s.currentUser?.roles)
  const base     = roles?.includes('scheduler') ? '/scheduler' : '/employee'

  return (
    <div className={styles.subNav}>
      <button
        className={[styles.subTab, active === 'current' ? styles.subTabActive : ''].join(' ')}
        onClick={() => { navigate(`${base}/scheduling/view?week=current`); onWeekChange?.('current') }}
      >
        שבוע נוכחי
      </button>
      <button
        className={[styles.subTab, active === 'next' ? styles.subTabActive : ''].join(' ')}
        onClick={() => { navigate(`${base}/scheduling/view?week=next`); onWeekChange?.('next') }}
      >
        שבוע הבא
      </button>
      <button
        className={[styles.subTab, active === 'submit' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate(`${base}/scheduling`)}
      >
        הגשת סידור
      </button>
    </div>
  )
}

export function ScheduleViewPage() {
  const currentUser  = useAuthStore(s => s.currentUser)
  const { templates, overrides, assignments, weeks, fetchTemplates, fetchWeekData } = useSchedulingStore()
  const { employees } = useEmployeeStore()

  const [searchParams] = useSearchParams()
  const [weekKey, setWeekKey] = useState<'current' | 'next'>(
    searchParams.get('week') === 'current' ? 'current' : 'next',
  )
  const [myOnly, setMyOnly]   = useState(true)

  const weekStart = weekKey === 'current' ? getCurrentWeekStart() : getNextWeekStart()

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    fetchWeekData(weekStart)
  }, [weekStart])
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

  const today = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0); return t
  }, [])

  function dayDate(dow: number) {
    return new Date(y, m - 1, d + dow)
  }

  function isPastDay(dow: number) {
    return weekKey === 'current' && dayDate(dow) < today
  }

  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(() => {
    if (weekKey !== 'current') return new Set()
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return new Set([0,1,2,3,4,5,6].filter(dow => new Date(y, m - 1, d + dow) < t))
  })

  useEffect(() => {
    if (weekKey !== 'current') {
      setCollapsedDays(new Set())
    } else {
      const [cy, cm, cd] = weekStart.split('-').map(Number)
      const t = new Date(); t.setHours(0, 0, 0, 0)
      setCollapsedDays(new Set([0,1,2,3,4,5,6].filter(dow => new Date(cy, cm - 1, cd + dow) < t)))
    }
  }, [weekKey])

  function toggleDay(dow: number) {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      next.has(dow) ? next.delete(dow) : next.add(dow)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <PageHeader title={weekTitle} />
      {currentUser?.roles.includes('scheduler')
        ? <ManagerSchedulingSubNav active={weekKey} onWeekChange={setWeekKey} />
        : <SchedulingSubNav active={weekKey} onWeekChange={setWeekKey} />
      }

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

          {myOnly ? (
            /* ── Flat "my shifts" table ─────────────────────────────── */
            <div className={styles.myTable}>
              {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                const slot = slots.find(s => s.dayOfWeek === dow && myAssignedSlotIds.has(s.id))
                if (!slot) return null
                const asgn    = weekAssignments.find(a => a.slotId === slot.id)
                const dayDate = new Date(y, m - 1, d + dow)
                const dateStr = `${String(dayDate.getDate()).padStart(2, '0')}.${String(dayDate.getMonth() + 1).padStart(2, '0')}`
                return (
                  <div key={dow} className={[styles.myRow, isPastDay(dow) ? styles.myRowPast : ''].join(' ')}>
                    <span className={styles.myDayName}>{DAY_NAMES[dow]}</span>
                    <span className={styles.myDayDate}>{dateStr}</span>
                    <span className={styles.myShiftName}>{slot.label}</span>
                    <span className={styles.myHours}>{slot.startTime}–{slot.endTime}</span>
                    {asgn?.internshipNote && (
                      <span className={styles.myIntern}>{asgn.internshipNote}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Day-grouped "all shifts" view ──────────────────────── */
            <div className={styles.days}>
              {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                const daySlots = slots.filter(s => s.dayOfWeek === dow)
                if (daySlots.length === 0) return null

                const dd      = dayDate(dow)
                const dateStr = `${String(dd.getDate()).padStart(2, '0')}.${String(dd.getMonth() + 1).padStart(2, '0')}`
                const collapsed = collapsedDays.has(dow)
                const past      = isPastDay(dow)

                return (
                  <div key={dow} className={[styles.dayCard, past ? styles.dayCardPast : ''].join(' ')}>
                    <div className={styles.dayHeader} onClick={() => toggleDay(dow)}>
                      <span className={styles.dayName}>{DAY_NAMES[dow]}</span>
                      <span className={styles.dayDate}>{dateStr}</span>
                      <span className={styles.chevron}>{collapsed ? '▼' : '▲'}</span>
                    </div>
                    {!collapsed && daySlots.map(slot => {
                      const asgn  = weekAssignments.find(a => a.slotId === slot.id)
                      const name  = empName(asgn?.employeeId ?? null)
                      const isMe  = asgn?.employeeId === currentUser?.id
                      const isEmpty = !asgn?.employeeId

                      if (isEmpty && slot.group === 'duty') return null

                      return (
                        <div
                          key={slot.id}
                          className={[
                            styles.slotRow,
                            isMe    ? styles.slotMine  : '',
                            isEmpty ? styles.slotEmpty : '',
                          ].join(' ')}
                        >
                          <div className={styles.slotInfo}>
                            <span className={styles.slotLabel}>{slot.label}</span>
                          </div>
                          <span className={styles.slotTime}>{slot.startTime}–{slot.endTime}</span>
                          <span className={[styles.slotAssignee, isMe ? styles.slotAssigneeMe : ''].join(' ')}>
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
          )}
        </>
      )}
    </div>
  )
}
