import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { buildShiftMessage, formatEmployeeNameForMessage } from '../../lib/utils'
import { buildInventoryClipboardMessage } from '../../lib/inventoryUtils'
import type { CreateShiftInput } from '../../types'
import styles from './ReportShiftPage.module.scss'

export function ReportShiftPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inventoryDate = searchParams.get('inventoryDate') ?? ''  // set after returning from inventory fill

  const currentUser = useAuthStore(s => s.currentUser)!
  const addShift = useShiftStore(s => s.addShift)
  const { employees, fetchAll } = useEmployeeStore()

  const inventoryItems       = useInventoryStore(s => s.items)
  const categoryOrder        = useInventoryStore(s => s.categoryOrder)
  const fetchReportsForDate  = useInventoryStore(s => s.fetchReportsForDate)
  const getReportByDateAndWorker = useInventoryStore(s => s.getReportByDateAndWorker)

  useEffect(() => { fetchAll() }, [fetchAll])

  // Pre-load the inventory report so we can build the combined clipboard message
  useEffect(() => {
    if (inventoryDate) fetchReportsForDate(inventoryDate)
  }, [inventoryDate])

  async function handleSubmit(data: CreateShiftInput) {
    const allNames = employees.filter(e => e.isActive).map(e => e.name)
    const displayName = formatEmployeeNameForMessage(currentUser.name, allNames)

    // Build combined clipboard message within the user-gesture context (required by iOS Safari)
    let clipboardText = buildShiftMessage(data, displayName)
    if (inventoryDate) {
      const invReport = getReportByDateAndWorker(inventoryDate, currentUser.id)
      if (invReport && invReport.entries.length > 0) {
        const invMsg = buildInventoryClipboardMessage(
          invReport.entries,
          inventoryItems,
          categoryOrder,
          inventoryDate,
          currentUser.name,
        )
        clipboardText = `${clipboardText}\n\n${invMsg}`
      }
    }

    const clipboardWrite = navigator.clipboard.writeText(clipboardText).catch(() => {})
    await addShift(data)
    await clipboardWrite
    navigate('/employee/shifts')
  }

  function handleNavigateToInventory(date: string) {
    navigate(
      `/employee/inventory/fill?returnTo=${encodeURIComponent('/employee/report')}&date=${encodeURIComponent(date)}`
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="דיווח שעות" />
      {inventoryDate && (
        <div className={styles.inventoryBadge}>✅ מלאי הוגש ל-{inventoryDate.split('-').reverse().join('.')}</div>
      )}
      <div className={styles.content}>
        <ShiftForm
          employeeId={currentUser.id}
          onSubmit={handleSubmit}
          showDutyShift={currentUser.roles.some(r => ['duty', 'manager', 'scheduler'].includes(r))}
          onNavigateToInventory={
            currentUser.roles.some(r => ['kitchen', 'employee'].includes(r))
              ? handleNavigateToInventory
              : undefined
          }
        />
      </div>
    </div>
  )
}
