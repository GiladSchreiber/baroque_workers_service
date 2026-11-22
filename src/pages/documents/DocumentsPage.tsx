import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { documentsRepo } from '../../repositories'
import {
  buildShareText,
  docTotals,
  formatDocDate,
  formatMoney,
  retentionCutoff,
  shouldPurgeFiles,
} from '../../lib/documents'
import { canShareFiles, downloadFile } from '../../lib/documentFiles'
import { DOC_TYPES, DOC_TYPE_LABELS, type SupplierDocument } from '../../types/documents'
import { DocumentsSubNav } from './DocumentsSubNav'
import styles from './Documents.module.scss'

type SentFilter = 'unsent' | 'sent' | 'all'

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 40) || 'מסמך'
}

function fileBaseName(doc: SupplierDocument) {
  return [doc.supplierName, DOC_TYPE_LABELS[doc.docType], doc.docNumber, doc.docDate]
    .filter(Boolean).map(s => safeName(String(s))).join('_')
}

/** Load all documents, first applying the retention policy: files are kept only for
 *  the current + previous month (and never deleted before being sent to the accountant). */
async function fetchDocuments(): Promise<SupplierDocument[]> {
  const all = await documentsRepo.getAll()
  const cutoff = retentionCutoff(new Date())
  const toPurge = all.filter(d => shouldPurgeFiles(d, cutoff))
  if (!toPurge.length) return all
  await documentsRepo.purgeFiles(toPurge)
  return documentsRepo.getAll()
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<SupplierDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [sentFilter, setSentFilter] = useState<SentFilter>('unsent')
  const [typeFilter, setTypeFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [issuesOnly, setIssuesOnly] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preparing, setPreparing] = useState(false)
  const [prepared, setPrepared] = useState<{ files: File[]; text: string; ids: string[] } | null>(null)
  const [confirmSent, setConfirmSent] = useState<string[] | null>(null)

  const load = useCallback(() =>
    fetchDocuments()
      .then(all => { setDocs(all); setError('') })
      .catch(err => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
      .finally(() => setLoading(false)), [])

  useEffect(() => { load() }, [load])

  const suppliers = useMemo(
    () => [...new Set(docs.map(d => d.supplierName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he')),
    [docs],
  )

  const filtered = useMemo(() => docs.filter(d => {
    if (sentFilter === 'unsent' && d.sentToAccountantAt) return false
    if (sentFilter === 'sent' && !d.sentToAccountantAt) return false
    if (typeFilter && d.docType !== typeFilter) return false
    if (supplierFilter && d.supplierName !== supplierFilter) return false
    const date = d.docDate ?? d.uploadedAt.slice(0, 10)
    if (fromDate && date < fromDate) return false
    if (toDate && date > toDate) return false
    if (issuesOnly && !d.hasIssues) return false
    return true
  }), [docs, sentFilter, typeFilter, supplierFilter, fromDate, toDate, issuesOnly])

  const selectedDocs = filtered.filter(d => selected.has(d.id))
  const allSelected = filtered.length > 0 && selectedDocs.length === filtered.length

  function toggle(id: string) {
    setPrepared(null)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setPrepared(null)
    setSelected(allSelected ? new Set() : new Set(filtered.map(d => d.id)))
  }

  // Step 1: download the files (async). Step 2 (separate tap) opens the share sheet —
  // iOS only allows navigator.share() directly inside a user tap.
  async function prepareShare() {
    setPreparing(true)
    setError('')
    try {
      const withFiles = selectedDocs.filter(d => d.filePaths.length > 0)
      const files: File[] = []
      for (const d of withFiles) files.push(...await documentsRepo.downloadFiles(d, fileBaseName(d)))
      setPrepared({ files, text: buildShareText(withFiles), ids: withFiles.map(d => d.id) })
      if (withFiles.length < selectedDocs.length) {
        setError(`ל-${selectedDocs.length - withFiles.length} מסמכים אין קובץ שמור (נמחקו אחרי חודשיים) — הם לא יישלחו`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהכנת הקבצים')
    } finally {
      setPreparing(false)
    }
  }

  async function share() {
    if (!prepared) return
    try {
      if (canShareFiles(prepared.files)) {
        await navigator.share({ files: prepared.files, text: prepared.text })
      } else {
        // Desktop fallback: download the files and copy the summary text
        prepared.files.forEach(downloadFile)
        await navigator.clipboard?.writeText(prepared.text).catch(() => {})
        setError('הקבצים הורדו והסיכום הועתק — צרפו אותם ב-WhatsApp Web')
      }
      setConfirmSent(prepared.ids)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('השיתוף נכשל')
    }
  }

  async function markSent(ids: string[], sent: boolean) {
    await documentsRepo.setSent(ids, sent)
    setSelected(new Set())
    setPrepared(null)
    await load()
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="מסמכים"
        action={<button className={styles.addBtn} onClick={() => navigate('/manager/documents/new')} aria-label="העלאת מסמך">+</button>}
      />
      <DocumentsSubNav />

      <div className={styles.chips}>
        {(['unsent', 'sent', 'all'] as SentFilter[]).map(f => (
          <button
            key={f}
            className={`${styles.chip} ${sentFilter === f ? styles.chipActive : ''}`}
            onClick={() => setSentFilter(f)}
          >
            {f === 'unsent' ? 'לא נשלחו' : f === 'sent' ? 'נשלחו' : 'הכל'}
          </button>
        ))}
        <button
          className={`${styles.chip} ${issuesOnly ? styles.chipActive : ''}`}
          onClick={() => setIssuesOnly(v => !v)}
        >
          ⚠ עם חוסרים
        </button>
      </div>

      <div className={styles.filters}>
        <Select
          id="filter-type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          placeholder="כל הסוגים"
          options={DOC_TYPES.map(t => ({ value: t, label: DOC_TYPE_LABELS[t] }))}
        />
        <Select
          id="filter-supplier"
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
          placeholder="כל הספקים"
          options={suppliers.map(s => ({ value: s, label: s }))}
        />
        <Input id="filter-from" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} aria-label="מתאריך" />
        <Input id="filter-to" type="date" value={toDate} onChange={e => setToDate(e.target.value)} aria-label="עד תאריך" />
      </div>

      {error && <p className={styles.error} style={{ padding: '0.75rem 1rem 0' }}>{error}</p>}

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="אין מסמכים" description="לחצו על + כדי להעלות מסמך שהגיע במייל." />
      ) : (
        <>
          <div className={styles.listHeader}>
            <button className={styles.linkBtn} onClick={toggleAll}>
              {allSelected ? 'בטל בחירה' : `בחר הכל (${filtered.length})`}
            </button>
          </div>
          <ul className={styles.list} style={selected.size ? { paddingBottom: '7rem' } : undefined}>
            {filtered.map(d => {
              const t = docTotals(d)
              return (
                <li key={d.id} className={styles.docItem}>
                  <input
                    type="checkbox"
                    className={styles.docCheckbox}
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    aria-label="בחירה"
                  />
                  <button className={styles.docBody} onClick={() => navigate(`/manager/documents/${d.id}`)}>
                    <span className={styles.docTitle}>{d.supplierName || 'ללא ספק'}</span>
                    <span className={styles.docMeta}>
                      <span className={`${styles.badge} ${d.docType === 'credit_note' ? styles.badgeCredit : ''}`}>
                        {DOC_TYPE_LABELS[d.docType]}
                      </span>
                      {d.docNumber && <span>#{d.docNumber}</span>}
                      <span>{formatDocDate(d.docDate)}</span>
                      {d.hasIssues && <span className={`${styles.badge} ${styles.badgeIssue}`}>חוסרים</span>}
                      {d.notes && <span className={`${styles.badge} ${styles.badgeIssue}`}>הערה</span>}
                      {d.sentToAccountantAt && <span className={`${styles.badge} ${styles.badgeSent}`}>נשלח</span>}
                    </span>
                  </button>
                  <span className={styles.docAmount}>{t.withVat != null ? formatMoney(t.withVat) : ''}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {selectedDocs.length > 0 && (
        <div className={styles.selectionBar}>
          <p className={styles.muted}>נבחרו {selectedDocs.length} מסמכים</p>
          <div className={styles.actions}>
            {prepared ? (
              <Button onClick={share}>שליחה ב-WhatsApp ({prepared.files.length} קבצים)</Button>
            ) : (
              <Button onClick={prepareShare} isLoading={preparing}>הכנה לשליחה לרו״ח</Button>
            )}
            {selectedDocs.some(d => d.sentToAccountantAt) ? (
              <Button variant="ghost" onClick={() => markSent(selectedDocs.map(d => d.id), false)}>סמן כלא נשלח</Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmSent(selectedDocs.map(d => d.id))}>סמן כנשלח</Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmSent !== null}
        title="לסמן כנשלח לרו״ח?"
        message={confirmSent ? `${confirmSent.length} מסמכים יסומנו כנשלחו.` : undefined}
        confirmLabel="כן, נשלח"
        cancelLabel="לא"
        variant="primary"
        onConfirm={() => { const ids = confirmSent!; setConfirmSent(null); markSent(ids, true) }}
        onCancel={() => setConfirmSent(null)}
      />
    </div>
  )
}
