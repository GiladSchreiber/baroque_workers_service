import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ShiftForm } from '../forms/ShiftForm'
import { isWithinEditWindow, buildShiftMessage, formatEmployeeNameForMessage } from '../../lib/utils'
import { useShiftStore } from '../../store/shiftStore'
import { useAuthStore } from '../../store/authStore'
import { useEmployeeStore } from '../../store/employeeStore'
import type { Shift, CreateShiftInput } from '../../types'
import styles from './EditShiftModal.module.scss'

interface Props {
  shift: Shift | null
  onClose: () => void
}

export function EditShiftModal({ shift, onClose }: Props) {
  const currentUser = useAuthStore(s => s.currentUser)!
  const { updateShift } = useShiftStore()
  const employees = useEmployeeStore(s => s.employees)
  const [isLoading, setIsLoading] = useState(false)

  if (!shift) return null

  const canEdit = isWithinEditWindow(shift.submittedAt)

  async function handleSubmit(data: CreateShiftInput) {
    setIsLoading(true)
    try {
      const allNames = employees.filter(e => e.isActive).map(e => e.name)
      const displayName = formatEmployeeNameForMessage(currentUser.name, allNames)
      const clipboardWrite = navigator.clipboard.writeText(buildShiftMessage(data, displayName)).catch(() => {})
      await updateShift(shift!.id, data)
      await clipboardWrite
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen title="עריכת דיווח" onClose={onClose}>
      {canEdit ? (
        <ShiftForm
          employeeId={currentUser.id}
          initialValues={shift}
          onSubmit={handleSubmit}
          submitLabel={isLoading ? 'שומר...' : 'שמור שינויים'}
          isEdit
        />
      ) : (
        <div className={styles.closedWindow}>
          <p className={styles.closedTitle}>חלון העריכה נסגר</p>
          <p className={styles.closedSub}>ניתן לערוך דיווח רק בתוך 24 שעות מהגשתו.</p>
        </div>
      )}
    </Modal>
  )
}
