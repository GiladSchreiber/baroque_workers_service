import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { Role } from '../../types'
import styles from './EmployeesPage.module.scss'

const ROLE_LABELS: Record<Role, string> = {
  employee: 'עובד',
  manager: 'מנהל',
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DeactivateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M12 4L4 12M4 4l8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EmployeesPage() {
  const navigate = useNavigate()
  const { employees, isLoading, fetchAll, deactivate } = useEmployeeStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleDeactivate(id: string, name: string) {
    if (window.confirm(`לבטל את חשבון ${name}?`)) {
      await deactivate(id)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="צוות" />
      {isLoading ? (
        <LoadingSpinner />
      ) : employees.length === 0 ? (
        <EmptyState title="אין עובדים עדיין" description="עובדים חדשים נרשמים בעצמם." />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>שם</th>
                <th>תפקיד</th>
                <th style={{ textAlign: 'center' }}>שכר/שעה</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className={emp.isActive ? '' : styles.inactiveRow}>
                  <td className={styles.nameCell}>{emp.name}</td>
                  <td>
                    <span className={emp.role === 'manager' ? styles.roleManager : styles.roleEmployee}>
                      {ROLE_LABELS[emp.role]}
                    </span>
                  </td>
                  <td className={styles.wageCell}>₪{emp.hourlyWage}</td>
                  <td className={styles.actionCell}>
                    <button
                      className={styles.editBtn}
                      onClick={() => navigate(`/manager/employees/${emp.id}/edit`)}
                      aria-label="עריכה"
                    >
                      <EditIcon />
                    </button>
                    {emp.isActive && (
                      <button
                        className={styles.deactivateBtn}
                        onClick={() => handleDeactivate(emp.id, emp.name)}
                        aria-label="ביטול חשבון"
                      >
                        <DeactivateIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
