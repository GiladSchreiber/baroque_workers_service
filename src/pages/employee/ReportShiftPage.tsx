import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { buildShiftMessage } from '../../lib/utils'
import type { CreateShiftInput } from '../../types'
import styles from './ReportShiftPage.module.scss'

export function ReportShiftPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)!
  const addShift = useShiftStore(s => s.addShift)

  async function handleSubmit(data: CreateShiftInput) {
    await addShift(data)
    try {
      await navigator.clipboard.writeText(buildShiftMessage(data, currentUser.name))
    } catch {
      // clipboard not available — silently skip
    }
    navigate('/employee/shifts')
  }

  return (
    <div className={styles.page}>
      <PageHeader title="דיווח שעות" />
      <div className={styles.content}>
        <ShiftForm employeeId={currentUser.id} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
