import { useNavigate, useLocation } from 'react-router-dom'
import styles from './SchedulingSubNav.module.scss'

const TABS = [
  { path: '/manager/scheduling/week',      label: 'משמרות שבועיות' },
  { path: '/manager/scheduling/templates', label: 'שבלונה קבועה'  },
]

export function SchedulingSubNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className={styles.subNav}>
      {TABS.map(t => (
        <button
          key={t.path}
          className={`${styles.tab} ${pathname.startsWith(t.path) ? styles.active : ''}`}
          onClick={() => navigate(t.path)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
