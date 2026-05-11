'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Check, Zap, ArrowLeft, Copy } from 'lucide-react'
import Link from 'next/link'
import { sb } from '@/lib/supabase'
import { ACCEPTED_TYPES, MONTHS, PUB_YEARS, RESEARCH_DESIGNS, getSession, fileExt, formatBytes, fileTypeColor, buildAPA } from '@/lib/constants'
import { useToast } from '@/components/Toast'
import { useCache } from '@/components/CacheContext'

export default function UploadPaperPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isOnline } = useCache()
  const [form, setForm] = useState({
    title: '', author: '', members: '',
    projectType: '', pubMonth: '', pubYear: '',
    researchDesign: '',
    desc: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successId, setSuccessId] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
  }, [router])

  useEffect(() => {
    if (!isOnline) { toast('You\'re offline — you can\'t js upload!', 'error'); router.push('/capstones') }
  }, [isOnline, router, toast])

  const MAX_FILE_SIZE = 115 * 1024 * 1024 // 115MB

  function addFiles(fl: FileList | null) {
    if (!fl) return
    const valid: File[] = []
    const tooBig: string[] = []
    Array.from(fl).forEach(f => {
      if (f.size > MAX_FILE_SIZE) tooBig.push(f.name)
      else if (!files.find(x => x.name === f.name)) valid.push(f)
    })
    if (tooBig.length) toast(`File too large (max 75MB): ${tooBig.join(', ')}`, 'error')
    if (valid.length) setFiles(p => [...p, ...valid])
  }

  // Build live APA preview
  const apaUrl = successId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/capstones/${successId}`
    : `[URL will appear after upload]`
  const apa = buildAPA({ authorName: form.author, members: form.members, pubYear: form.pubYear || 'YYYY', pubMonth: form.pubMonth || 'Month', title: form.title || 'Title', url: apaUrl })

  async function submit() {
    if (!form.title || !form.projectType || !form.pubMonth || !form.pubYear) {
      toast('you haven\'t filled everything up yet!', 'error'); return
    }
    if (!files.length) { toast('atleast upload your paper itself bruh 🥀', 'error'); return }
    setLoading(true)
    try {
      const { data: cap, error: ce } = await sb.from('capstones')
        .insert({
          title: form.title,
          author_name: form.author,
          members: form.members,
          project_type: form.projectType,
          pub_month: form.pubMonth,
          pub_year: form.pubYear,
          research_design: form.researchDesign,
          description: form.desc,
        })
        .select().single()
      if (ce) throw new Error(ce.message)

      for (const f of files) {
        const key = `capstones/${cap.id}/${Date.now()}_${f.name}`
        const { error: ue } = await sb.storage.from('sparks-files').upload(key, f, { upsert: true })
        if (ue) throw new Error(ue.message)
        const { data: { publicUrl } } = sb.storage.from('sparks-files').getPublicUrl(key)
        const { error: ie } = await sb.from('capstone_files').insert({
          capstone_id: cap.id, file_name: f.name, file_key: key,
          file_size: f.size, mime_type: f.type, url: publicUrl,
        })
        if (ie) throw new Error(ie.message)
      }

      setSuccessId(cap.id)
      setSuccess(true)
      toast('Research uploaded!', 'success')
      setTimeout(() => router.push('/capstones'), 4000)
    } catch (e: unknown) {
      toast('Upload failed, report to an admin: ' + (e instanceof Error ? e.message : String(e)), 'error')
      setLoading(false)
    }
  }

  if (success) {
    const finalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/capstones/${successId}`
    const finalAPA = buildAPA({ authorName: form.author, members: form.members, pubYear: form.pubYear, pubMonth: form.pubMonth, title: form.title, url: finalUrl })
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '24px' }}>
        <div className="success-icon" style={{ width: 80, height: 80 }}><Check size={40} /></div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>Research uploaded!</div>
        <div style={{ fontSize: 16, color: 'var(--text3)' }}>Amazing work! 🎉</div>
        <div style={{ maxWidth: 600, width: '100%', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>APA 7th Citation</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, fontStyle: 'italic', background: 'var(--surface)', padding: '12px 16px', borderRadius: 8 }}>
            {finalAPA}
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => { navigator.clipboard.writeText(finalAPA); toast('Citation copied!', 'success') }}
          >
            <Copy size={13} /> Copy Citation
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Redirecting to research page...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1.5px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <Link href="/capstones" prefetch={false} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Zap size={18} /> Upload Research
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1.5px solid var(--border)', padding: '32px', boxShadow: 'var(--shadow)' }}>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Project Title <span className="form-required">*</span></label>
            <textarea
              className="form-input form-textarea"
              placeholder="e.g., SPARKS (SHARING PEER ACADEMIC RESOURCES AND KNOWLEDGE): THE IMPLEMENTATION OF A DIGITAL NOTES AND LECTURE ARCHIVAL PLATFORM AT THE PHILIPPINE SCHOOL ABU DHABI"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              disabled={loading}
              style={{ minHeight: 80 }}
            />
          </div>

          {/* Lead Author */}
          <div className="form-group">
            <label className="form-label">Uploader's name</label>
            <input className="form-input" placeholder="is optional, not really needed" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} disabled={loading} />
          </div>

          {/* Members */}
          <div className="form-group">
            <label className="form-label">Complete Members of Research <span className="form-required">*</span></label>
            <input className="form-input" placeholder="seperate names by comma! e.g., Marcus Raphael Aberis-Isuan, Magnus Kahn Santos, Seth Andrew Lina-Cordova" value={form.members} onChange={e => setForm(p => ({ ...p, members: e.target.value }))} disabled={loading} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Separate multiple members with commas</div>
          </div>

          {/* Type + Month + Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Subject <span className="form-required">*</span></label>
              <select className="form-input select" value={form.projectType} onChange={e => setForm(p => ({ ...p, projectType: e.target.value }))} disabled={loading}>
                <option value="">Select</option>
                {['Capstone', 'SIP', 'Research'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Month <span className="form-required">*</span></label>
              <select className="form-input select" value={form.pubMonth} onChange={e => setForm(p => ({ ...p, pubMonth: e.target.value }))} disabled={loading}>
                <option value="">Month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year <span className="form-required">*</span></label>
              <select className="form-input select" value={form.pubYear} onChange={e => setForm(p => ({ ...p, pubYear: e.target.value }))} disabled={loading}>
                <option value="">Year</option>
                {PUB_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Research Design */}
          <div className="form-group">
            <label className="form-label">Research Design Type <span className="form-required">*</span></label>
            <select className="form-input select" value={form.researchDesign} onChange={e => setForm(p => ({ ...p, researchDesign: e.target.value }))} disabled={loading}>
              <option value="">Select design</option>
              {RESEARCH_DESIGNS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" placeholder="anything u wanna say to whoever&apos;s reading" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} disabled={loading} />
          </div>

          {/* APA Preview */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Generated APA 7th Citation for your paper</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { navigator.clipboard.writeText(apa); toast('Copied!', 'info') }}
                type="button"
              >
                <Copy size={11} /> Copy
              </button>
            </label>
            <div style={{
              fontSize: 12, color: 'var(--text3)', lineHeight: 1.8,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', fontStyle: 'italic',
              userSelect: 'all',
            }}>
              {apa}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Will auto-generate from your inputs. URL will update after upload!
            </div>
          </div>

          {/* Files */}
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
            {loading ? <><span className="spinner" /> Uploading...</> : <><Upload size={16} /> Upload Research</>}
          </button>
        </div>
      </div>
    </div>
  )
}
