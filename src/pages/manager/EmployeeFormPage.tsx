import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Role } from '../../types'
import { hashPassword } from '../../lib/utils'
import styles from './EmployeeFormPage.module.scss'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'employee',  label: 'עובד' },
  { value: 'duty',      label: 'אחמ"ש' },
  { value: 'kitchen',   label: 'מנהל מטבח' },
  { value: 'scheduler', label: 'סידור' },
  { value: 'manager',   label: 'מנהל' },
]

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { employees, fetchAll, addEmployee, updateEmployee } = useEmployeeStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<Role[]>(['employee'])
  const [hourlyWage, setHourlyWage] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [bankNumber, setBankNumber] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit && employees.length === 0) fetchAll()
  }, [isEdit, employees.length, fetchAll])

  useEffect(() => {
    if (isEdit && id && employees.length > 0) {
      const emp = employees.find(e => e.id === id)
      if (emp) {
        setName(emp.name)
        setEmail(emp.email)
        setRoles(emp.roles)
        setHourlyWage(String(emp.hourlyWage))
        setIdNumber(emp.idNumber ?? '')
        setPhone(emp.phone ?? '')
        setBankNumber(emp.bankNumber ?? '')
        setBankBranch(emp.bankBranch ?? '')
        setBankAccount(emp.bankAccount ?? '')
      }
    }
  }, [isEdit, id, employees])

  function toggleRole(role: Role) {
    setRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (roles.length === 0) { setError('יש לבחור לפחות תפקיד אחד'); return }
    setIsLoading(true)
    try {
      const personalFields = { idNumber, phone, bankNumber, bankBranch, bankAccount }
      const isManager = roles.includes('manager')
      if (isEdit && id) {
        const updates: Parameters<typeof updateEmployee>[1] = {
          name, email, roles,
          hourlyWage: Number(hourlyWage),
          ...personalFields,
        }
        if (isManager && password) {
          updates.passwordHash = await hashPassword(password)
        }
        await updateEmployee(id, updates)
      } else {
        const duplicate = employees.find(e => e.email.toLowerCase() === email.toLowerCase())
        if (duplicate) throw new Error('האימייל כבר בשימוש')
        const passwordHash = isManager && password ? await hashPassword(password) : ''
        await addEmployee({
          name, email,
          passwordHash,
          roles,
          hourlyWage: Number(hourlyWage),
          isActive: true,
          ...personalFields,
        })
      }
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'אירעה שגיאה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? 'עריכת עובד' : 'עובד חדש'}
        showBack
      />
      <div className={styles.content}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="שם מלא"
            id="name"
            type="text"
            placeholder="שם העובד"
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

          <div className={styles.rolesField}>
            <span className={styles.rolesLabel}>תפקידים</span>
            <div className={styles.rolesGroup}>
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className={styles.roleCheckbox}>
                  <input
                    type="checkbox"
                    checked={roles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {roles.includes('manager') && (
            <Input
              label={isEdit ? 'סיסמה (השאר ריק לאי-שינוי)' : 'סיסמה'}
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!isEdit}
              autoComplete="new-password"
            />
          )}
          <Input
            label="שכר לשעה"
            id="hourlyWage"
            type="number"
            placeholder="0"
            value={hourlyWage}
            onChange={e => setHourlyWage(e.target.value)}
            min={0}
            required
          />

          <div className={styles.sectionTitle}>פרטים אישיים</div>
          <Input
            label="תעודת זהות"
            id="idNumber"
            type="text"
            value={idNumber}
            onChange={e => setIdNumber(e.target.value)}
          />
          <Input
            label="טלפון"
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          <div className={styles.sectionTitle}>פרטי בנק</div>
          <div className={styles.bankGrid}>
            <Input
              label="מספר בנק"
              id="bankNumber"
              type="text"
              value={bankNumber}
              onChange={e => setBankNumber(e.target.value)}
            />
            <Input
              label="סניף"
              id="bankBranch"
              type="text"
              value={bankBranch}
              onChange={e => setBankBranch(e.target.value)}
            />
            <Input
              label="חשבון"
              id="bankAccount"
              type="text"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" fullWidth isLoading={isLoading}>
            {isEdit ? 'שמור שינויים' : 'הוסף עובד'}
          </Button>
        </form>
      </div>
    </div>
  )
}
