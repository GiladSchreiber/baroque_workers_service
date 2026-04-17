import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './LoginPage.module.scss'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const currentUser = useAuthStore(s => s.currentUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (currentUser) {
    navigate(currentUser.role === 'manager' ? '/manager/dashboard' : '/employee/report', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
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
          placeholder="you@bar.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="סיסמה"
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth isLoading={isLoading}>
          כניסה
        </Button>

        <div className={styles.quickLogin}>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={() => { login('liav.pinchas@baroque.com', 'password123') }}
          >
            כניסה כליאב
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={() => { login('noam@gmail.com', 'password123') }}
          >
            כניסה כנועם
          </button>
        </div>
      </form>

      <p className={styles.hint}>
        עובד חדש? <Link to="/register">הרשמה</Link>
      </p>
    </div>
  )
}
