import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import styles from './LoginPage.module.scss'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const currentUser = useAuthStore(s => s.currentUser)

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Manager password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  if (currentUser) {
    navigate(currentUser.role === 'manager' ? '/manager/dashboard' : '/employee/report', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      if (msg === 'NEED_PASSWORD') {
        setShowPasswordModal(true)
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setIsPasswordLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Baroque" className={styles.logo} />
        <p className={styles.brandSub}>פורטל עובדים</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="אימייל"
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth isLoading={isLoading}>
          כניסה
        </Button>

      </form>

      <p className={styles.hint}>
        עובד חדש? <Link to="/register">הרשמה</Link>
      </p>

      {/* Manager password modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPassword(''); setPasswordError('') }}
        title="כניסת מנהל"
      >
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="סיסמה"
            id="manager-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
          />
          {passwordError && <p className={styles.error}>{passwordError}</p>}
          <Button type="submit" fullWidth isLoading={isPasswordLoading}>
            כניסה
          </Button>
        </form>
      </Modal>
    </div>
  )
}
