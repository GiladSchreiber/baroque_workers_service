import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useClosureStore } from '../../store/closureStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { BLOCK_TYPE_LABELS, todayString } from '../../lib/utils'
import type { BlockType } from '../../types'
import styles from './SubmitClosurePage.module.scss'

const BLOCK_OPTIONS = (['morning', 'afternoon', 'evening'] as BlockType[]).map(b => ({
  value: b,
  label: BLOCK_TYPE_LABELS[b],
}))

export function SubmitClosurePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)!
  const addClosure = useClosureStore(s => s.addClosure)

  const [date, setDate] = useState(todayString())
  const [block, setBlock] = useState<BlockType>('morning')
  const [revenue, setRevenue] = useState('')
  const [cash, setCash] = useState('')
  const [credit, setCredit] = useState('')
  const [tips, setTips] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rev = parseFloat(revenue) || 0
    const c = parseFloat(cash) || 0
    const cr = parseFloat(credit) || 0
    const t = parseFloat(tips) || 0

    if (Math.abs(c + cr - rev) > 5) {
      setError(
        `מזומן + אשראי (₪${(c + cr).toFixed(2)}) אינם תואמים את ה-X (₪${rev.toFixed(2)})`
      )
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await addClosure({
        date,
        block,
        revenue: rev,
        cash: c,
        credit: cr,
        tips: t,
        notes: notes.trim() || undefined,
        submittedById: currentUser.id,
      })
      navigate(currentUser.role === 'manager' ? '/manager/closures' : '/employee/report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="סגירת משמרת" showBack />
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.topRow}>
          <Input
            label="תאריך"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <Select
            label="בלוק"
            options={BLOCK_OPTIONS}
            value={block}
            onChange={e => setBlock(e.target.value as BlockType)}
          />
        </div>
        <div className={styles.grid}>
          <Input
            label="X"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={revenue}
            onChange={e => setRevenue(e.target.value)}
            required
          />
          <Input
            label="אשראי"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={credit}
            onChange={e => setCredit(e.target.value)}
            required
          />
          <Input
            label="מזומן"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={cash}
            onChange={e => setCash(e.target.value)}
            required
          />
          <Input
            label="טיפ"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={tips}
            onChange={e => setTips(e.target.value)}
          />
        </div>
        <Textarea
          label="הערות"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="פרטים נוספים..."
        />
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          שמירה
        </Button>
      </form>
    </div>
  )
}
