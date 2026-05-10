import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import styles from './EmployeeDetailPage.module.scss'

const ROLE_LABELS: Record<string, string> = { employee: 'עובד', duty: 'אחמ"ש', scheduler: 'סידור', manager: 'מנהל' }

function Row({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { employees, isLoading, fetchAll, deactivate } = useEmployeeStore()

  useEffect(() => {
    if (employees.length === 0) fetchAll()
  }, [employees.length, fetchAll])

  const emp = employees.find(e => e.id === id)
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) return <LoadingSpinner />

  if (!emp) return (
    <div className={styles.page}>
      <PageHeader title="פרטי עובד" showBack />
      <p className={styles.notFound}>העובד לא נמצא.</p>
    </div>
  )

  async function handleDelete() {
    await deactivate(emp!.id)
    navigate('/manager/employees', { replace: true })
  }

  return (
    <div className={styles.page}>
      <PageHeader title={emp.name} showBack />
      <div className={styles.content}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>פרטים כלליים</p>
          <Row label="שם מלא" value={emp.name} />
          <Row label="תפקיד" value={ROLE_LABELS[emp.role]} />
          <Row label="שכר לשעה" value={`₪${emp.hourlyWage}`} />
        </div>

        {(emp.idNumber || emp.phone || emp.email) && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>פרטים אישיים</p>
            <Row label="תעודת זהות" value={emp.idNumber} />
            <Row label="טלפון" value={emp.phone} />
            <Row label="אימייל" value={emp.email} />
          </div>
        )}

        {(emp.bankNumber || emp.bankBranch || emp.bankAccount) && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>פרטי בנק</p>
            <Row label="מספר בנק" value={emp.bankNumber} />
            <Row label="מספר סניף" value={emp.bankBranch} />
            <Row label="חשבון בנק" value={emp.bankAccount} />
          </div>
        )}

        <div className={styles.actions}>
          <Button
            fullWidth
            onClick={() => navigate(`/manager/employees/${emp.id}/edit`)}
          >
            עריכה
          </Button>
          <Button fullWidth variant="destructive" onClick={() => setShowDelete(true)}>
            מחיקת עובד
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        title={`למחוק את ${emp.name}?`}
        message="פעולה זו אינה הפיכה."
        confirmLabel="מחיקה"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
