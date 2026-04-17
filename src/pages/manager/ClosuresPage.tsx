import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClosureStore } from '../../store/closureStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { BLOCK_TYPE_LABELS, formatDate } from '../../lib/utils'
import styles from './ClosuresPage.module.scss'

export function ClosuresPage() {
  const navigate = useNavigate()
  const { closures, isLoading, fetchAll } = useClosureStore()
  const { employees, fetchAll: fetchEmployees } = useEmployeeStore()

  useEffect(() => {
    fetchAll()
    fetchEmployees()
  }, [fetchAll, fetchEmployees])

  const employeeMap = Object.fromEntries(employees.map(e => [e.id, e.name]))
  const sorted = [...closures].sort((a, b) => {
    const d = b.date.localeCompare(a.date)
    return d !== 0 ? d : b.block.localeCompare(a.block)
  })

  return (
    <div className={styles.page}>
      <PageHeader
        title="סגירות"
        action={<Button onClick={() => navigate('/manager/closures/new')}>+ סגירה</Button>}
      />
      {isLoading ? (
        <LoadingSpinner />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="אין סגירות עדיין"
          description="הסגירה הראשונה תופיע כאן."
          action={<Button onClick={() => navigate('/manager/closures/new')}>סגירה חדשה</Button>}
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>בלוק</th>
                <th>עובד</th>
                <th style={{ textAlign: 'center' }}>X</th>
                <th style={{ textAlign: 'center' }}>מזומן</th>
                <th style={{ textAlign: 'center' }}>אשראי</th>
                <th style={{ textAlign: 'center' }}>טיפ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id}>
                  <td className={styles.dateCell}>{formatDate(c.date)}</td>
                  <td className={styles.blockCell}>{BLOCK_TYPE_LABELS[c.block]}</td>
                  <td className={styles.nameCell}>{employeeMap[c.submittedById] ?? '—'}</td>
                  <td className={styles.numCell}>₪{c.revenue}</td>
                  <td className={styles.numCell}>₪{c.cash}</td>
                  <td className={styles.numCell}>₪{c.credit}</td>
                  <td className={styles.numCell}>₪{c.tips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
