import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import type { Role } from '../../types'
import styles from './EmployeeFormPage.module.scss'

const ROLE_OPTIONS = [
  { value: 'employee', label: 'עובד' },
  { value: 'manager', label: 'מנהל' },
]

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { employees, fetchAll, addEmployee, updateEmployee } = useEmployeeStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [hourlyWage, setHourlyWage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      if (employees.length === 0) {
        fetchAll()
      }
    }
  }, [isEdit, employees.length, fetchAll])

  useEffect(() => {
    if (isEdit && id && employees.length > 0) {
      const emp = employees.find(e => e.id === id)
      if (emp) {
        setName(emp.name)
        setEmail(emp.email)
        setRole(emp.role)
        setHourlyWage(String(emp.hourlyWage))
      }
    }
  }, [isEdit, id, employees])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (isEdit && id) {
        await updateEmployee(id, {
          name,
          email,
          role,
          hourlyWage: Number(hourlyWage),
        })
      } else {
        await addEmployee({
          name,
          email,
          passwordHash: password,
          role,
          hourlyWage: Number(hourlyWage),
          isActive: true,
        })
      }
      navigate('/manager/employees')
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
          {!isEdit && (
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
          )}
          <Select
            label="תפקיד"
            id="role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={e => setRole(e.target.value as Role)}
          />
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
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" fullWidth isLoading={isLoading}>
            {isEdit ? 'שמור שינויים' : 'הוסף עובד'}
          </Button>
        </form>
      </div>
    </div>
  )
}
