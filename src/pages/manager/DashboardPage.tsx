import { useEffect, useMemo, useState } from 'react'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useShiftStore } from '../../store/shiftStore'
import { useMonthlySummaries } from '../../hooks/useMonthlySummaries'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { currentMonthStr, fmtMoney, formatMonth } from '../../lib/utils'
import styles from './DashboardPage.module.scss'

const THIS_MONTH = currentMonthStr()
const MONTH_ABBR = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']

type ChartView = 'daily' | 'monthly'

function linRegression(values: number[]): number[] {
  const n = values.length
  if (n < 2) return values
  const sumX = (n * (n - 1)) / 2
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return values.map((_, i) => Math.round(intercept + slope * i))
}

function shortMonth(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_ABBR[Number(m) - 1]} ${y.slice(2)}`
}

function pct(current: number, prev: number) {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ₪{fmtMoney(p.value)}
        </p>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { shifts, isLoading, fetchAll } = useShiftStore()
  const { summaries } = useMonthlySummaries()
  const [month, setMonth] = useState(THIS_MONTH)
  const [chartView, setChartView] = useState<ChartView>('daily')

  useEffect(() => { fetchAll() }, [fetchAll])

  const monthOptions = useMemo(() => [
    { value: THIS_MONTH, label: formatMonth(THIS_MONTH) },
    ...summaries
      .slice()
      .reverse()
      .filter(p => p.month !== THIS_MONTH)
      .map(p => ({ value: p.month, label: formatMonth(p.month) })),
  ], [summaries])

  const incomeShifts = useMemo(
    () => shifts.filter(s => s.date.startsWith(month) && s.revenue !== undefined),
    [shifts, month],
  )

  const totalRevenue = useMemo(() => incomeShifts.reduce((sum, s) => sum + (s.revenue ?? 0), 0), [incomeShifts])
  const totalCash    = useMemo(() => incomeShifts.reduce((sum, s) => sum + (s.cash ?? 0), 0), [incomeShifts])
  const totalCredit  = useMemo(() => incomeShifts.reduce((sum, s) => sum + (s.credit ?? 0), 0), [incomeShifts])
  const avgRevenue   = incomeShifts.length > 0 ? totalRevenue / incomeShifts.length : 0

  const totalTips = useMemo(
    () => shifts.filter(s => s.date.startsWith(month)).reduce((sum, s) => sum + (s.tips ?? 0), 0),
    [shifts, month],
  )

  const lastYearMonth = useMemo(() => {
    const [y, m] = month.split('-')
    return `${Number(y) - 1}-${m}`
  }, [month])

  const lastYearTips = useMemo(
    () => shifts.filter(s => s.date.startsWith(lastYearMonth)).reduce((sum, s) => sum + (s.tips ?? 0), 0),
    [shifts, lastYearMonth],
  )

  const tipChange = pct(totalTips, lastYearTips)


  // Same month last year from summaries
  const sameMonthLastYearPoint = useMemo(() => {
    const [y, m] = month.split('-')
    return summaries.find(p => p.month === `${Number(y) - 1}-${m}`)
  }, [month, summaries])
  const sameMonthLastYearAvg = sameMonthLastYearPoint?.average ?? 0
  const revenueVsLastYearSameMonth = pct(avgRevenue, sameMonthLastYearAvg)

  // View 1 "יומי": daily revenue from shifts for the selected month
  const dailyData = useMemo(() => {
    const byDay: Record<string, number> = {}
    for (const s of shifts) {
      if (!s.date.startsWith(month) || s.revenue == null) continue
      byDay[s.date] = (byDay[s.date] ?? 0) + s.revenue
    }
    const days = Object.keys(byDay).sort()
    const sums = days.map(d => byDay[d])
    const trend = linRegression(sums)
    return days.map((d, i) => ({
      name: new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric' }).format(new Date(d + 'T12:00:00')),
      'סה"כ': sums[i],
      'מגמה': trend[i],
    }))
  }, [shifts, month])

  // View 2 "חודשי": all monthly summaries across all time
  const yearlyData = useMemo(() => {
    const sums = summaries.map(p => p.sum)
    const trend = linRegression(sums)
    return summaries.map((p, i) => ({
      name: shortMonth(p.month),
      'סה"כ': p.sum,
      'מגמה': trend[i],
    }))
  }, [summaries])

  const chartData = chartView === 'daily' ? dailyData : yearlyData
  const xInterval = chartView === 'monthly' ? 5 : 0

  // Historical reference for selected month
  const historicalPoint = useMemo(() => {
    const found = summaries.find(p => p.month === month)
    const [y, m] = month.split('-')
    const prev  = summaries.find(p => p.month === `${Number(y) - 1}-${m}`)
    return { found, prev }
  }, [month, summaries])

  const historicalChange = historicalPoint.found && historicalPoint.prev
    ? pct(historicalPoint.found.sum, historicalPoint.prev.sum)
    : null

  return (
    <div className={styles.page}>
      <PageHeader title="סקירה" />
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.content}>
          <select
            className={styles.monthSelect}
            value={month}
            onChange={e => setMonth(e.target.value)}
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Stat cards */}
          <div className={styles.cards}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ X</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalRevenue)}</span>
              {historicalPoint.found && (
                <span className={styles.cardSub}>
                  היסטורי: ₪{fmtMoney(historicalPoint.found.sum)}
                  {historicalChange !== null && (
                    <span className={historicalChange >= 0 ? styles.up : styles.down}>
                      {' '}{historicalChange >= 0 ? '▲' : '▼'}{Math.abs(historicalChange).toFixed(1)}%
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>ממוצע X</span>
              <span className={styles.cardValue}>₪{fmtMoney(avgRevenue)}</span>
              {historicalPoint.found && (
                <span className={styles.cardSub}>היסטורי: ₪{fmtMoney(historicalPoint.found.average)}</span>
              )}
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ מזומן</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalCash)}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ אשראי</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalCredit)}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ טיפ</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalTips)}</span>
              {lastYearTips > 0 && tipChange !== null && (
                <span className={styles.cardSub}>
                  {shortMonth(lastYearMonth)}: ₪{fmtMoney(lastYearTips)}
                  <span className={tipChange >= 0 ? styles.up : styles.down}>
                    {' '}{tipChange >= 0 ? '▲' : '▼'}{Math.abs(tipChange).toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>ממוצע X {shortMonth(lastYearMonth)}</span>
              <span className={styles.cardValue}>₪{fmtMoney(sameMonthLastYearAvg)}</span>
              {revenueVsLastYearSameMonth !== null && sameMonthLastYearAvg > 0 && (
                <span className={styles.cardSub}>
                  לעומת ממוצע חודש זה
                  <span className={revenueVsLastYearSameMonth >= 0 ? styles.up : styles.down}>
                    {' '}{revenueVsLastYearSameMonth >= 0 ? '▲' : '▼'}{Math.abs(revenueVsLastYearSameMonth).toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Growth chart */}
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <span />
              <div className={styles.toggle}>
                {(['daily', 'monthly'] as ChartView[]).map(v => (
                  <button
                    key={v}
                    className={`${styles.toggleBtn} ${chartView === v ? styles.toggleActive : ''}`}
                    onClick={() => setChartView(v)}
                  >
                    {v === 'daily' ? 'יומי' : 'חודשי'}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c8bfa0" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#c8bfa0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263040" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#7a8a9a', fontSize: 10 }} axisLine={false} tickLine={false} interval={xInterval} />
                  <YAxis tick={{ fill: '#7a8a9a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₪${fmtMoney(v)}`} width={62} />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Area type="monotone" dataKey='סה"כ' stroke="#c8bfa0" strokeWidth={2} fill="url(#gradSum)" dot={false} activeDot={false} />
                  <Line type="monotone" dataKey="מגמה" stroke="#7a8a9a" strokeWidth={1.5} strokeDasharray="5 3" dot={false} legendType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
