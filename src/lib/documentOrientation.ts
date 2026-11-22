import type { DetectData } from 'tesseract.js'

// OSD confidence is a score, not a probability. Leave sparse/unclear text
// unchanged. Only quarter-turns are relevant to landscape.
export function landscapeCorrection(data: Pick<DetectData, 'orientation_degrees' | 'orientation_confidence'>): 0 | 90 | 270 {
  const { orientation_degrees: degrees, orientation_confidence: confidence } = data
  if (confidence == null || !Number.isFinite(confidence) || confidence < 5) return 0
  // Tesseract.js returns the corrective clockwise angle (unlike CLI OSD's
  // "Orientation in degrees" field). Do not invert it.
  return degrees === 90 || degrees === 270 ? degrees : 0
}

let queue = Promise.resolve()

/** Local OCR only; called lazily for landscape images, one worker at a time. */
export function detectLandscapeRotation(blob: Blob): Promise<0 | 90 | 270> {
  const result = queue.then(async () => {
    let worker: import('tesseract.js').Worker | undefined
    let finished = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const { createWorker } = await import('tesseract.js')
      return await Promise.race([
        (async () => {
          const base = new URL(`${import.meta.env.BASE_URL}document-ocr/`, window.location.origin).href
          const created = await createWorker('osd', 0, {
            workerPath: `${base}worker.min.js`, corePath: base,
            langPath: base.replace(/\/$/, ''), legacyCore: true, legacyLang: true,
            // Errors are handled by the rejected job below.
            errorHandler: () => {},
          })
          if (finished) { await created.terminate(); return 0 as const }
          worker = created
          return landscapeCorrection((await worker.detect(blob)).data)
        })(),
        new Promise<0>(resolve => { timeout = setTimeout(() => resolve(0), 30_000) }),
      ])
    } catch {
      // Offline, unsupported WASM or too little text: retain the original
      // rather than preventing a document upload.
      return 0 as const
    } finally {
      finished = true
      clearTimeout(timeout)
      await worker?.terminate().catch(() => {})
    }
  })
  queue = result.then(() => {}, () => {})
  return result
}
