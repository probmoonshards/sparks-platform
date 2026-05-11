export const CLASSES = [
  'Grade 9-A Sheikh Al Nahyan',
  'Grade 9-B Sheikh Al Nuaimi',
  'Grade 10-A Honesty',
  'Grade 10-B Integrity',
  'Grade 11-A Perseverance',
  'Grade 11-B Persistence',
  'Grade 11-C Courage',
  'Grade 11-D Humility',
  'Grade 12-A Resiliency',
  'Grade 12-B Tolerance',
  'Grade 12-C Respect',
  'Grade 12-D Kindness',
]

export const SUBJECTS: Record<string, string[]> = {
  'Grade 9': ['English', 'Mathematics', 'Science', 'Filipino', 'Arabic'],
  'Grade 10': ['English', 'Mathematics', 'Science', 'Filipino', 'Arabic'],
  'Grade 11': [
    'Oral Communications',
    'Reading and Writing',
    'General Mathematics',
    'Statistics and Probability',
    'Pre-Calculus',
    'Basic Calculus',
    'General Chemistry',
    'General Chemistry 2',
  ],
  'Grade 12': [
    'English for Academic and Professional Purposes/21st Century Literature',
    'General Physics',
    'General Biology',
    'Work Immersion',
  ],
}

export const SCHOOL_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
]

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const PUB_YEARS = ['2022', '2023', '2024', '2025', '2026', '2027', '2028']

export const ACCEPTED_TYPES =
  '.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.gif,.webp'

export const ADMIN_PASSWORD = '352026'

export type Session = {
  firstName: string
  lastName: string
  className: string
  createdAt: string
}

export type NoteFile = {
  id: string
  note_id: string
  file_name: string
  file_key: string
  file_size: number
  mime_type: string
  url: string
  created_at: string
}

export const NOTE_TYPES = ['Student Notes/Assignments', 'Teacher Lectures']

export const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']

export const RESEARCH_DESIGNS = ['Quantitative', 'Qualitative', 'Experimental']

export type Note = {
  id: string
  title: string
  author_name: string
  grade: string
  subject: string
  school_year: string
  note_type: string
  quarter: string
  description: string
  created_at: string
  files?: NoteFile[]
}

export type CapstoneFile = {
  id: string
  capstone_id: string
  file_name: string
  file_key: string
  file_size: number
  mime_type: string
  url: string
  created_at: string
}

export type Capstone = {
  id: string
  title: string
  author_name: string
  members: string
  project_type: string
  pub_month: string
  pub_year: string
  research_design: string
  description: string
  created_at: string
  files?: CapstoneFile[]
}

// ── Colors ────────────────────────────────────────────────

export function gradeColors(grade: string) {
  const g = String(grade)
  if (g.includes('9'))  return { border: '#007400', bgVar: 'grade9',  pill: '#007400' }
  if (g.includes('10')) return { border: '#2563eb', bgVar: 'grade10', pill: '#2563eb' }
  if (g.includes('11')) return { border: '#b45309', bgVar: 'grade11', pill: '#b45309' }
  if (g.includes('12')) return { border: '#be185d', bgVar: 'grade12', pill: '#be185d' }
  return { border: '#2563eb', bgVar: 'grade10', pill: '#2563eb' }
}

export function capColors(type: string) {
  const t = (type || '').toLowerCase()
  if (t === 'capstone') return { pill: '#2563eb', label: 'cap' }
  if (t === 'sip')      return { pill: '#b45309', label: 'sip' }
  return                       { pill: '#be185d', label: 'res' }
}

/** Color-coded file type badge */
export function fileTypeColor(name: string): { bg: string; color: string } {
  const ext = (name || '').split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')  return { bg: '#fce8f0', color: '#be185d' }
  if (ext === 'docx' || ext === 'doc') return { bg: '#e8f0ff', color: '#2563eb' }
  if (ext === 'pptx' || ext === 'ppt') return { bg: '#fff8e8', color: '#b45309' }
  if (ext === 'xlsx' || ext === 'xls') return { bg: '#e8f5e8', color: '#007400' }
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return { bg: '#f3e8ff', color: '#7c3aed' }
  return { bg: 'var(--surface)', color: 'var(--text3)' }
}

export function fileExt(name: string) {
  return (name || '').split('.').pop()?.toUpperCase().slice(0, 4) ?? ''
}

export function formatBytes(b: number) {
  if (!b) return ''
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(0) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}

export function fmtDate(d: string) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return '' }
}

export function initials(f: string, l: string) {
  return ((f || '')[0] || '') + ((l || '')[0] || '')
}

/** Build APA 7th citation for a capstone */
export function buildAPA(params: {
  authorName: string
  members: string
  pubYear: string
  pubMonth: string
  title: string
  url: string
}): string {
  const { authorName, members, pubYear, pubMonth, title, url } = params

  // Collect all authors
  const allAuthors = [authorName, ...members.split(',').map(s => s.trim())].filter(Boolean)

  // Format: Last, F. I.
  function formatAuthor(name: string) {
    const parts = name.trim().split(' ')
    if (parts.length < 2) return name
    const last = parts[parts.length - 1]
    const initials = parts.slice(0, -1).map(p => p[0] ? p[0].toUpperCase() + '.' : '').join(' ')
    return `${last}, ${initials}`
  }

  const authorStr = allAuthors.map(formatAuthor).join(', ')

  // Sentence case title
  const sentenceTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()

  return `${authorStr} (${pubYear}, ${pubMonth}). ${sentenceTitle}. SPARKS Archival Platform. ${url}`
}

// ── Auth helpers ──────────────────────────────────────────

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('sparks_session') || 'null') }
  catch { return null }
}
export function setSession(s: Session) {
  localStorage.setItem('sparks_session', JSON.stringify(s))
}
export function clearSession() {
  localStorage.removeItem('sparks_session')
}
export function getAdmin() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('sparks_admin') === '1'
}
export function setAdmin() { localStorage.setItem('sparks_admin', '1') }
export function clearAdmin() { localStorage.removeItem('sparks_admin') }
export function getTheme() {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem('sparks_theme') || 'light'
}
export function saveTheme(t: string) {
  localStorage.setItem('sparks_theme', t)
}
