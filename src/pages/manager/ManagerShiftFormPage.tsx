import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ShiftForm } from '../../components/forms/ShiftForm'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { CreateShiftInput } from '../../types'
import styles from './ManagerShiftFormPage.module.scss'

export function ManagerShiftFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { shifts, addShift, updateShift, deleteShift, fetchAll: fetchShifts } = useShiftStore()
  const { employees, fetchAll: fetchEmployees } = useEmployeeStore()

  useEffect(() => {
    fetchShifts()
    if (employees.length === 0) fetchEmployees()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const shift = isEdit ? shifts.find(s => s.id === id) : undefined
  const employeeId = isEdit ? (shift?.employeeId ?? '') : (searchParams.get('employeeId') ?? '')

  const employee = useMemo(
    () => employees.find(e => e.id === employeeId),
    [employees, employeeId],
  )

  const [showDelete, setShowDelete] = useState(false)

  if (isEdit && !shift) return <LoadingSpinner />

  async function handleSubmit(data: CreateShiftInput) {
    if (isEdit && id) {
      await updateShift(id, data)
    } else if (data.repeatMonthly) {
      // Create one entry per month for 12 months starting from the chosen date's month
      const [y, m, d] = data.date.split('-').map(Number)
      for (let i = 0; i < 12; i++) {
        const date = new Date(y, m - 1 + i, 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        const day = String(Math.min(d, lastDay)).padStart(2, '0')
        const monthStr = String(date.getMonth() + 1).padStart(2, '0')
        const dateStr = `${date.getFullYear()}-${monthStr}-${day}`
        await addShift({ ...data, date: dateStr })
      }
    } else {
      await addShift(data)
    }
    navigate(-1)
  }

  async function handleDelete() {
    if (!id) return
    await deleteShift(id)
    navigate(-1)
  }

  const initialValues: Partial<CreateShiftInput> | undefined = shift
    ? {
        employeeId: shift.employeeId,
        date: shift.date,
        type: shift.type,
        startTime: shift.startTime,
        endTime: shift.endTime,
        amount: shift.amount,
        revenue: shift.revenue,
        cash: shift.cash,
        credit: shift.credit,
        tips: shift.tips,
      }
    : { type: 'global' }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? 'עריכת משמרת' : `הוספת רשומה — ${employee?.name ?? ''}`}
        showBack
      />
      <div className={styles.content}>
        <ShiftForm
          key={shift?.id ?? 'new'}
          employeeId={employeeId}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'שמור שינויים' : 'הוסף רשומה'}
          managerMode
          isEdit={isEdit}
        />
        {isEdit && (
          <div className={styles.deleteSection}>
            <Button variant="destructive" fullWidth onClick={() => setShowDelete(true)}>
              מחיקת רשומה
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        title="למחוק רשומה זו?"
        message="פעולה זו אינה הפיכה."
        confirmLabel="מחיקה"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
