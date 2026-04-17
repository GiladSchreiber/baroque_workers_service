import styles from './Card.module.scss'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={[styles.card, onClick ? styles.clickable : '', className ?? ''].join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
