import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TaskFormModal } from '../../components/modals/TaskFormModal'
import { TaskDetailModal } from '../../components/modals/TaskDetailModal'
import { useTasksStore } from '../../store/tasksStore'
import {
  TASK_URGENCY_LABELS,
  TASK_URGENCY_ORDER,
  type TaskItem,
} from '../../types/tasks'
import styles from './TasksPage.module.scss'

type SortField = 'date' | 'urgency' | 'category'
type SortDir = 'asc' | 'desc'

function formatDateHe(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

export function TasksPage() {
  const { tasks, isLoading, fetchAll, toggleDone, remove } = useTasksStore()

  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<TaskItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TaskItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [openExpanded, setOpenExpanded] = useState(true)
  const [doneExpanded, setDoneExpanded] = useState(false)

  // Hidden delete: a 2s long-press on a task opens a delete confirmation.
  const pressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  useEffect(() => { fetchAll() }, [fetchAll])

  function startPress(task: TaskItem) {
    longPressFired.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      setConfirmDelete(task)
    }, 2000)
  }

  function cancelPress() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handleItemClick(task: TaskItem) {
    // Suppress the click that follows a completed long-press.
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    setSelected(task)
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await remove(confirmDelete.id)
      if (selected?.id === confirmDelete.id) setSelected(null)
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }

  const sortTasks = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return (list: TaskItem[]) =>
      [...list].sort((a, b) => {
        let cmp = 0
        if (sortField === 'date') cmp = a.createdAt.localeCompare(b.createdAt)
        else if (sortField === 'urgency') cmp = TASK_URGENCY_ORDER[a.urgency] - TASK_URGENCY_ORDER[b.urgency]
        else cmp = a.category.localeCompare(b.category, 'he')
        if (cmp === 0) cmp = a.createdAt.localeCompare(b.createdAt)
        return cmp * dir
      })
  }, [sortField, sortDir])

  const openTasks = useMemo(() => sortTasks(tasks.filter(t => t.status === 'open')), [tasks, sortTasks])
  const doneTasks = useMemo(() => sortTasks(tasks.filter(t => t.status === 'done')), [tasks, sortTasks])

  function renderItem(task: TaskItem) {
    const done = task.status === 'done'
    return (
      <li key={task.id} className={`${styles.item} ${done ? styles.itemDone : ''}`}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={done}
          onChange={() => toggleDone(task.id)}
          onClick={e => e.stopPropagation()}
          aria-label={done ? 'החזר לפתוחות' : 'סמן כבוצע'}
        />
        <button
          className={styles.itemBody}
          onClick={() => handleItemClick(task)}
          onPointerDown={() => startPress(task)}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={e => e.preventDefault()}
        >
          <span className={styles.itemTitle}>{task.title}</span>
          <span className={styles.itemMeta}>
            <span className={`${styles.urgencyDot} ${styles[`u_${task.urgency}`]}`} />
            <span className={styles.metaText}>{TASK_URGENCY_LABELS[task.urgency]}</span>
            <span className={styles.metaSep}>·</span>
            <span className={styles.metaText}>{formatDateHe(task.createdAt)}</span>
          </span>
        </button>
        <span className={styles.categoryBadge}>{task.category}</span>
      </li>
    )
  }

  function renderSection(title: string, list: TaskItem[], expanded: boolean, toggle: () => void, emptyText: string) {
    return (
      <section className={styles.section}>
        <button className={styles.sectionHeader} onClick={toggle}>
          <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>▸</span>
          <span className={styles.sectionTitle}>{title} ({list.length})</span>
        </button>
        {expanded && (
          list.length === 0
            ? <p className={styles.sectionEmpty}>{emptyText}</p>
            : <ul className={styles.list}>{list.map(renderItem)}</ul>
        )}
      </section>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="משימות"
        action={
          <button className={styles.addBtn} onClick={() => setAddOpen(true)} aria-label="הוסף משימה">+</button>
        }
      />

      <div className={styles.toolbar}>
        <span className={styles.sortIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4v16M7 20l-3-3M7 20l3-3" />
            <path d="M13 6h8M13 12h5M13 18h2" />
          </svg>
        </span>
        <Select
          id="sort-field"
          value={sortField}
          onChange={e => setSortField(e.target.value as SortField)}
          options={[
            { value: 'date', label: 'תאריך' },
            { value: 'urgency', label: 'דחיפות' },
            { value: 'category', label: 'קטגוריה' },
          ]}
        />
        <button
          className={styles.sortDirBtn}
          onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
          aria-label="כיוון מיון"
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState title="אין משימות" description="לחצו על + כדי להוסיף משימה חדשה." />
      ) : (
        <div className={styles.lists}>
          {renderSection('פתוחות', openTasks, openExpanded, () => setOpenExpanded(v => !v), 'אין משימות פתוחות')}
          {renderSection('בוצעו', doneTasks, doneExpanded, () => setDoneExpanded(v => !v), 'אין משימות שבוצעו')}
        </div>
      )}

      <TaskFormModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <TaskDetailModal isOpen={selected !== null} task={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="למחוק את המשימה?"
        message={confirmDelete ? `"${confirmDelete.title}" תימחק לצמיתות.` : undefined}
        confirmLabel={isDeleting ? 'מוחק…' : 'מחק'}
        cancelLabel="ביטול"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
