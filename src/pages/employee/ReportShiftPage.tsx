import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { useInventoryStore } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { buildShiftMessage, formatEmployeeNameForMessage } from '../../lib/utils'
import { buildInventoryClipboardMessage } from '../../lib/inventoryUtils'
import type { CreateShiftInput, ShiftType } from '../../types'
import styles from './ReportShiftPage.module.scss'

export function ReportShiftPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inventoryDate  = searchParams.get('inventoryDate') ?? ''
  // Form state restored from URL after returning from inventory
  const shiftInitialValues = useMemo(() => {
    const type      = searchParams.get('shiftType') as ShiftType | null
    const date      = searchParams.get('shiftDate')
    const startTime = searchParams.get('shiftStart')
    const endTime   = searchParams.get('shiftEnd')
    if (!type) return undefined
    return {
      ...(type      && { type }),
      ...(date      && { date }),
      ...(startTime && { startTime }),
      ...(endTime   && { endTime }),
    } as Partial<CreateShiftInput>
  }, [])  // intentionally only on mount so the form doesn't reset on re-render

  const currentUser = useAuthStore(s => s.currentUser)!
  const addShift = useShiftStore(s => s.addShift)
  const { employees, fetchAll } = useEmployeeStore()

  const inventoryItems           = useInventoryStore(s => s.items)
  const categoryOrder            = useInventoryStore(s => s.categoryOrder)
  const fetchReportsForDate      = useInventoryStore(s => s.fetchReportsForDate)
  const getReportByDateAndWorker = useInventoryStore(s => s.getReportByDateAndWorker)

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (inventoryDate) fetchReportsForDate(inventoryDate)
  }, [inventoryDate])

  async function handleSubmit(data: CreateShiftInput) {
    const allNames    = employees.filter(e => e.isActive).map(e => e.name)
    const displayName = formatEmployeeNameForMessage(currentUser.name, allNames)

    let clipboardText = buildShiftMessage(data, displayName)
    if (inventoryDate) {
      const invReport = getReportByDateAndWorker(inventoryDate, currentUser.id)
      if (invReport && invReport.entries.length > 0) {
        const invMsg = buildInventoryClipboardMessage(
          invReport.entries,
          inventoryItems,
          categoryOrder,
          inventoryDate,
        )
        clipboardText = `${clipboardText}\n\n${invMsg}`
      }
    }

    const clipboardWrite = navigator.clipboard.writeText(clipboardText).catch(() => {})
    await addShift(data)
    await clipboardWrite
    navigate('/employee/shifts')
  }

  function handleNavigateToInventory(snapshot: { date: string; type: ShiftType; startTime: string; endTime: string }) {
    const params = new URLSearchParams({
      returnTo:   '/employee/report',
      date:        snapshot.date,
      shiftType:   snapshot.type,
      shiftDate:   snapshot.date,
      shiftStart:  snapshot.startTime,
      shiftEnd:    snapshot.endTime,
    })
    navigate(`/employee/inventory/fill?${params.toString()}`)
  }

  return (
    <div className={styles.page}>
      <PageHeader title="דיווח שעות" />
      <div className={styles.content}>
        <ShiftForm
          employeeId={currentUser.id}
          initialValues={shiftInitialValues}
          onSubmit={handleSubmit}
          showDutyShift={currentUser.roles.some(r => ['duty', 'manager', 'scheduler'].includes(r))}
          onNavigateToInventory={
            currentUser.roles.some(r => ['kitchen', 'employee'].includes(r))
              ? handleNavigateToInventory
              : undefined
          }
          inventoryDone={!!inventoryDate}
        />
      </div>
    </div>
  )
}
