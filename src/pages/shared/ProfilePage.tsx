import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import styles from './ProfilePage.module.scss'

const ROLE_LABELS: Record<string, string> = { employee: 'עובד', duty: 'אחמ"ש', scheduler: 'סידור', manager: 'מנהל' }

export function ProfilePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)!
  const logout = useAuthStore(s => s.logout)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.page}>
      <PageHeader title="פרופיל" />
      <div className={styles.content}>
        <div className={styles.avatar}>
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <h2 className={styles.name}>{currentUser.name}</h2>
        <p className={styles.email}>{currentUser.email}</p>
        <span className={styles.role}>{ROLE_LABELS[currentUser.role]}</span>

        <div className={styles.actions}>
          <Button variant="destructive" fullWidth onClick={handleLogout}>
            התנתקות
          </Button>
        </div>
      </div>
    </div>
  )
}
