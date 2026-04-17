import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import styles from './RegisterPage.module.scss'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore(s => s.register)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await register(name, email, password)
      navigate('/employee/report', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="Baroque" className={styles.logo} />
        <p className={styles.brandSub}>הרשמה לצוות</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="שם מלא"
          id="name"
          type="text"
          placeholder="השם שלך"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
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
          placeholder="לפחות 6 תווים"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" fullWidth isLoading={isLoading}>
          יצירת חשבון
        </Button>
      </form>

      <p className={styles.hint}>
        כבר יש לך חשבון? <Link to="/login">כניסה</Link>
      </p>
    </div>
  )
}
