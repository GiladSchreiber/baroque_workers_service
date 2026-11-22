import { RECEIVED_LABELS, type DocumentLine, type ReceivedStatus } from '../../types/documents'
import { isChecklistLine } from '../../lib/documents'
import styles from './Documents.module.scss'

interface Props {
  lines: DocumentLine[]
  onChange: (lines: DocumentLine[]) => void
  highlightUnset?: boolean
  title: string
}

const STATUSES: ReceivedStatus[] = ['ok', 'partial', 'missing']

export function ReceivingChecklist({ lines, onChange, highlightUnset, title }: Props) {
  const allMarked = lines.every(l => !isChecklistLine(l) || l.receivedStatus)

  function update(i: number, patch: Partial<DocumentLine>) {
    onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  return (
    <>
      <div className={styles.checkHeader}>
        <p className={styles.cardTitle}>{title}</p>
        <button
          type="button"
          className={`${styles.markAllBtn} ${allMarked ? styles.markAllDone : ''}`}
          onClick={() => onChange(lines.map(l => (l.receivedStatus || !isChecklistLine(l) ? l : { ...l, receivedStatus: 'ok' })))}
          aria-label="סמן את כל השאר כהגיע"
          title="סמן את כל השאר כהגיע"
        >
          V
        </button>
      </div>
      <ul className={styles.checkList}>
        {lines.map((line, i) => isChecklistLine(line) && (
          <li
            key={i}
            className={`${styles.checkItem} ${highlightUnset && !line.receivedStatus ? styles.checkItemUnset : ''}`}
          >
            <div className={styles.checkHead}>
              <span className={styles.checkName}>{line.description}</span>
              {line.quantity != null && (
                <span className={styles.checkQty}>{line.quantity} {line.unit ?? ''}</span>
              )}
            </div>
            <div className={styles.statusBtns}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.statusBtn} ${styles[`status_${s}`]} ${line.receivedStatus === s ? styles.statusActive : ''}`}
                  onClick={() => update(i, { receivedStatus: s, receivedNote: s === 'ok' ? '' : line.receivedNote })}
                >
                  {RECEIVED_LABELS[s]}
                </button>
              ))}
            </div>
            {(line.receivedStatus === 'partial' || line.receivedStatus === 'missing') && (
              <input
                className={styles.noteInput}
                value={line.receivedNote}
                onChange={e => update(i, { receivedNote: e.target.value })}
                placeholder={line.receivedStatus === 'partial' ? 'כמה הגיע? הערה…' : 'הערה (אופציונלי)'}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
