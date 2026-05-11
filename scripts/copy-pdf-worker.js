// Copies the pdfjs-dist worker into /public so it can be served locally.
// Runs automatically after npm install and before npm run build.
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs')

if (fs.existsSync(src)) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log('✓ PDF worker copied to /public/pdf.worker.min.mjs')
} else {
  console.warn('⚠ PDF worker not found at:', src)
}
