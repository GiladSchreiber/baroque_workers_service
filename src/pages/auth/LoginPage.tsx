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
      await login(email)
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
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth isLoading={isLoading}>
          כניסה
        </Button>

        <div className={styles.quickLogin}>
          <button type="button" className={styles.quickBtn} onClick={() => login('noam@gmail.com')}>נועם (מנהל)</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('gilad@gmail.com')}>גלעד (מנהל)</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('liav.pinchas@baroque.com')}>ליאב</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('sinai.yoffe@baroque.com')}>סיני</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('sofia.kaplan@baroque.com')}>סופיה</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('rafael.buzaglo@baroque.com')}>רפאל</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('nea.freilpert@baroque.com')}>נעה</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('julia.abukhalil@baroque.com')}>ג׳וליה</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('ila.avivi@baroque.com')}>אילה</button>
          <button type="button" className={styles.quickBtn} onClick={() => login('yotam.zak@baroque.com')}>יותם</button>
        </div>
      </form>

      <p className={styles.hint}>
        עובד חדש? <Link to="/register">הרשמה</Link>
      </p>
    </div>
  )
}
