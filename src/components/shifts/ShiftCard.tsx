import { useNavigate } from 'react-router-dom'
import type { Shift } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SHIFT_TYPE_LABELS, formatDate, isWithinEditWindow } from '../../lib/utils'
import styles from './ShiftCard.module.scss'

interface ShiftCardProps {
  shift: Shift
  showEditButton?: boolean
}

export function ShiftCard({ shift, showEditButton = false }: ShiftCardProps) {
  const navigate = useNavigate()
  const canEdit = showEditButton && isWithinEditWindow(shift.submittedAt)

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.date}>{formatDate(shift.date)}</span>
        <Badge type={shift.type} label={SHIFT_TYPE_LABELS[shift.type]} />
      </div>
      <div className={styles.time}>
        {shift.startTime} – {shift.endTime}
      </div>
      {shift.note && <p className={styles.note}>{shift.note}</p>}
      {showEditButton && (
        <div className={styles.footer}>
          {canEdit ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/employee/shifts/${shift.id}/edit`)}
            >
              Edit
            </Button>
          ) : (
            <span className={styles.locked}>Edit window closed</span>
          )}
        </div>
      )}
    </div>
  )
}
