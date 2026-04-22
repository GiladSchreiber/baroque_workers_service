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
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [bankNumber, setBankNumber] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await register({ name, email, idNumber, phone, bankNumber, bankAccount, bankBranch })
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
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Baroque" className={styles.logo} />
        <p className={styles.brandSub}>הרשמה לצוות</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="שם מלא"
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <Input
          label="אימייל"
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="תעודת זהות"
          id="idNumber"
          type="text"
          inputMode="numeric"
          value={idNumber}
          onChange={e => setIdNumber(e.target.value)}
        />
        <Input
          label="מספר טלפון"
          id="phone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
        />

        <div className={styles.bankSection}>
          <p className={styles.bankTitle}>פרטי בנק</p>
          <div className={styles.bankGrid}>
            <Input
              label="מספר בנק"
              id="bankNumber"
              type="text"
              inputMode="numeric"
              value={bankNumber}
              onChange={e => setBankNumber(e.target.value)}
            />
            <Input
              label="מספר סניף"
              id="bankBranch"
              type="text"
              inputMode="numeric"
              value={bankBranch}
              onChange={e => setBankBranch(e.target.value)}
            />
            <Input
              label="חשבון בנק"
              id="bankAccount"
              type="text"
              inputMode="numeric"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
            />
          </div>
        </div>

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
