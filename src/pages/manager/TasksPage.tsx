import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { TaskFormModal } from '../../components/modals/TaskFormModal'
import { TaskDetailModal } from '../../components/modals/TaskDetailModal'
import { useTasksStore } from '../../store/tasksStore'
import {
  TASK_URGENCY_LABELS,
  TASK_URGENCY_ORDER,
  type TaskItem,
  type TaskUrgency,
} from '../../types/tasks'
import styles from './TasksPage.module.scss'

type UrgencyFilter = 'all' | TaskUrgency
type StatusFilter = 'all' | 'open' | 'done'
type SortField = 'date' | 'urgency' | 'category'
type SortDir = 'asc' | 'desc'

function formatDateHe(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

export function TasksPage() {
  const { tasks, isLoading, fetchAll, toggleDone, getCategories } = useTasksStore()

  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<TaskItem | null>(null)

  const [filterUrgency, setFilterUrgency] = useState<UrgencyFilter>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => { fetchAll() }, [fetchAll])

  const categories = getCategories()

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

  const filtered = useMemo(() => {
    return tasks.filter(t =>
      (filterUrgency === 'all' || t.urgency === filterUrgency) &&
      (filterCategory === 'all' || t.category === filterCategory),
    )
  }, [tasks, filterUrgency, filterCategory])

  const openTasks = useMemo(() => sortTasks(filtered.filter(t => t.status === 'open')), [filtered, sortTasks])
  const doneTasks = useMemo(() => sortTasks(filtered.filter(t => t.status === 'done')), [filtered, sortTasks])

  const showOpen = filterStatus !== 'done'
  const showDone = filterStatus !== 'open'

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
        <button className={styles.itemBody} onClick={() => setSelected(task)}>
          <span className={styles.itemTitle}>{task.title}</span>
          <span className={styles.itemMeta}>
            <span className={`${styles.urgencyDot} ${styles[`u_${task.urgency}`]}`} />
            <span className={styles.metaText}>{TASK_URGENCY_LABELS[task.urgency]}</span>
            <span className={styles.metaSep}>·</span>
            <span className={styles.metaText}>{task.category}</span>
            <span className={styles.metaSep}>·</span>
            <span className={styles.metaText}>{formatDateHe(task.createdAt)}</span>
            {task.photo && <span className={styles.photoFlag}>📷</span>}
          </span>
        </button>
      </li>
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
        <Select
          id="filter-urgency"
          value={filterUrgency}
          onChange={e => setFilterUrgency(e.target.value as UrgencyFilter)}
          options={[
            { value: 'all', label: 'כל הדחיפויות' },
            { value: 'high', label: TASK_URGENCY_LABELS.high },
            { value: 'medium', label: TASK_URGENCY_LABELS.medium },
            { value: 'low', label: TASK_URGENCY_LABELS.low },
          ]}
        />
        <Select
          id="filter-category"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          options={[{ value: 'all', label: 'כל הקטגוריות' }, ...categories.map(c => ({ value: c, label: c }))]}
        />
        <Select
          id="filter-status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as StatusFilter)}
          options={[
            { value: 'all', label: 'הכל' },
            { value: 'open', label: 'פתוחות' },
            { value: 'done', label: 'בוצעו' },
          ]}
        />
        <Select
          id="sort-field"
          value={sortField}
          onChange={e => setSortField(e.target.value as SortField)}
          options={[
            { value: 'date', label: 'מיון: תאריך' },
            { value: 'urgency', label: 'מיון: דחיפות' },
            { value: 'category', label: 'מיון: קטגוריה' },
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
          {showOpen && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>פתוחות ({openTasks.length})</h2>
              {openTasks.length === 0 ? (
                <p className={styles.sectionEmpty}>אין משימות פתוחות</p>
              ) : (
                <ul className={styles.list}>{openTasks.map(renderItem)}</ul>
              )}
            </section>
          )}

          {showDone && doneTasks.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>בוצעו ({doneTasks.length})</h2>
              <ul className={styles.list}>{doneTasks.map(renderItem)}</ul>
            </section>
          )}
        </div>
      )}

      <TaskFormModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <TaskDetailModal isOpen={selected !== null} task={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
