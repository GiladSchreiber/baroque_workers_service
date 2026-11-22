import { RECEIVED_LABELS, type DocumentLine, type ReceivedStatus } from '../../types/documents'
import styles from './Documents.module.scss'

interface Props {
  lines: DocumentLine[]
  onChange: (lines: DocumentLine[]) => void
  highlightUnset?: boolean
}

const STATUSES: ReceivedStatus[] = ['ok', 'partial', 'missing']

export function ReceivingChecklist({ lines, onChange, highlightUnset }: Props) {
  function update(i: number, patch: Partial<DocumentLine>) {
    onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  return (
    <>
      <button
        type="button"
        className={styles.linkBtn}
        onClick={() => onChange(lines.map(l => (l.receivedStatus ? l : { ...l, receivedStatus: 'ok' })))}
      >
        ✓ סמן את כל השאר כ"הגיע"
      </button>
      <ul className={styles.checkList}>
        {lines.map((line, i) => (
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
