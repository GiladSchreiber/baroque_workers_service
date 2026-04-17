import styles from './LoadingSpinner.module.scss'

export function LoadingSpinner() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner} />
    </div>
  )
}
