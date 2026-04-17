import styles from './Input.module.scss'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input
        id={id}
        className={[styles.input, error ? styles.hasError : '', className ?? ''].join(' ')}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
