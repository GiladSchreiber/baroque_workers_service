import { createPortal } from 'react-dom'
import styles from './ConfirmDialog.module.scss'

interface Props {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ isOpen, title, onClose, children }: Props) {
  if (!isOpen) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()} style={{ minWidth: '18rem' }}>
        <p className={styles.title}>{title}</p>
        {children}
      </div>
    </div>,
    document.body,
  )
}
