import { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { useTasksStore } from '../../store/tasksStore'
import { useAuthStore } from '../../store/authStore'
import { fileToCompressedDataUrl } from '../../lib/image'
import { TASK_URGENCY_LABELS, type TaskUrgency } from '../../types/tasks'
import styles from './TaskFormModal.module.scss'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const URGENCY_OPTIONS = (['high', 'medium', 'low'] as TaskUrgency[]).map(u => ({
  value: u,
  label: TASK_URGENCY_LABELS[u],
}))

export function TaskFormModal({ isOpen, onClose }: Props) {
  const { create, getCategories, addCategory } = useTasksStore()
  const currentUser = useAuthStore(s => s.currentUser)
  const categories = getCategories()

  const [title, setTitle] = useState('')
  const [urgency, setUrgency] = useState<TaskUrgency>('medium')
  const [category, setCategory] = useState(categories[0] ?? '')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle('')
    setUrgency('medium')
    setCategory(getCategories()[0] ?? '')
    setDescription('')
    setPhoto(undefined)
    setAddingCategory(false)
    setNewCategory('')
    setError('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setError('')
    try {
      setPhoto(await fileToCompressedDataUrl(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת התמונה')
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleAddCategory() {
    const name = newCategory.trim()
    if (!name) return
    try {
      await addCategory(name)
      setCategory(name)
      setNewCategory('')
      setAddingCategory(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת קטגוריה')
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('יש להזין שם משימה'); return }
    if (!category) { setError('יש לבחור קטגוריה'); return }
    setError('')
    setIsLoading(true)
    try {
      await create({
        title: title.trim(),
        urgency,
        category,
        description: description.trim() || undefined,
        photo,
        createdById: currentUser?.id ?? '',
        createdByName: currentUser?.name ?? '',
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} title="משימה חדשה" onClose={onClose}>
      <div className={styles.form}>
        <Input
          label="שם המשימה"
          id="task-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="למשל: כיסא שבור בפינה"
        />

        <Select
          label="דחיפות"
          id="task-urgency"
          value={urgency}
          onChange={e => setUrgency(e.target.value as TaskUrgency)}
          options={URGENCY_OPTIONS}
        />

        {addingCategory ? (
          <div className={styles.newCategoryRow}>
            <Input
              label="קטגוריה חדשה"
              id="task-new-category"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="שם הקטגוריה"
            />
            <div className={styles.newCategoryActions}>
              <Button size="sm" onClick={handleAddCategory}>הוסף</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCategory('') }}>ביטול</Button>
            </div>
          </div>
        ) : (
          <div className={styles.categoryRow}>
            <Select
              label="קטגוריה"
              id="task-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              options={categories.map(c => ({ value: c, label: c }))}
              placeholder={categories.length ? undefined : 'אין קטגוריות'}
            />
            <button type="button" className={styles.addCategoryBtn} onClick={() => setAddingCategory(true)} aria-label="הוסף קטגוריה">+</button>
          </div>
        )}

        <Textarea
          label="תיאור (אופציונלי)"
          id="task-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="פרטים נוספים…"
        />

        <div className={styles.photoBlock}>
          <span className={styles.photoLabel}>תמונה (אופציונלי)</span>
          {photo ? (
            <div className={styles.photoPreview}>
              <img src={photo} alt="תצוגה מקדימה" />
              <button type="button" className={styles.removePhoto} onClick={() => setPhoto(undefined)} aria-label="הסר תמונה">✕</button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => fileRef.current?.click()}
              disabled={photoLoading}
            >
              {photoLoading ? 'טוען…' : '📷 העלאת תמונה'}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handlePhotoChange}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button onClick={handleSave} isLoading={isLoading}>שמור</Button>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
        </div>
      </div>
    </Modal>
  )
}
