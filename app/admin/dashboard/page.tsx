'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Edit, Trash } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { getAdmin, clearAdmin, Note, Capstone, gradeColors, capColors, fmtDate, SUBJECTS, SCHOOL_YEARS } from '@/lib/constants'
import { useToast } from '@/components/Toast'

type StudentSession = { id: string; first_name: string; last_name: string; class_name: string; created_at: string }

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState<'notes' | 'users' | 'capstones'>('notes')
  const [notes, setNotes] = useState<Note[]>([])
  const [sessions, setSessions] = useState<StudentSession[]>([])
  const [caps, setCaps] = useState<Capstone[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [editCap, setEditCap] = useState<Capstone | null>(null)
  const [delConfirm, setDelConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!getAdmin()) { router.push('/admin'); return }
    loadAll()
  }, [router])

  async function loadAll() {
    setLoading(true)
    const [{ data: n }, { data: s }, { data: c }] = await Promise.all([
      sb.from('notes').select('*, files:note_files(*)').order('created_at', { ascending: false }),
      sb.from('student_sessions').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('capstones').select('*, files:capstone_files(*)').order('created_at', { ascending: false }),
    ])
    setNotes(n || [])
    setSessions((s as StudentSession[]) || [])
    setCaps(c || [])
    setLoading(false)
  }

  async function deleteNote(id: string) {
    const note = notes.find(n => n.id === id)
    if (note?.files) for (const f of note.files) await sb.storage.from('sparks-files').remove([f.file_key])
    await sb.from('notes').delete().eq('id', id)
    toast('Note deleted', 'info')
    loadAll()
    setDelConfirm(null)
  }

  async function deleteCap(id: string) {
    const cap = caps.find(c => c.id === id)
    if (cap?.files) for (const f of cap.files) await sb.storage.from('sparks-files').remove([f.file_key])
    await sb.from('capstones').delete().eq('id', id)
    toast('Research deleted', 'info')
    loadAll()
    setDelConfirm(null)
  }

  function logout() { clearAdmin(); router.push('/') }

  const filterN = notes.filter(n => !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.author_name?.toLowerCase().includes(search.toLowerCase()))
  const filterC = caps.filter(c => !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.author_name?.toLowerCase().includes(search.toLowerCase()) || c.project_type?.toLowerCase().includes(search.toLowerCase()))
  const filterS = sessions.filter(s => !search || s.first_name?.toLowerCase().includes(search.toLowerCase()) || s.class_name?.toLowerCase().includes(search.toLowerCase()))

  const bgVars: Record<string, string> = { grade9: '#e8f5e8', grade10: '#e8f0ff', grade11: '#fff8e8', grade12: '#fce8f0' }
  const bgCapMap: Record<string, string> = { cap: '#e8f0ff', sip: '#fff8e8', res: '#fce8f0' }

  return (
    <div className="admin-dash">
      <div className="admin-nav">
        <div className="admin-nav-title">⚡ SPARKS Admin</div>
        <div className="admin-tabs">
          {(['notes', 'users', 'capstones'] as const).map(t => (
            <button key={t} className={`admin-tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setSearch('') }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="admin-badge">{t === 'notes' ? notes.length : t === 'users' ? sessions.length : caps.length}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="admin-search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-danger btn-sm" onClick={logout}><LogOut size={14} /> Logout</button>
        </div>
      </div>

      <div className="admin-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,.4)' }}>
            <span className="spinner" /> Loading...
          </div>
        ) : tab === 'notes' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>{['Grade', 'Subject', 'Title', 'Author', 'Date', 'Year', 'Files', ''].map(k => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>
                {filterN.map(n => {
                  const gc = gradeColors(n.grade)
                  return (
                    <tr key={n.id}>
                      <td><span className="pill" style={{ background: bgVars[gc.bgVar], color: gc.pill, fontSize: 11 }}>{n.grade}</span></td>
                      <td>{n.subject}</td>
                      <td style={{ maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div></td>
                      <td>{n.author_name}</td>
                      <td>{fmtDate(n.created_at)}</td>
                      <td>{n.school_year}</td>
                      <td>{n.files?.length || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-xs" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }} onClick={() => setEditNote(n)}>
                            <Edit size={11} /> Edit
                          </button>
                          {delConfirm === n.id ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Delete?</span>
                              <button className="btn btn-danger btn-xs" onClick={() => deleteNote(n.id)}>Yes</button>
                              <button className="btn btn-xs" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.5)' }} onClick={() => setDelConfirm(null)}>No</button>
                            </div>
                          ) : (
                            <button className="btn btn-danger btn-xs" onClick={() => setDelConfirm(n.id)}><Trash size={11} /> Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : tab === 'users' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>{['Name', 'Class', 'Login Date'].map(k => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>
                {filterS.map((s, i) => (
                  <tr key={i}>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{s.class_name}</td>
                    <td>{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>{['Type', 'Year', 'Title', 'Author', 'Date', 'Files', ''].map(k => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>
                {filterC.map(c => {
                  const cc = capColors(c.project_type)
                  return (
                    <tr key={c.id}>
                      <td><span className="pill" style={{ background: bgCapMap[cc.label], color: cc.pill, fontSize: 11 }}>{c.project_type}</span></td>
                      <td>{c.school_year || '—'}</td>
                      <td style={{ maxWidth: 240 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div></td>
                      <td>{c.author_name}</td>
                      <td>{fmtDate(c.created_at)}</td>
                      <td>{c.files?.length || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-xs" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }} onClick={() => setEditCap(c)}>
                            <Edit size={11} /> Edit
                          </button>
                          {delConfirm === c.id ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Delete?</span>
                              <button className="btn btn-danger btn-xs" onClick={() => deleteCap(c.id)}>Yes</button>
                              <button className="btn btn-xs" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.5)' }} onClick={() => setDelConfirm(null)}>No</button>
                            </div>
                          ) : (
                            <button className="btn btn-danger btn-xs" onClick={() => setDelConfirm(c.id)}><Trash size={11} /> Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editNote && <EditNoteModal note={editNote} onClose={() => setEditNote(null)} onDone={loadAll} />}
      {editCap && <EditCapModal cap={editCap} onClose={() => setEditCap(null)} onDone={loadAll} />}
    </div>
  )
}

function EditNoteModal({ note, onClose, onDone }: { note: Note; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: note.title || '', author: note.author_name || '', grade: note.grade || '', subject: note.subject || '', desc: note.description || '' })
  const [loading, setLoading] = useState(false)
  const subjects = SUBJECTS[form.grade] || []

  async function save() {
    if (!form.title) { toast('Title is required', 'error'); return }
    setLoading(true)
    const { error } = await sb.from('notes').update({
      title: form.title,
      author_name: form.author,
      grade: form.grade,
      subject: form.subject,
      description: form.desc,
    }).eq('id', note.id)
    if (error) {
      toast('Failed to update: ' + error.message, 'error')
      setLoading(false)
      return
    }
    toast('Note updated!', 'success')
    onDone()
    onClose()
    setLoading(false)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 600 }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Edit Note</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Author</label><input className="form-input" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select className="form-input select" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value, subject: '' }))}>
                <option value="">Select</option>
                {Object.keys(SUBJECTS).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-input select" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                <option value="">Select</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? <span className="spinner" /> : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}

function EditCapModal({ cap, onClose, onDone }: { cap: Capstone; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ title: cap.title || '', author: cap.author_name || '', type: cap.project_type || '', year: cap.school_year || '', desc: cap.description || '' })
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.title || !form.type) { toast('Title and project type are required', 'error'); return }
    setLoading(true)
    const { error } = await sb.from('capstones').update({
      title: form.title,
      author_name: form.author,
      project_type: form.type,
      school_year: form.year,
      description: form.desc,
    }).eq('id', cap.id)
    if (error) {
      toast('Failed to update: ' + error.message, 'error')
      setLoading(false)
      return
    }
    toast('Research updated!', 'success')
    onDone()
    onClose()
    setLoading(false)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 600 }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Edit Research</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Author</label><input className="form-input" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Project Type</label>
              <select className="form-input select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="">Select</option>
                {['Capstone', 'SIP', 'Research'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">School Year</label>
              <select className="form-input select" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}>
                <option value="">Select year</option>
                {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? <span className="spinner" /> : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}
