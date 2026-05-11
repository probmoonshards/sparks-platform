'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Check, BookOpen, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { sb } from '@/lib/supabase'
import { SUBJECTS, SCHOOL_YEARS, ACCEPTED_TYPES, NOTE_TYPES, QUARTERS, getSession, fileExt, formatBytes, fileTypeColor } from '@/lib/constants'
import { useToast } from '@/components/Toast'
import { useCache } from '@/components/CacheContext'

export default function UploadNotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isOnline } = useCache()
  const [session, setSession] = useState<{ firstName: string; lastName: string } | null>(null)
  const [form, setForm] = useState({ title: '', author: '', grade: '', subject: '', schoolYear: '', noteType: '', quarter: '', desc: '' })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
    setSession(s)
    setForm(p => ({ ...p, author: `${s.firstName} ${s.lastName}` }))
  }, [router])

  // Redirect if offline
  useEffect(() => {
    if (!isOnline) { toast('You\'re offline - u can\'t js upload', 'error'); router.push('/'); }
  }, [isOnline, router, toast])

  const MAX_FILE_SIZE = 75 * 1024 * 1024 // 75MB

  function addFiles(fl: FileList | null) {
    if (!fl) return
    const valid: File[] = []
    const tooBig: string[] = []
    Array.from(fl).forEach(f => {
      if (f.size > MAX_FILE_SIZE) tooBig.push(f.name)
      else if (!files.find(x => x.name === f.name)) valid.push(f)
    })
    if (tooBig.length) toast(`ur file is too large! (max 75MB): ${tooBig.join(', ')}`, 'error')
    if (valid.length) setFiles(p => [...p, ...valid])
  }

  async function submit() {
    if (!form.title || !form.grade || !form.subject || !form.schoolYear || !form.noteType) { toast('you didn\'t fill everything up yet!', 'error'); return }
    if (!files.length) { toast('pls atleast add a file bro', 'error'); return }
    setLoading(true)
    try {
      const { data: note, error: ne } = await sb.from('notes')
        .insert({ title: form.title, author_name: form.author, grade: form.grade, subject: form.subject, school_year: form.schoolYear, note_type: form.noteType, quarter: form.quarter, description: form.desc })
        .select().single()
      if (ne) throw new Error(ne.message)
      for (const f of files) {
        const key = `notes/${note.id}/${Date.now()}_${f.name}`
        const { error: ue } = await sb.storage.from('sparks-files').upload(key, f, { upsert: true })
        if (ue) throw new Error(ue.message)
        const { data: { publicUrl } } = sb.storage.from('sparks-files').getPublicUrl(key)
        await sb.from('note_files').insert({ note_id: note.id, file_name: f.name, file_key: key, file_size: f.size, mime_type: f.type, url: publicUrl })
      }
      setSuccess(true)
      toast('Notes uploaded!', 'success')
      setTimeout(() => router.push('/'), 2000)
    } catch (e: unknown) {
      toast('Upload failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
      setLoading(false)
    }
  }

  const subjects = SUBJECTS[form.grade] || []

  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div className="success-icon" style={{ width: 80, height: 80 }}><Check size={40} /></div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>Notes uploaded!</div>
      <div style={{ fontSize: 16, color: 'var(--text3)' }}>Sharing knowledge ✨ — redirecting...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1.5px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <Link href="/" prefetch={false} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <BookOpen size={18} /> Share Notes
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1.5px solid var(--border)', padding: '32px', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>You can upload files here!</p>

          <div className="form-group">
            <label className="form-label">Note Title <span className="form-required">*</span></label>
            <input className="form-input" placeholder="e.g., Revision for pre-cal 2nd quarter" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Uploader's name</label>
            <input className="form-input" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} disabled={loading} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Grade Level <span className="form-required">*</span></label>
              <select className="form-input select" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value, subject: '' }))} disabled={loading}>
                <option value="">Select grade</option>
                {Object.keys(SUBJECTS).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject <span className="form-required">*</span></label>
              <select className="form-input select" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} disabled={!form.grade || loading}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">School Year <span className="form-required">*</span></label>
            <select className="form-input select" value={form.schoolYear} onChange={e => setForm(p => ({ ...p, schoolYear: e.target.value }))} disabled={loading}>
              <option value="">Select year</option>
              {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Student notes or Teacher lecture? <span className="form-required">*</span></label>
            <select className="form-input select" value={form.noteType} onChange={e => setForm(p => ({ ...p, noteType: e.target.value }))} disabled={loading}>
              <option value="">Select type</option>
              {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quarter Written <span className="form-required">*</span></label>
            <select className="form-input select" value={form.quarter} onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))} disabled={loading}>
              <option value="">Select quarter</option>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" placeholder="anything extra you wanna say..." value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Files <span className="form-required">*</span></label>
            <div
              className={`dropzone${drag ? ' drag' : ''}`}
              onClick={() => !loading && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); if (!loading) setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); if (!loading) addFiles(e.dataTransfer.files) }}
              style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <div style={{ color: 'var(--text3)', marginBottom: 4 }}><Upload size={28} /></div>
              <div className="dropzone-text">Drop files here or click to browse</div>
              <div className="dropzone-sub">Supports PDF, Images, DOCX, PPTX and more</div>
            </div>
            <input ref={fileRef} type="file" multiple accept={ACCEPTED_TYPES} style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            {files.length > 0 && (
              <div className="file-list" style={{ marginTop: 10 }}>
                {files.map((f, i) => {
                  const fc = fileTypeColor(f.name)
                  return (
                    <div key={i} className="file-item">
                      <div className="file-type" style={{ background: fc.bg, color: fc.color }}>{fileExt(f.name)}</div>
                      <div className="file-item-name">{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{formatBytes(f.size)}</div>
                      {!loading && <button className="remove-btn" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><X size={14} /></button>}
                    </div>
                  )
                })}
              </div>
            )}
            {loading && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--grade9-bg)', border: '1.5px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 16, height: 16, borderWidth: 2 }} />
                Uploading to cloud storage...
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
            {loading ? <><span className="spinner" /> Uploading...</> : <><Upload size={16} /> Upload Notes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
