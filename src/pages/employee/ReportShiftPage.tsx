import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { buildShiftMessage, formatEmployeeNameForMessage } from '../../lib/utils'
import type { CreateShiftInput } from '../../types'
import styles from './ReportShiftPage.module.scss'

export function ReportShiftPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)!
  const addShift = useShiftStore(s => s.addShift)
  const { employees, fetchAll } = useEmployeeStore()

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleSubmit(data: CreateShiftInput) {
    const allNames = employees.filter(e => e.isActive).map(e => e.name)
    const displayName = formatEmployeeNameForMessage(currentUser.name, allNames)
    // Initiate clipboard write immediately within the user gesture context (required by iOS Safari)
    const clipboardWrite = navigator.clipboard.writeText(buildShiftMessage(data, displayName)).catch(() => {})
    await addShift(data)
    await clipboardWrite
    navigate('/employee/shifts')
  }

  return (
    <div className={styles.page}>
      <PageHeader title="דיווח שעות" />
      <div className={styles.content}>
        <ShiftForm employeeId={currentUser.id} onSubmit={handleSubmit} showDutyShift={currentUser.roles.some(r => ['duty', 'manager', 'scheduler'].includes(r))} />
      </div>
    </div>
  )
}
