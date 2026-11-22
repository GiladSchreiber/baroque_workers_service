// Self-host OCR assets: document pixels never leave the browser for orientation
// detection. Generated files are copied into dist by Vite, not committed.
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const target = fileURLToPath(new URL('../public/document-ocr/', import.meta.url))
await mkdir(target, { recursive: true })
const core = path.dirname(require.resolve('tesseract.js-core/package.json'))
for (const name of await readdir(core)) {
  if (name.endsWith('.wasm.js')) await copyFile(path.join(core, name), path.join(target, name))
}
await copyFile(require.resolve('tesseract.js/dist/worker.min.js'), path.join(target, 'worker.min.js'))
await copyFile(require.resolve('tesseract.js/dist/worker.min.js.LICENSE.txt'), path.join(target, 'worker.min.js.LICENSE.txt'))
await copyFile(require.resolve('tesseract.js/LICENSE.md'), path.join(target, 'LICENSE-tesseract.js'))
const osd = path.dirname(require.resolve('@tesseract.js-data/osd/package.json'))
await copyFile(path.join(osd, '4.0.0/osd.traineddata.gz'), path.join(target, 'osd.traineddata.gz'))
await copyFile(path.join(core, 'LICENSE'), path.join(target, 'LICENSE-tesseract-core'))
