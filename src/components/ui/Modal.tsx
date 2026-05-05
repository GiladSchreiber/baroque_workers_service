import { createPortal } from 'react-dom'
import styles from './ConfirmDialog.module.scss'

interface Props {
  isOpen: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ isOpen, title, subtitle, onClose, children }: Props) {
  if (!isOpen) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()} style={{ minWidth: '18rem' }}>
        <div className={styles.titleRow}>
          <p className={styles.title}>
            {title}
            {subtitle && <span className={styles.titleSub}>{subtitle}</span>}
          </p>
          <button className={styles.closeBtn} onClick={onClose} aria-label="סגור">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
