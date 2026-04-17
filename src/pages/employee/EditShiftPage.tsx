import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { isWithinEditWindow } from '../../lib/utils'
import type { CreateShiftInput, Shift } from '../../types'
import styles from './EditShiftPage.module.scss'

export function EditShiftPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)!
  const { shifts, fetchByEmployee, updateShift } = useShiftStore()
  const [shift, setShift] = useState<Shift | null | undefined>(undefined)

  useEffect(() => {
    if (shifts.length === 0) {
      fetchByEmployee(currentUser.id)
    }
  }, [])

  useEffect(() => {
    if (shifts.length > 0) {
      const found = shifts.find(s => s.id === id) ?? null
      setShift(found)
    }
  }, [shifts, id])

  async function handleSubmit(data: CreateShiftInput) {
    await updateShift(id!, data)
    navigate('/employee/shifts')
  }

  if (shift === undefined) return <LoadingSpinner />

  if (!shift || shift.employeeId !== currentUser.id) {
    return (
      <div className={styles.page}>
        <PageHeader title="עריכת דיווח" showBack />
        <div className={styles.message}>הדיווח לא נמצא.</div>
      </div>
    )
  }

  if (!isWithinEditWindow(shift.submittedAt)) {
    return (
      <div className={styles.page}>
        <PageHeader title="עריכת דיווח" showBack />
        <div className={styles.message}>
          <p className={styles.messageTitle}>חלון העריכה נסגר</p>
          <p className={styles.messageSub}>ניתן לערוך דיווח רק בתוך 24 שעות מהגשתו.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="עריכת דיווח" showBack />
      <div className={styles.content}>
        <ShiftForm
          employeeId={currentUser.id}
          initialValues={shift}
          onSubmit={handleSubmit}
          submitLabel="שמור שינויים"
        />
      </div>
    </div>
  )
}
