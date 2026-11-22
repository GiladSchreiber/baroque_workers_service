import { useLocation, useNavigate } from 'react-router-dom'
import styles from './Documents.module.scss'

const TABS = [
  { to: '/manager/documents', label: 'מסמכים' },
  { to: '/manager/documents/expenses', label: 'הוצאות' },
]

export function DocumentsSubNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <div className={styles.subNav}>
      {TABS.map(t => (
        <button
          key={t.to}
          className={`${styles.subTab} ${pathname === t.to ? styles.subTabActive : ''}`}
          onClick={() => navigate(t.to)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
