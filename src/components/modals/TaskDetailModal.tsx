import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useTasksStore } from '../../store/tasksStore'
import { TASK_URGENCY_LABELS, type TaskItem } from '../../types/tasks'
import styles from './TaskDetailModal.module.scss'

interface Props {
  isOpen: boolean
  task: TaskItem | null
  onClose: () => void
}

function formatDateTimeHe(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

export function TaskDetailModal({ isOpen, task, onClose }: Props) {
  const { toggleDone } = useTasksStore()
  const [isWorking, setIsWorking] = useState(false)
  const [zoomPhoto, setZoomPhoto] = useState(false)

  if (!task) return null

  async function handleToggle() {
    if (!task) return
    setIsWorking(true)
    try { await toggleDone(task.id) } finally { setIsWorking(false) }
    onClose()
  }

  const isDone = task.status === 'done'

  return (
    <Modal isOpen={isOpen} title={task.title} onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={`${styles.urgency} ${styles[`u_${task.urgency}`]}`}>
            {TASK_URGENCY_LABELS[task.urgency]}
          </span>
          <span className={styles.category}>{task.category}</span>
          {isDone && <span className={styles.doneBadge}>בוצע</span>}
        </div>

        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>נוצר ע״י</dt>
            <dd>{task.createdByName || '—'}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>תאריך</dt>
            <dd>{formatDateTimeHe(task.createdAt)}</dd>
          </div>
          {isDone && task.doneAt && (
            <div className={styles.detailRow}>
              <dt>בוצע בתאריך</dt>
              <dd>{formatDateTimeHe(task.doneAt)}</dd>
            </div>
          )}
        </dl>

        {task.description && (
          <div className={styles.description}>
            <span className={styles.sectionLabel}>תיאור</span>
            <p>{task.description}</p>
          </div>
        )}

        {task.photo && (
          <div className={styles.photoWrap}>
            <img
              src={task.photo}
              alt={task.title}
              className={styles.photo}
              onClick={() => setZoomPhoto(true)}
            />
          </div>
        )}

        <div className={styles.actions}>
          <Button onClick={handleToggle} isLoading={isWorking}>
            {isDone ? 'החזר לפתוחות' : 'סמן כבוצע'}
          </Button>
        </div>
      </div>

      {zoomPhoto && task.photo && (
        <div className={styles.zoomOverlay} onClick={() => setZoomPhoto(false)}>
          <img src={task.photo} alt={task.title} />
        </div>
      )}
    </Modal>
  )
}
