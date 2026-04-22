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

export function EmployeesPage() {
  const navigate = useNavigate()
  const { employees, isLoading, fetchAll } = useEmployeeStore()

  useEffect(() => { fetchAll() }, [fetchAll])

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
                <th style={{ textAlign: 'center' }}>שכר בסיס</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr
                  key={emp.id}
                  className={`${styles.clickableRow} ${emp.isActive ? '' : styles.inactiveRow}`}
                  onClick={() => navigate(`/manager/employees/${emp.id}`)}
                >
                  <td className={styles.nameCell}>{emp.name}</td>
                  <td>
                    <span className={emp.role === 'manager' ? styles.roleManager : styles.roleEmployee}>
                      {ROLE_LABELS[emp.role]}
                    </span>
                  </td>
                  <td className={styles.wageCell}>₪{emp.hourlyWage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
