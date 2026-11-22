// Browser-side file handling for supplier documents: compression, base64,
// and sharing to WhatsApp via the Web Share API.

import type { PendingFile } from '../types/documents'

const MAX_PDF_BYTES = 10 * 1024 * 1024

/** Images are downscaled & re-encoded as JPEG (sharp enough for small print);
 *  PDFs are kept as-is. */
export async function prepareFile(file: File): Promise<PendingFile> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error('קובץ PDF גדול מדי (מקסימום 10MB)')
    return { blob: file, mimeType: file.type, previewUrl: URL.createObjectURL(file), name: file.name }
  }
  if (!file.type.startsWith('image/')) throw new Error('ניתן להעלות רק תמונה או PDF')
  const { blob, landscape } = await compressImage(file, 2000, 0.8)
  const prepared = {
    blob,
    mimeType: 'image/jpeg',
    previewUrl: URL.createObjectURL(blob),
    name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
  }
  if (landscape) {
    const { detectLandscapeRotation } = await import('./documentOrientation')
    const degrees = await detectLandscapeRotation(blob)
    if (degrees) {
      try {
        return await rotateFile(prepared, degrees)
      } finally {
        URL.revokeObjectURL(prepared.previewUrl)
      }
    }
  }
  return prepared
}

/** Decode in the camera's display orientation before canvas strips EXIF.
 *  Fall back to the browser's native image decoder on mobile browsers where
 *  createImageBitmap cannot decode a camera image. Do not apply EXIF twice. */
async function decodeImage(file: Blob) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
    } catch {
      URL.revokeObjectURL(url)
      throw new Error('לא ניתן לקרוא את התמונה. נסו לשמור אותה כ-JPEG ולהעלות שוב')
    }
  }
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('דחיסת התמונה נכשלה'))), 'image/jpeg', quality),
  )
}

async function compressImage(file: File, maxDim: number, quality: number) {
  const bitmap = await decodeImage(file)
  try {
    let { width, height } = bitmap
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('לא ניתן לעבד את התמונה')
    ctx.drawImage(bitmap.source, 0, 0, width, height)
    return { blob: await jpegBlob(canvas, quality), landscape: width > height }
  } finally {
    bitmap.close()
  }
}

/** Rotate the pixels sent to Gemini and saved in storage, not just the preview.
 *  Image shape alone cannot tell us which way the printed text should face. */
async function rotateFile(file: PendingFile, degrees: 90 | 270): Promise<PendingFile> {
  if (!file.mimeType.startsWith('image/')) return file
  const bitmap = await decodeImage(file.blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.height
    canvas.height = bitmap.width
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('לא ניתן לסובב את התמונה')
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(degrees * Math.PI / 180)
    ctx.drawImage(bitmap.source, -bitmap.width / 2, -bitmap.height / 2)
    const blob = await jpegBlob(canvas, 0.95)
    return { ...file, blob, mimeType: 'image/jpeg', previewUrl: URL.createObjectURL(blob) }
  } finally {
    bitmap.close()
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'))
    reader.readAsDataURL(blob)
  })
}

export function extensionFor(mimeType: string): string {
  return mimeType === 'application/pdf' ? 'pdf' : 'jpg'
}

export function canShareFiles(files: File[]): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files })
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
