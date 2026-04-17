import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  action?: React.ReactNode
}

export function PageHeader({ title, showBack = false, action }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack && (
          <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  )
}
