import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { Role } from '../../types'
import styles from './EmployeesPage.module.scss'

const ROLE_LABELS: Record<Role, string> = {
  employee:  'עובד',
  duty:      'אחמ"ש',
  scheduler: 'סידור',
  manager:   'מנהל',
}

const ROLE_STYLE: Record<Role, string> = {
  employee:  'roleEmployee',
  duty:      'roleDuty',
  scheduler: 'roleScheduler',
  manager:   'roleManager',
}

export function EmployeesPage() {
  const navigate = useNavigate()
  const { employees: allEmployees, isLoading, fetchAll } = useEmployeeStore()
  const employees = allEmployees
    .filter(e => e.isActive)
    .sort((a, b) => a.name.split(' ')[0].localeCompare(b.name.split(' ')[0], 'he'))

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
                  className={styles.clickableRow}
                  onClick={() => navigate(`/manager/employees/${emp.id}`)}
                >
                  <td className={styles.nameCell}>{emp.name}</td>
                  <td>
                    <span className={styles[ROLE_STYLE[emp.role]]}>
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
