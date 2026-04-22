import { useEffect, useMemo, useState } from 'react'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useShiftStore } from '../../store/shiftStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { currentMonthStr, monthOptions, fmtMoney } from '../../lib/utils'
import {
  REVENUE_HISTORY, getPointForSameMonthLastYear,
} from '../../data/revenueHistory'
import styles from './DashboardPage.module.scss'

const MONTH_OPTIONS = monthOptions(24)
const MONTH_ABBR = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']

type ChartView = 'ytd' | 'year' | 'all'

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
  const [month, setMonth] = useState(currentMonthStr())
  const [chartView, setChartView] = useState<ChartView>('ytd')

  useEffect(() => { fetchAll() }, [fetchAll])

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

  // Average monthly tips across all months of last year
  const lastYearMonthlyAvgTips = useMemo(() => {
    const lastYear = String(Number(month.split('-')[0]) - 1)
    const byMonth: Record<string, number> = {}
    for (const s of shifts) {
      if (!s.date.startsWith(lastYear)) continue
      const ym = s.date.slice(0, 7)
      byMonth[ym] = (byMonth[ym] ?? 0) + (s.tips ?? 0)
    }
    const months = Object.values(byMonth)
    return months.length > 0 ? months.reduce((a, b) => a + b, 0) / months.length : 0
  }, [shifts, month])

  const tipVsAvgChange = pct(totalTips, lastYearMonthlyAvgTips)

  const selectedYear = month.split('-')[0]

  const toChartPoint = (p: typeof REVENUE_HISTORY[0]) => ({
    name: shortMonth(p.month),
    'סה"כ': p.sum,
    'ממוצע': p.average,
  })

  // View 1: year-to-date (months of selected year up to selected month)
  const ytdData = useMemo(
    () => REVENUE_HISTORY.filter(p => p.month.startsWith(selectedYear) && p.month <= month).map(toChartPoint),
    [selectedYear, month],
  )

  // View 2: full selected year
  const yearData = useMemo(
    () => REVENUE_HISTORY.filter(p => p.month.startsWith(selectedYear)).map(toChartPoint),
    [selectedYear],
  )

  // View 3: all data since beginning
  const allData = useMemo(
    () => REVENUE_HISTORY.map(toChartPoint),
    [],
  )

  const chartData = chartView === 'ytd' ? ytdData
    : chartView === 'year' ? yearData
    : allData

  const xInterval = chartView === 'all' ? 5 : 0

  // Historical reference for selected month
  const historicalPoint = useMemo(() => {
    const found = REVENUE_HISTORY.find(p => p.month === month)
    const prev  = getPointForSameMonthLastYear(month)
    return { found, prev }
  }, [month])

  const historicalChange = historicalPoint.found && historicalPoint.prev
    ? pct(historicalPoint.found.sum, historicalPoint.prev.sum)
    : null

  return (
    <div className={styles.page}>
      <PageHeader title="דשבורד" />
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.content}>
          <select
            className={styles.monthSelect}
            value={month}
            onChange={e => setMonth(e.target.value)}
          >
            {MONTH_OPTIONS.map(o => (
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
            <div className={`${styles.card} ${styles.cardFull}`}>
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
              {lastYearMonthlyAvgTips > 0 && tipVsAvgChange !== null && (
                <span className={styles.cardSub}>
                  ממוצע חודשי {String(Number(month.split('-')[0]) - 1)}: ₪{fmtMoney(lastYearMonthlyAvgTips)}
                  <span className={tipVsAvgChange >= 0 ? styles.up : styles.down}>
                    {' '}{tipVsAvgChange >= 0 ? '▲' : '▼'}{Math.abs(tipVsAvgChange).toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Growth chart */}
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>גדילה — {selectedYear}</span>
              <div className={styles.toggle}>
                {(['ytd', 'year', 'all'] as ChartView[]).map(v => (
                  <button
                    key={v}
                    className={`${styles.toggleBtn} ${chartView === v ? styles.toggleActive : ''}`}
                    onClick={() => setChartView(v)}
                  >
                    {v === 'ytd' ? 'מתחילת השנה' : v === 'year' ? 'כל השנה' : 'מתחילת הדרך'}
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
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey='סה"כ' stroke="#c8bfa0" strokeWidth={2} fill="url(#gradSum)" dot={false} />
                  <Line type="monotone" dataKey="ממוצע" stroke="#7a8a9a" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#c8bfa0' }} />
                סה"כ חודשי
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDash} />
                ממוצע יומי
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
