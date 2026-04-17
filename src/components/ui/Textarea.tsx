import styles from './Textarea.module.scss'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <textarea
        id={id}
        className={[styles.textarea, error ? styles.hasError : '', className ?? ''].join(' ')}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
