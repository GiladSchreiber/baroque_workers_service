import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import type { CreateShiftInput } from '../../types'
import styles from './SubmitShiftPage.module.scss'

export function SubmitShiftPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)!
  const addShift = useShiftStore(s => s.addShift)

  async function handleSubmit(data: CreateShiftInput) {
    await addShift(data)
    navigate('/employee/shifts')
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Submit Shift" showBack />
      <div className={styles.content}>
        <ShiftForm
          employeeId={currentUser.id}
          onSubmit={handleSubmit}
          submitLabel="Submit shift"
        />
      </div>
    </div>
  )
}
