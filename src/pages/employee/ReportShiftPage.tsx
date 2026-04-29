import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { Button } from '../../components/ui/Button'
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
    await addShift(data)
    const allNames = employees.filter(e => e.isActive).map(e => e.name)
    const displayName = formatEmployeeNameForMessage(currentUser.name, allNames)
    try {
      await navigator.clipboard.writeText(buildShiftMessage(data, displayName))
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
        <div className={styles.closureLink}>
          <Button variant="ghost" fullWidth onClick={() => navigate('/employee/closure')}>
            הגשת פרטי קופה בלבד
          </Button>
        </div>
      </div>
    </div>
  )
}
