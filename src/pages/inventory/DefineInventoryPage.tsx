import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useInventoryStore } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { InventoryItem } from '../../types/inventory'
import { InventorySubNav } from './FillInventoryPage'
import styles from './DefineInventoryPage.module.scss'

// ── Add / Edit item form ──────────────────────────────────────────────────────
interface ItemFormProps {
  existingCategories: string[]
  initial?: InventoryItem
  onSave: (name: string, category: string) => void
  onClose: () => void
}

function ItemForm({ existingCategories, initial, onSave, onClose }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? (existingCategories[0] ?? ''))
  const [newCat, setNewCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const effectiveCat = addingCat ? newCat : category

  function handleSave() {
    const trimName = name.trim()
    const trimCat = effectiveCat.trim()
    if (!trimName || !trimCat) return
    onSave(trimName, trimCat)
    onClose()
  }

  return (
    <div className={styles.form}>
      <input
        className={styles.formInput}
        placeholder="שם הפריט"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
        dir="rtl"
      />
      {addingCat ? (
        <input
          className={styles.formInput}
          placeholder="שם הקטגוריה החדשה"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          dir="rtl"
        />
      ) : (
        <select
          className={styles.formSelect}
          value={category}
          onChange={e => setCategory(e.target.value)}
          dir="rtl"
        >
          {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <button
        className={styles.toggleCatBtn}
        type="button"
        onClick={() => { setAddingCat(v => !v); setNewCat('') }}
      >
        {addingCat ? 'בחר קטגוריה קיימת' : '+ קטגוריה חדשה'}
      </button>
      <div className={styles.formActions}>
        <button className={styles.saveBtn} onClick={handleSave}>שמור</button>
        <button className={styles.cancelBtn} onClick={onClose}>ביטול</button>
      </div>
    </div>
  )
}

// ── Single item row ───────────────────────────────────────────────────────────
interface ItemRowProps {
  item: InventoryItem
  isDragging: boolean
  isOver: boolean
  existingCategories: string[]
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  onTouchHandleStart: (e: React.TouchEvent) => void
}

function ItemRow({ item, isDragging, isOver, existingCategories, onDragStart, onDragEnter, onDragEnd, onTouchHandleStart }: ItemRowProps) {
  const updateItem = useInventoryStore(s => s.updateItem)
  const deleteItem = useInventoryStore(s => s.deleteItem)
  const [editing, setEditing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const rowClass = [
    styles.itemRow,
    isDragging ? styles.rowDragging : '',
    isOver ? styles.rowOver : '',
  ].filter(Boolean).join(' ')

  if (editing) {
    return (
      <div className={styles.itemRow}>
        <ItemForm
          existingCategories={existingCategories}
          initial={item}
          onSave={(name, category) => updateItem(item.id, { name, category })}
          onClose={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <>
      <div
        className={rowClass}
        data-item-id={item.id}
        draggable
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
        onDragEnter={e => { e.preventDefault(); onDragEnter() }}
        onDragOver={e => e.preventDefault()}
        onDragEnd={onDragEnd}
      >
        <div
          className={styles.dragHandle}
          onTouchStart={onTouchHandleStart}
        >
          <DragIcon />
        </div>
        <span className={styles.itemName}>{item.name}</span>
        <div className={styles.itemActions}>
          <button
            className={styles.editBtn}
            onClick={e => { e.stopPropagation(); setEditing(true) }}
            aria-label="ערוך"
          >
            <EditIcon />
          </button>
          <button
            className={styles.deleteBtn}
            onClick={e => { e.stopPropagation(); setConfirmOpen(true) }}
            aria-label="מחק"
          >
            <XIcon />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="למחוק פריט?"
        message={`"${item.name}" יוסר לצמיתות מהרשימה.`}
        confirmLabel="מחק"
        onConfirm={() => { deleteItem(item.id); setConfirmOpen(false) }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({
  category,
  items,
  existingCategories,
}: {
  category: string
  items: InventoryItem[]
  existingCategories: string[]
}) {
  const reorderItems = useInventoryStore(s => s.reorderItems)
  const addItem = useInventoryStore(s => s.addItem)

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  )

  const [orderedIds, setOrderedIds] = useState<string[]>(() => sorted.map(i => i.id))
  const [addOpen, setAddOpen] = useState(false)
  const draggedId = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Track latest orderedIds in a ref so touch handlers always see current value
  const orderedIdsRef = useRef(orderedIds)
  useEffect(() => { orderedIdsRef.current = orderedIds }, [orderedIds])

  useEffect(() => {
    setOrderedIds(prev => {
      const ids = new Set(items.map(i => i.id))
      const filtered = prev.filter(id => ids.has(id))
      const added = items.filter(i => !filtered.includes(i.id)).map(i => i.id)
      return [...filtered, ...added]
    })
  }, [items])

  const orderedItems = orderedIds
    .map(id => items.find(i => i.id === id))
    .filter((i): i is InventoryItem => Boolean(i))

  function doReorder(fromId: string, targetId: string) {
    if (fromId === targetId) return
    setOverId(targetId)
    setOrderedIds(prev => {
      const from = prev.indexOf(fromId)
      const to = prev.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, fromId)
      return next
    })
  }

  function handleDragStart(id: string) {
    draggedId.current = id
    setDraggingId(id)
  }

  function handleDragEnter(targetId: string) {
    if (!draggedId.current) return
    doReorder(draggedId.current, targetId)
  }

  function finishDrag() {
    draggedId.current = null
    setDraggingId(null)
    setOverId(null)
    reorderItems(category, orderedIdsRef.current)
  }

  // ── Touch drag ──────────────────────────────────────────────────────────────
  const handleTouchHandleStart = useCallback((itemId: string) => (e: React.TouchEvent) => {
    e.preventDefault()
    draggedId.current = itemId
    setDraggingId(itemId)

    function onTouchMove(ev: TouchEvent) {
      ev.preventDefault()
      if (!draggedId.current) return
      const touch = ev.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const row = el?.closest('[data-item-id]') as HTMLElement | null
      const targetId = row?.dataset.itemId
      if (targetId && targetId !== draggedId.current) {
        // Update draggedId ref to the new position after splice
        const prevDragged = draggedId.current
        doReorder(prevDragged, targetId)
        draggedId.current = prevDragged
      }
    }

    function onTouchEnd() {
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      finishDrag()
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }, [category])

  return (
    <div className={styles.categorySection}>
      <div className={styles.categoryHeader}>
        <span className={styles.categoryName}>{category}</span>
        <button
          className={styles.addBtn}
          onClick={() => setAddOpen(v => !v)}
          aria-label="הוסף פריט"
        >
          <PlusIcon />
        </button>
      </div>
      <div className={styles.itemList}>
        {orderedItems.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            isDragging={draggingId === item.id}
            isOver={overId === item.id}
            existingCategories={existingCategories}
            onDragStart={() => handleDragStart(item.id)}
            onDragEnter={() => handleDragEnter(item.id)}
            onDragEnd={finishDrag}
            onTouchHandleStart={handleTouchHandleStart(item.id)}
          />
        ))}
        {addOpen && (
          <div className={styles.itemRow}>
            <ItemForm
              existingCategories={existingCategories}
              initial={{ id: '', name: '', category, sortOrder: items.length + 1, isActive: true }}
              onSave={(name, cat) => {
                addItem({ name, category: cat, sortOrder: items.length + 1, isActive: true })
              }}
              onClose={() => setAddOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Edit categories modal ─────────────────────────────────────────────────────
// Rendered conditionally — always freshly mounted so localOrder is always current.
function EditCategoriesModal({
  initialOrder,
  onClose,
}: {
  initialOrder: string[]
  onClose: () => void
}) {
  const addCategory = useInventoryStore(s => s.addCategory)
  const deleteCategory = useInventoryStore(s => s.deleteCategory)
  const setCategoryOrder = useInventoryStore(s => s.setCategoryOrder)
  const items = useInventoryStore(s => s.items)

  const [localOrder, setLocalOrder] = useState<string[]>(initialOrder)
  const [newCatName, setNewCatName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const draggedCat = useRef<string | null>(null)
  const [draggingCat, setDraggingCat] = useState<string | null>(null)
  const [overCat, setOverCat] = useState<string | null>(null)
  const localOrderRef = useRef<string[]>(initialOrder)

  useEffect(() => { localOrderRef.current = localOrder }, [localOrder])

  function doReorder(fromCat: string, targetCat: string) {
    if (fromCat === targetCat) return
    setOverCat(targetCat)
    setLocalOrder(prev => {
      const from = prev.indexOf(fromCat)
      const to = prev.indexOf(targetCat)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, fromCat)
      return next
    })
  }

  function handleDragStart(cat: string) {
    draggedCat.current = cat
    setDraggingCat(cat)
  }

  function handleDragEnter(targetCat: string) {
    if (!draggedCat.current) return
    doReorder(draggedCat.current, targetCat)
  }

  function finishDrag() {
    draggedCat.current = null
    setDraggingCat(null)
    setOverCat(null)
    setCategoryOrder(localOrderRef.current)
  }

  function handleTouchStart(cat: string) {
    return (e: React.TouchEvent) => {
      e.preventDefault()
      draggedCat.current = cat
      setDraggingCat(cat)

      function onMove(ev: TouchEvent) {
        ev.preventDefault()
        if (!draggedCat.current) return
        const touch = ev.touches[0]
        const el = document.elementFromPoint(touch.clientX, touch.clientY)
        const row = el?.closest('[data-cat-id]') as HTMLElement | null
        const targetCat = row?.dataset.catId
        if (targetCat && targetCat !== draggedCat.current) {
          const prev = draggedCat.current
          doReorder(prev, targetCat)
          draggedCat.current = prev
        }
      }

      function onEnd() {
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
        finishDrag()
      }

      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
    }
  }

  function handleAdd() {
    const name = newCatName.trim()
    if (!name || localOrder.includes(name)) return
    addCategory(name)
    setLocalOrder(prev => [...prev, name])
    setNewCatName('')
  }

  function handleDelete(cat: string) {
    const count = items.filter(i => i.category === cat).length
    if (count > 0) {
      setConfirmDelete(cat)
    } else {
      deleteCategory(cat)
      setLocalOrder(prev => prev.filter(c => c !== cat))
    }
  }

  function confirmDeleteCat() {
    if (!confirmDelete) return
    deleteCategory(confirmDelete)
    setLocalOrder(prev => prev.filter(c => c !== confirmDelete))
    setConfirmDelete(null)
  }

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>ערוך רשימת קטגוריות</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.catList}>
          {localOrder.map(cat => (
            <div
              key={cat}
              data-cat-id={cat}
              className={[
                styles.catRow,
                draggingCat === cat ? styles.catDragging : '',
                overCat === cat ? styles.catOver : '',
              ].filter(Boolean).join(' ')}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; handleDragStart(cat) }}
              onDragEnter={e => { e.preventDefault(); handleDragEnter(cat) }}
              onDragOver={e => e.preventDefault()}
              onDragEnd={finishDrag}
            >
              <div
                className={styles.catDragHandle}
                onTouchStart={handleTouchStart(cat)}
              >
                <DragIcon />
              </div>
              <span className={styles.catName}>{cat}</span>
              <button
                className={styles.catDeleteBtn}
                onClick={() => handleDelete(cat)}
                aria-label={`מחק קטגוריה ${cat}`}
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.addCatRow}>
          <input
            className={styles.addCatInput}
            placeholder="שם קטגוריה חדשה"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            dir="rtl"
          />
          <button className={styles.addCatConfirmBtn} onClick={handleAdd}>הוסף</button>
        </div>

        {confirmDelete && (
          <div className={styles.deleteWarning}>
            <p className={styles.deleteWarningText}>
              מחיקת "{confirmDelete}" תסיר גם את כל הפריטים שלה ({items.filter(i => i.category === confirmDelete).length} פריטים).
            </p>
            <div className={styles.deleteWarningActions}>
              <button className={styles.deleteConfirmBtn} onClick={confirmDeleteCat}>מחק הכל</button>
              <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(null)}>ביטול</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function DefineInventoryPage() {
  const items = useInventoryStore(s => s.items)
  const categoryOrder = useInventoryStore(s => s.categoryOrder)
  const fetchAll = useInventoryStore(s => s.fetchAll)

  useEffect(() => { fetchAll() }, [])

  const activeItems = useMemo(() => items.filter(i => i.isActive), [items])

  // All categories in stored order, plus any item-categories not yet in the order list
  const categories = useMemo(() => {
    const extra = Array.from(new Set(activeItems.map(i => i.category)))
      .filter(c => !categoryOrder.includes(c))
    return [...categoryOrder, ...extra]
  }, [activeItems, categoryOrder])

  const [editCatsOpen, setEditCatsOpen] = useState(false)

  return (
    <div className={styles.page}>
      <PageHeader title="מלאי" />
      <InventorySubNav active="define" />

      <div className={styles.content}>
        {categories.map(cat => (
          <CategorySection
            key={cat}
            category={cat}
            items={activeItems.filter(i => i.category === cat)}
            existingCategories={categories}
          />
        ))}

        <button
          className={styles.editCategoriesBtn}
          onClick={() => setEditCatsOpen(true)}
        >
          ערוך רשימת קטגוריות
        </button>
      </div>

      {editCatsOpen && (
        <EditCategoriesModal
          initialOrder={categories}
          onClose={() => setEditCatsOpen(false)}
        />
      )}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function DragIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4.5" cy="3.5" r="1.2" fill="currentColor"/>
      <circle cx="9.5" cy="3.5" r="1.2" fill="currentColor"/>
      <circle cx="4.5" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="9.5" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="4.5" cy="10.5" r="1.2" fill="currentColor"/>
      <circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}
