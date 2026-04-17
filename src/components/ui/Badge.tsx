import type { ShiftType } from '../../types'
import styles from './Badge.module.scss'

interface BadgeProps {
  type: ShiftType
  label: string
}

export function Badge({ type, label }: BadgeProps) {
  return <span className={[styles.badge, styles[type]].join(' ')}>{label}</span>
}
