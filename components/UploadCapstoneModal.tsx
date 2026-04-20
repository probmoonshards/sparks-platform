'use client'
import { useRef, useState, useEffect } from 'react'
import { Upload, X, Check, Zap } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { ACCEPTED_TYPES, SCHOOL_YEARS, fileExt, formatBytes } from '@/lib/constants'
import { useToast } from './Toast'

type Props = { onClose: () => void; onDone: () => void }

export default function UploadCapstoneModal({ onClose, onDone }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: '', author: '', projectType: '', schoolYear: '', desc: '' })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [drag, setDrag] = useState(false)
  const [visible, setVisible] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  function addFiles(fl: FileList | null) {
    if (!fl) return
    setFiles(p => [...p, ...Array.from(fl).filter(f => !p.find(x => x.name === f.name))])
  }

  async function submit() {
    if (!form.title || !form.projectType || !form.schoolYear) { toast('Please fill required fields', 'error'); return }
    if (!files.length) { toast('Please add at least one file', 'error'); return }
    setLoading(true)
    try {
      const { data: cap, error: ce } = await sb.from('capstones')
        .insert({ title: form.title, author_name: form.author, project_type: form.projectType, school_year: form.schoolYear, description: form.desc })
        .select().single()
      if (ce) throw ce
      for (const f of files) {
        const key = `capstones/${cap.id}/${Date.now()}_${f.name}`
        const { error: ue } = await sb.storage.from('sparks-files').upload(key, f, { upsert: true })
        if (ue) throw ue
        const { data: { publicUrl } } = sb.storage.from('sparks-files').getPublicUrl(key)
        await sb.from('capstone_files').insert({ capstone_id: cap.id, file_name: f.name, file_key: key, file_size: f.size, mime_type: f.type, url: publicUrl })
      }
      setSuccess(true)
      toast('Research uploaded!', 'success')
      setTimeout(() => { onDone(); onClose() }, 1800)
    } catch (e: unknown) {
      toast('Upload failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
      setLoading(false)
    }
  }

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(110%)',
    transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    maxWidth: 760,
    background: 'var(--card)',
    borderRadius: '20px 20px 0 0',
    border: '1.5px solid var(--border)',
    borderBottom: 'none',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
    zIndex: 500,
    maxHeight: '90vh',
    overflowY: 'auto',
  }

  if (success) return (
    <div style={{ ...panelStyle, transform: 'translateX(-50%) translateY(0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '56px 48px', maxHeight: 300 }}>
      <div className="success-icon"><Check size={32} /></div>
      <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Research uploaded!</div>
      <div style={{ fontSize: 15, color: 'var(--text3)' }}>Amazing work! 🎉</div>
    </div>
  )

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 499,
          background: 'rgba(0,0,0,0.25)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.32s ease',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '16px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={20} /> Upload Research
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleClose} disabled={loading}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 32px' }}>
          <div className="form-group">
            <label className="form-label">Project Title <span className="form-required">*</span></label>
            <input className="form-input" placeholder="e.g., SPARKS: Implementation of a Digital Notes Platform..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label">Author Name</label>
            <input className="form-input" placeholder="Your name" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} disabled={loading} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Project Type <span className="form-required">*</span></label>
              <select className="form-input select" value={form.projectType} onChange={e => setForm(p => ({ ...p, projectType: e.target.value }))} disabled={loading}>
                <option value="">Select type</option>
                {['Capstone', 'SIP', 'Research'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">School Year <span className="form-required">*</span></label>
              <select className="form-input select" value={form.schoolYear} onChange={e => setForm(p => ({ ...p, schoolYear: e.target.value }))} disabled={loading}>
                <option value="">Select year</option>
                {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" placeholder="anything u wanna say to whoever's reading" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} disabled={loading} />
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
              <div className="dropzone-sub">PDF, DOCX, PPTX, images and more</div>
            </div>
            <input ref={fileRef} type="file" multiple accept={ACCEPTED_TYPES} style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            {files.length > 0 && (
              <div className="file-list">
                {files.map((f, i) => (
                  <div key={i} className="file-item">
                    <div className="file-type">{fileExt(f.name)}</div>
                    <div className="file-item-name">{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{formatBytes(f.size)}</div>
                    {!loading && <button className="remove-btn" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><X size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
            {loading && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--grade9-bg)', border: '1.5px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 16, height: 16, borderWidth: 2 }} />
                Uploading files to cloud storage...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 24, marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={handleClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? <span className="spinner" /> : <Upload size={16} />}
              {' '}{loading ? 'Uploading...' : 'Upload Research'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
