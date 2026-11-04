import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const CATEGORIES = ['Personal Items', 'Electronics', 'ID Cards', 'Stationery', 'Bags', 'Books', 'Keys', 'Other']
const EMPTY_REPORT = { item_name: '', category: 'Personal Items', report_type: 'lost', campus_location: '', incident_date: '', description: '', photo: null }
const dateText = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not provided'
const cleanError = error => error?.message || 'Something went wrong. Please try again.'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
:root{font-family:'DM Sans',Arial,sans-serif;color:#17233b;background:#f4f7fc;font-synthesis:none;text-rendering:optimizeLegibility}*{box-sizing:border-box}body{margin:0;min-width:320px}button,input,select,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.6;cursor:not-allowed}.fi{min-height:100vh;background:#f4f7fc}.fi button{border:0}.fi .btn{border-radius:11px;padding:11px 16px;font-weight:700;background:#173b76;color:white}.fi .btn.secondary{background:#eaf0fa;color:#173b76}.fi .btn.danger{background:#fff0f0;color:#b42318}.fi .btn.small{padding:8px 11px;font-size:12px}.fi .muted{color:#71809a}.fi .eyebrow{font-size:10px;letter-spacing:1.5px;font-weight:800;color:#6480aa}.fi .auth-wrap{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top right,#dce9ff,transparent 40%),#f4f7fc}.fi .auth-card{width:min(460px,100%);background:white;padding:34px;border-radius:22px;box-shadow:0 18px 60px #1b37601a}.fi .brand{display:flex;align-items:center;gap:12px;margin-bottom:26px}.fi .brand-mark{width:44px;height:44px;border-radius:14px;background:#173b76;color:white;display:grid;place-items:center;font-weight:900;font-size:23px}.fi .brand h2{margin:0;font-size:20px;letter-spacing:-.7px}.fi .brand h2 span{color:#43bda3}.fi .brand small{font-size:9px;letter-spacing:1.7px;color:#8290a6;font-weight:800}.fi h1{font-size:27px;margin:8px 0}.fi .intro{color:#71809a;font-size:13px;line-height:1.6;margin-bottom:22px}.fi label{display:block;font-size:12px;font-weight:700;margin:13px 0 7px;color:#35445d}.fi input,.fi select,.fi textarea{width:100%;border:1px solid #dce3ef;border-radius:10px;padding:12px 13px;background:#fff;color:#17233b;outline:none}.fi input:focus,.fi select:focus,.fi textarea:focus{border-color:#527bc0;box-shadow:0 0 0 3px #527bc018}.fi textarea{min-height:90px;resize:vertical}.fi .full{width:100%;margin-top:18px}.fi .auth-links{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:17px;font-size:12px}.fi .link{background:none;color:#24569a;font-weight:700;padding:0}.fi .message{padding:11px 13px;border-radius:10px;font-size:12px;margin-top:13px;background:#edf8f3;color:#176b50}.fi .error{background:#fff0f0;color:#ad2929}.fi .shell{display:grid;grid-template-columns:245px 1fr;min-height:100vh}.fi .sidebar{background:#102b56;color:white;padding:25px 17px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}.fi .sidebar .brand{margin:0 7px 36px}.fi .sidebar .brand small{color:#9db1d1}.fi .side-label{font-size:9px;letter-spacing:1.7px;color:#91a6c7;font-weight:800;padding:0 12px 12px}.fi .nav{display:grid;gap:6px}.fi .nav button{background:transparent;color:#c4d1e5;text-align:left;padding:12px;border-radius:10px;font-size:13px;font-weight:600}.fi .nav button.active,.fi .nav button:hover{background:#ffffff18;color:white}.fi .side-bottom{margin-top:auto}.fi .help{padding:15px;background:#ffffff12;border-radius:13px;font-size:12px;line-height:1.5;color:#d3deee;margin-bottom:18px}.fi .user-mini{display:flex;gap:10px;align-items:center;padding:12px 5px;border-top:1px solid #ffffff20}.fi .avatar{width:37px;height:37px;border-radius:50%;display:grid;place-items:center;background:#d9e8ff;color:#173b76;font-weight:800;flex:none}.fi .user-mini strong{display:block;font-size:12px}.fi .user-mini small{font-size:10px;color:#aebfd8;display:block;max-width:150px;overflow:hidden;text-overflow:ellipsis}.fi .main{padding:27px 34px;max-width:1500px;width:100%;margin:auto}.fi .topbar{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:24px}.fi .crumb{font-size:9px;letter-spacing:1.4px;color:#8190a8;font-weight:800}.fi .topbar h1{font-size:25px;margin:4px 0}.fi .top-right{display:flex;align-items:center;gap:12px}.fi .profile-btn{display:flex;align-items:center;gap:9px;background:white;padding:7px 12px;border-radius:12px;color:#24334b;box-shadow:0 4px 16px #24334b0b}.fi .profile-btn strong{font-size:12px}.fi .banner{background:linear-gradient(115deg,#173b76,#2863a9);border-radius:20px;color:white;padding:27px 30px;display:flex;justify-content:space-between;align-items:center;gap:20px;overflow:hidden}.fi .banner h2{font-size:29px;line-height:1.15;margin:9px 0}.fi .banner p{font-size:12px;color:#d6e4f8;max-width:460px;line-height:1.6}.fi .banner-art{font-size:70px;opacity:.9;padding:10px 35px}.fi .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:20px 0}.fi .stat{background:white;border:1px solid #edf0f6;border-radius:15px;padding:18px}.fi .stat span{font-size:11px;color:#73819a}.fi .stat strong{display:block;font-size:27px;margin:8px 0 3px}.fi .section{background:white;border:1px solid #edf0f6;border-radius:17px;padding:22px;margin-top:18px}.fi .section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:17px}.fi .section-head h2{font-size:18px;margin:4px 0}.fi .section-head p{font-size:11px;color:#8390a4;margin:0}.fi .toolbar{display:flex;gap:10px;margin-bottom:17px}.fi .toolbar input{flex:1}.fi .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.fi .item{border:1px solid #e8edf5;border-radius:14px;overflow:hidden;background:white}.fi .item-top{height:105px;background:#edf3fb;display:grid;place-items:center;position:relative;font-size:43px}.fi .pill{position:absolute;top:10px;right:10px;padding:5px 9px;border-radius:20px;font-size:9px;font-weight:800;background:#fff0e8;color:#ad592b}.fi .pill.found{background:#e7f8ef;color:#18794e}.fi .item-body{padding:14px}.fi .item-body h3{font-size:14px;margin:5px 0}.fi .item-body p{font-size:11px;color:#78869c;line-height:1.5;margin:5px 0}.fi .item-foot{border-top:1px solid #edf0f5;margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#8994a7}.fi .empty{padding:35px;text-align:center;color:#7c899e;font-size:13px}.fi .notice{padding:12px 15px;background:#e9f8f1;color:#176b50;border-radius:10px;margin:14px 0;font-size:12px}.fi .modal-bg{position:fixed;inset:0;background:#0b1d37a8;display:grid;place-items:center;padding:18px;z-index:20;overflow:auto}.fi .modal{background:white;width:min(560px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:24px}.fi .modal-head{display:flex;justify-content:space-between;align-items:center}.fi .modal-head h2{margin:4px 0 15px;font-size:20px}.fi .close{font-size:25px;background:#f0f3f8;border-radius:9px;width:34px;height:34px}.fi .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 13px}.fi .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fi .profile-field{padding:13px;background:#f5f7fb;border-radius:11px}.fi .profile-field small{display:block;color:#8290a5;font-size:10px}.fi .profile-field strong{display:block;font-size:13px;margin-top:5px;overflow-wrap:anywhere}.fi .table-wrap{overflow:auto}.fi table{border-collapse:collapse;width:100%;font-size:12px} .fi th,.fi td{text-align:left;padding:12px;border-bottom:1px solid #edf0f5;white-space:nowrap}.fi th{color:#78869c;font-size:10px;text-transform:uppercase;letter-spacing:.7px}.fi .actions{display:flex;gap:6px}.fi footer{padding:25px 0;color:#9aa5b6;font-size:10px;display:flex;justify-content:space-between;gap:10px}.fi .notice-line{font-size:11px;color:#8390a4;margin-top:10px;line-height:1.5}
@media(max-width:1000px){.fi .shell{grid-template-columns:200px 1fr}.fi .main{padding:22px}.fi .grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fi .stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px).fi .brand-logo {
  width:52px  height: 52px;
  object-fit: contain;
  flex-shrink: 0;
}{.fi .shell{display:block}2px;
 .fi .sidebar{position:static;height:auto;padding:14px}.fi .sidebar .brand{margin:0 5px 12px}.fi .side-label,.fi .help,.fi .user-mini{display:none}.fi .nav{display:flex;overflow:auto}.fi .nav button{white-space:nowrap;padding:9px}.fi .main{padding:16px}.fi .topbar{align-items:flex-start}.fi .topbar h1{font-size:21px}.fi .banner{padding:20px}.fi .banner-art{display:none}.fi .grid{grid-template-columns:1fr}.fi .toolbar{flex-wrap:wrap}.fi .toolbar input{flex-basis:100%}.fi .form-grid,.fi .profile-grid{grid-template-columns:1fr}.fi footer{flex-direction:column}}
`

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin') // signin | signup | forgot | reset
  const [auth, setAuth] = useState({ fullName: '', registrationNumber: '', email: '', password: '', newPassword: '' })
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState([])
  const [claims, setClaims] = useState([])
  const [staffClaims, setStaffClaims] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showReport, setShowReport] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showClaim, setShowClaim] = useState(null)
  const [claimMessage, setClaimMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [report, setReport] = useState(EMPTY_REPORT)
  const [saving, setSaving] = useState(false)
  const [reviewClaim, setReviewClaim] = useState(null)
  const [storageLocation, setStorageLocation] = useState('')
  const [handoverNotes, setHandoverNotes] = useState('')
  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersError, setAdminUsersError] = useState('')

  const isStaff = ['staff', 'admin'].includes(profile?.role)
  const isAdmin = profile?.role === 'admin'

  const loadProfile = useCallback(async user => {
    if (!user) { setProfile(null); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error) { setProfile({ id: user.id, full_name: user.user_metadata?.full_name || '', registration_number: user.user_metadata?.registration_number || '', role: 'student' }); return }
    if (data) { setProfile(data); return }
    const newProfile = { id: user.id, full_name: user.user_metadata?.full_name || '', registration_number: user.user_metadata?.registration_number || '', role: 'student' }
    const { data: inserted } = await supabase.from('profiles').upsert(newProfile).select().maybeSingle()
    setProfile(inserted || newProfile)
  }, [])

  const loadItems = useCallback(async () => {
    setItemsLoading(true); setItemsError('')
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false })
    if (error) { setItemsError(cleanError(error)); setItems([]) }
    else setItems(data || [])
    setItemsLoading(false)
  }, [])

  const loadMyClaims = useCallback(async () => {
    if (!session?.user) return
    const { data, error } = await supabase.from('claims').select('*, items(item_name, campus_location, report_type)').eq('claimant_id', session.user.id).order('created_at', { ascending: false })
    if (!error) setClaims(data || [])
  }, [session?.user?.id])

  const loadStaffClaims = useCallback(async () => {
    if (!isStaff) return
    const { data, error } = await supabase.from('claims').select('*, items(item_name, campus_location, reporter_id)').order('created_at', { ascending: false })
    if (!error) setStaffClaims(data || [])
    else setItemsError(cleanError(error))
  }, [isStaff])

useEffect(() => {
    let alive = true
    const start = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!alive) return
      if (error) setAuthError(cleanError(error))
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user)
      if (alive) setAuthLoading(false)
    }
    start()
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') { setAuthMode('reset'); setAuthError(''); setAuthMessage('Choose a new password for your account.') }
      if (!nextSession) { setProfile(null); setItems([]); setClaims([]); setStaffClaims([]); setAuthMode('signin') }
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [loadProfile])

  useEffect(() => {
    if (!session?.user) return
    loadProfile(session.user)
    loadItems()
  }, [session?.user?.id, loadProfile, loadItems])

  useEffect(() => { if (session?.user) loadMyClaims() }, [session?.user?.id, loadMyClaims])
  useEffect(() => { if (isStaff) loadStaffClaims() }, [isStaff, loadStaffClaims])
    async function handleAuth(event) {
    event.preventDefault(); setBusy(true); setAuthError(''); setAuthMessage('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: auth.email.trim(), password: auth.password,
          options: { data: { full_name: auth.fullName.trim(), registration_number: auth.registrationNumber.trim() } },
        })
        if (error) throw error
        setAuthMessage(data.session ? 'Account created successfully.' : 'Account created. Please verify your email, then sign in.')
        if (data.session) await loadProfile(data.session.user)
      } else if (authMode === 'forgot') {
        const redirectTo = `${window.location.origin}`
        const { error } = await supabase.auth.resetPasswordForEmail(auth.email.trim(), { redirectTo })
        if (error) throw error
        setAuthMessage('Password reset link sent. Check your email inbox and spam folder.')
      } else if (authMode === 'reset') {
        if (auth.newPassword.length < 6) throw new Error('New password must contain at least 6 characters.')
        const { error } = await supabase.auth.updateUser({ password: auth.newPassword })
        if (error) throw error
        setAuthMessage('Password updated. You can continue using FINDIT.')
        setAuthMode('signin')
        setAuth({ ...auth, password: '', newPassword: '' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: auth.email.trim(), password: auth.password })
        if (error) throw error
      }
    } catch (error) { setAuthError(cleanError(error)) }
    finally { setBusy(false) }
  }
  async function signOut() {
    setBusy(true)
    const { error } = await supabase.auth.signOut()
    setBusy(false)
    if (error) setNotice(cleanError(error)); else { setNotice('Signed out successfully.'); setShowProfile(false) }
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!session?.user) return
    setSaving(true); setNotice('')
    try {
      let photoPath = null
      if (report.photo) {
        const ext = report.photo.name.split('.').pop() || 'jpg'
        const path = `${session.user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('findit-items').upload(path, report.photo, { upsert: false })
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}. You can retry without a photo.`)
        photoPath = path
      }
      const payload = {
        reporter_id: session.user.id, item_name: report.item_name.trim(), description: report.description.trim(),
        category: report.category, report_type: report.report_type, campus_location: report.campus_location.trim(),
        incident_date: report.incident_date || null, photo_path: photoPath, status: 'reported',
      }
      const { error } = await supabase.from('items').insert(payload)
      if (error) throw error
      setShowReport(false); setReport(EMPTY_REPORT); setActiveTab('My Reports'); setNotice('Your item report has been submitted.')
      await loadItems()
    } catch (error) { setNotice(cleanError(error)) }
    finally { setSaving(false) }
  }
   async function submitClaim(event) {
    event.preventDefault()
    if (!showClaim || !session?.user) return
    setSaving(true); setNotice('')
    const { error } = await supabase.from('claims').insert({ item_id: showClaim.id, claimant_id: session.user.id, claim_message: claimMessage.trim(), status: 'pending' })
    setSaving(false)
    if (error) setNotice(`Claim not submitted: ${cleanError(error)}`)
    else { setShowClaim(null); setClaimMessage(''); setNotice('Your claim has been submitted for staff review.'); await loadMyClaims(); await loadStaffClaims() }
  }

  async function updateClaimStatus(claim, status) {
    setSaving(true); setNotice('')
    const { error } = await supabase.from('claims').update({ status }).eq('id', claim.id)
    setSaving(false)
    if (error) setNotice(`Could not update claim: ${cleanError(error)}`)
    else { setNotice(`Claim ${status}.`); await loadStaffClaims(); await loadMyClaims() }
  }

  async function createHandover(event) {
    event.preventDefault()
    if (!reviewClaim || !session?.user) return
    setSaving(true); setNotice('')
    const { error } = await supabase.from('handovers').insert({
      item_id: reviewClaim.item_id, claim_id: reviewClaim.id, handled_by: session.user.id,
      storage_location: storageLocation.trim() || null, handover_notes: handoverNotes.trim() || null,
      handed_over_at: new Date().toISOString(),
    })
    if (!error) {
      await supabase.from('items').update({ status: 'ready_for_collection' }).eq('id', reviewClaim.item_id)
      setNotice('Handover record created. Ask the student to confirm collection from My Claims.')
      setReviewClaim(null); setStorageLocation(''); setHandoverNotes(''); await loadItems(); await loadStaffClaims()
    } else setNotice(`Could not create handover: ${cleanError(error)}`)
    setSaving(false)
  }
  async function confirmCollection(claim) {
    setSaving(true); setNotice('')
    const { data: handover, error: findError } = await supabase.from('handovers').select('id').eq('claim_id', claim.id).maybeSingle()
    if (findError || !handover) { setNotice(findError ? cleanError(findError) : 'The office has not recorded a handover for this claim yet.'); setSaving(false); return }
    const { error } = await supabase.from('handovers').update({ student_confirmed_at: new Date().toISOString() }).eq('id', handover.id)
    if (!error) {
      await supabase.from('items').update({ status: 'returned' }).eq('id', claim.item_id)
      setNotice('Collection confirmation submitted. Thank you!')
      await loadItems(); await loadMyClaims()
    } else setNotice(`Could not confirm collection: ${cleanError(error)}`)
    setSaving(false)
  }

  async function loadAdminUsers() {
    setAdminUsersError('')
    const { data, error } = await supabase.from('profiles').select('id, full_name, registration_number, role, created_at').order('created_at', { ascending: false })
    if (error) { setAdminUsersError(cleanError(error)); setAdminUsers([]) } else setAdminUsers(data || [])
  }

  async function changeUserRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) setNotice(`Role update failed: ${cleanError(error)}`)
    else { setNotice('User role updated.'); await loadAdminUsers() }
  }

  const visibleItems = useMemo(() => items.filter(item => {
    const query = `${item.item_name || ''} ${item.campus_location || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase()
    const type = (item.report_type || '').toLowerCase()
    const matchesTab = activeTab !== 'My Reports' || item.reporter_id === session?.user?.id
    const matchesFilter = filter === 'All' || type === filter.toLowerCase()
    return query.includes(search.toLowerCase()) && matchesTab && matchesFilter
  }), [items, search, filter, activeTab, session?.user?.id])
const foundCount = items.filter(item => item.report_type === 'found').length
  const lostCount = items.filter(item => item.report_type === 'lost').length
  const myCount = items.filter(item => item.reporter_id === session?.user?.id).length

  if (authLoading) return <div className="fi"><style>{CSS}</style><div className="auth-wrap"><div className="auth-card">Loading FINDIT and checking your session…</div></div></div>

  if (!session) return <div className="fi"><style>{CSS}</style><div className="auth-wrap"><form className="auth-card" onSubmit={handleAuth}>
    <div className="brand"><div className="brand-mark">F</div><div><h2>SAVEETHA FINDIT<span>.</span></h2><small>LOST & FOUND · TOGETHER</small></div></div>
    <span className="eyebrow">CAMPUS LOST & FOUND</span>
    <h1>{authMode === 'signup' ? 'Create your account' : authMode === 'forgot' ? 'Reset your password' : authMode === 'reset' ? 'Choose a new password' : 'Welcome back'}</h1>
    <p className="intro">{authMode === 'forgot' ? 'Enter your registered email and we will send you a password reset link.' : authMode === 'reset' ? 'Use a new password with at least six characters.' : 'Sign in with your account to report, discover and recover belongings around Saveetha campus.'}</p>
    {authMode === 'signup' && <><label>Full name</label><input required value={auth.fullName} onChange={e => setAuth({ ...auth, fullName: e.target.value })} placeholder="Your full name"/><label>Registration number</label><input required value={auth.registrationNumber} onChange={e => setAuth({ ...auth, registrationNumber: e.target.value })} placeholder="Your registration number"/></>}
    {authMode !== 'reset' && <><label>Email address</label><input required type="email" autoComplete="email" value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} placeholder="name@example.com"/></>}
    {authMode === 'reset' ? <><label>New password</label><input required type="password" minLength="6" value={auth.newPassword} onChange={e => setAuth({ ...auth, newPassword: e.target.value })} placeholder="At least 6 characters"/></> : authMode !== 'forgot' && <><label>Password</label><input required type="password" minLength="6" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} placeholder="Enter your password"/></>}
    {authError && <div className="message error">{authError}</div>}{authMessage && <div className="message">{authMessage}</div>}
    <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : authMode === 'forgot' ? 'Send reset link' : authMode === 'reset' ? 'Update password' : 'Sign in'}</button>
    <div className="auth-links">{authMode === 'signin' ? <><button type="button" className="link" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthMessage('') }}>Forgot password?</button><button type="button" className="link" onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthMessage('') }}>Create account</button></> : <button type="button" className="link" onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthMessage('') }}>← Back to sign in</button>}</div>
    <p className="notice-line">Use only an email account you are authorised to access. Account verification and password reset emails are managed by Supabase Auth.</p>
  </form></div></div>

  const navItems = ['Overview', 'Browse Items', 'My Reports', 'My Claims', ...(isStaff ? ['Staff Review'] : []), ...(isAdmin ? ['User Management'] : [])]
  const profileName = profile?.full_name || session.user.user_metadata?.full_name || 'Campus User'
  return <div className="fi"><style>{CSS}</style><div className="shell">
    <aside className="sidebar">
   <div className="brand">
  <img
    className="brand-logo"
    src="/simats-logo.png"
    alt="SIMATS University Logo"
  />
  <div>
    <h2>SAVEETHA FINDIT<span>.</span></h2>
    <small>LOST & FOUND · TOGETHER</small>
  </div>
</div>
      <div className="side-label">CAMPUS MENU</div>
      <nav className="nav">{navItems.map(name => <button key={name} className={activeTab === name ? 'active' : ''} onClick={() => { setActiveTab(name); setSearch(''); setFilter('All'); if (name === 'User Management') loadAdminUsers() }}>{name === 'Overview' ? '⌂' : name === 'Browse Items' ? '▦' : name === 'My Reports' ? '▤' : name === 'My Claims' ? '◇' : name === 'Staff Review' ? '✓' : '⚙'}　{name}</button>)}</nav>
      <div className="side-bottom"><div className="help">Need assistance?<br/><strong>Central Lost & Found Office</strong><br/>Contact campus staff for collection support.</div><div className="user-mini"><div className="avatar">{profileName.charAt(0).toUpperCase()}</div><div><strong>{profileName}</strong><small>{session.user.email}</small></div></div></div>
    </aside>

    <main className="main"><header className="topbar"><div><span className="crumb">SAVEETHA / CAMPUS SERVICES</span><h1>{activeTab}</h1></div><div className="top-right"><button className="profile-btn" onClick={() => setShowProfile(true)}><span className="avatar">{profileName.charAt(0).toUpperCase()}</span><strong>My Profile ▾</strong></button><button className="btn secondary small" onClick={signOut} disabled={busy}>Sign out</button></div></header>
      {notice && <div className="notice">{notice}</div>}{itemsError && <div className="message error">{itemsError}</div>}

      {(activeTab === 'Overview' || activeTab === 'Browse Items' || activeTab === 'My Reports') && <>
        {activeTab === 'Overview' && <section className="banner"><div><span className="eyebrow" style={{color:'#c4d8f4'}}>YOUR CAMPUS, CONNECTED</span><h2>Lost something?<br/>Let's find it.</h2><p>A simple way to report, discover and recover belongings across Saveetha campus.</p><button className="btn" onClick={() => setShowReport(true)}>＋ Report an item</button></div><div className="banner-art">🎒　🔑　📱</div></section>}
        {activeTab === 'Overview' && <section className="stats"><div className="stat"><span>Total reports</span><strong>{items.length}</strong><small className="muted">Campus reports</small></div><div className="stat"><span>Found items</span><strong>{foundCount}</strong><small className="muted">Reported as found</small></div><div className="stat"><span>Lost items</span><strong>{lostCount}</strong><small className="muted">Being searched for</small></div><div className="stat"><span>My reports</span><strong>{myCount}</strong><small className="muted">Your submissions</small></div></section>}
        <section className="section"><div className="section-head"><div><span className="eyebrow">CAMPUS COMMUNITY</span><h2>{activeTab === 'My Reports' ? 'My submissions' : activeTab === 'Browse Items' ? 'Browse campus items' : 'Recent item reports'}</h2><p>Search reports and contact the office through a claim request.</p></div><button className="btn" onClick={() => setShowReport(true)}>＋ New report</button></div>
          <div className="toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, category, description or location…"/><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Lost</option><option>Found</option></select><button className="btn secondary" onClick={loadItems} disabled={itemsLoading}>{itemsLoading ? 'Loading…' : '↻ Refresh'}</button></div>
          {itemsLoading ? <div className="empty">Loading campus reports…</div> : visibleItems.length ? <div className="grid">{visibleItems.map(item => { const lost = item.report_type === 'lost'; const mine = item.reporter_id === session.user.id; return <article className="item" key={item.id}><div className="item-top"><span>{item.category === 'Electronics' ? '📱' : item.category === 'Bags' ? '🎒' : item.category === 'Books' ? '📚' : item.category === 'ID Cards' ? '🪪' : '🔎'}</span><span className={`pill ${lost ? '' : 'found'}`}>{lost ? 'LOST' : 'FOUND'}</span></div><div className="item-body"><span className="eyebrow">{item.category}</span><h3>{item.item_name}</h3><p>⌖ {item.campus_location}</p>{item.description && <p>{item.description}</p>}<div className="item-foot"><span>{dateText(item.incident_date || item.created_at)}</span><span>{(item.status || 'reported').replaceAll('_', ' ')}</span></div>{!mine && <button className="btn small" style={{width:'100%',marginTop:12}} onClick={() => { setShowClaim(item); setClaimMessage('') }}>Submit a claim</button>}</div></article>})}</div> : <div className="empty">No matching reports found. Try another search or create a report.</div>}
        </section>
      </>}
      {activeTab === 'My Claims' && <section className="section"><div className="section-head"><div><span className="eyebrow">CLAIM TRACKER</span><h2>My claim requests</h2><p>Track the review and collection status of your claims.</p></div><button className="btn secondary" onClick={loadMyClaims}>↻ Refresh</button></div>{claims.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Location</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>{claims.map(claim => <tr key={claim.id}><td>{claim.items?.item_name || 'Item'}</td><td>{claim.items?.campus_location || '—'}</td><td>{dateText(claim.created_at)}</td><td>{claim.status}</td><td>{claim.status === 'approved' ? <button className="btn small" onClick={() => confirmCollection(claim)} disabled={busy}>Confirm received</button> : '—'}</td></tr>)}</tbody></table></div> : <div className="empty">You have not submitted any claims yet. Browse items to submit a claim.</div>}</section>}

      {activeTab === 'Staff Review' && isStaff && <section className="section"><div className="section-head"><div><span className="eyebrow">OFFICE WORKSPACE</span><h2>Claim review queue</h2><p>Review student requests and record item handovers.</p></div><button className="btn secondary" onClick={loadStaffClaims}>↻ Refresh</button></div>{staffClaims.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Claim message</th><th>Student ID</th><th>Status</th><th>Review</th></tr></thead><tbody>{staffClaims.map(claim => <tr key={claim.id}><td>{claim.items?.item_name || 'Item'}</td><td>{claim.claim_message}</td><td>{claim.claimant_id?.slice(0,8)}…</td><td>{claim.status}</td><td><div className="actions">{claim.status === 'pending' && <><button className="btn small" onClick={() => updateClaimStatus(claim,'approved')} disabled={busy}>Approve</button><button className="btn danger small" onClick={() => updateClaimStatus(claim,'rejected')} disabled={busy}>Reject</button></>}{claim.status === 'approved' && <button className="btn secondary small" onClick={() => setReviewClaim(claim)}>Record handover</button>}</div></td></tr>)}</tbody></table></div> : <div className="empty">No claim requests are available.</div>}</section>}

      {activeTab === 'User Management' && isAdmin && <section className="section"><div className="section-head"><div><span className="eyebrow">ADMINISTRATION</span><h2>Campus user management</h2><p>Manage student, staff and administrator roles.</p></div><button className="btn secondary" onClick={loadAdminUsers}>↻ Refresh</button></div>{adminUsersError && <div className="message error">{adminUsersError} Check the profiles SELECT policy for admins.</div>}<div className="table-wrap"><table><thead><tr><th>Name</th><th>Registration no.</th><th>Role</th><th>Change role</th></tr></thead><tbody>{adminUsers.map(user => <tr key={user.id}><td>{user.full_name || 'Campus user'}</td><td>{user.registration_number || '—'}</td><td>{user.role}</td><td><select value={user.role || 'student'} onChange={e => changeUserRole(user.id,e.target.value)} disabled={user.id === session.user.id}><option value="student">Student</option><option value="staff">Staff</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table></div></section>}

      <footer><span>SAVEETHA FINDIT © 2026</span><span>Campus Lost & Found · Student project prototype</span></footer>
    </main>
  </div>
{showReport && <div className="modal-bg" onClick={() => setShowReport(false)}><form className="modal" onSubmit={submitReport} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">CAMPUS REPORT</span><h2>Report an item</h2></div><button type="button" className="close" onClick={() => setShowReport(false)}>×</button></div><div className="form-grid"><div><label>Report type</label><select value={report.report_type} onChange={e => setReport({...report,report_type:e.target.value})}><option value="lost">Lost</option><option value="found">Found</option></select></div><div><label>Category</label><select value={report.category} onChange={e => setReport({...report,category:e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div><div style={{gridColumn:'1/-1'}}><label>Item name</label><input required maxLength="100" value={report.item_name} onChange={e => setReport({...report,item_name:e.target.value})} placeholder="Example: Black water bottle"/></div><div><label>Campus location</label><input required maxLength="150" value={report.campus_location} onChange={e => setReport({...report,campus_location:e.target.value})} placeholder="Library, block, lab…"/></div><div><label>Date</label><input type="date" value={report.incident_date} onChange={e => setReport({...report,incident_date:e.target.value})}/></div><div style={{gridColumn:'1/-1'}}><label>Description</label><textarea maxLength="1000" value={report.description} onChange={e => setReport({...report,description:e.target.value})} placeholder="Describe the item. Keep unique proof private."/></div><div style={{gridColumn:'1/-1'}}><label>Photo (optional)</label><input type="file" accept="image/*" onChange={e => setReport({...report,photo:e.target.files?.[0] || null})}/></div></div><button className="btn full" disabled={saving}>{saving ? 'Submitting…' : 'Submit report'}</button><p className="notice-line">Photo upload requires a private Supabase Storage bucket named findit-items and suitable storage policies.</p></form></div>}

  {showClaim && <div className="modal-bg" onClick={() => setShowClaim(null)}><form className="modal" onSubmit={submitClaim} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">OWNERSHIP REQUEST</span><h2>Claim: {showClaim.item_name}</h2></div><button type="button" className="close" onClick={() => setShowClaim(null)}>×</button></div><p className="intro">Explain why you believe this item belongs to you. Do not post passwords, full ID numbers or sensitive personal information.</p><label>Claim message</label><textarea required maxLength="1000" value={claimMessage} onChange={e => setClaimMessage(e.target.value)} placeholder="Describe identifying details that staff can verify…"/><button className="btn full" disabled={saving}>{saving ? 'Submitting…' : 'Send claim for review'}</button></form></div>}

  {showProfile && <div className="modal-bg" onClick={() => setShowProfile(false)}><section className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>My Profile</h2></div><button className="close" onClick={() => setShowProfile(false)}>×</button></div><div className="profile-grid"><div className="profile-field"><small>Full name</small><strong>{profile?.full_name || profileName}</strong></div><div className="profile-field"><small>Registration number</small><strong>{profile?.registration_number || 'Not provided'}</strong></div><div className="profile-field"><small>Email</small><strong>{session.user.email}</strong></div><div className="profile-field"><small>Account role</small><strong>{profile?.role || 'student'}</strong></div><div className="profile-field"><small>Account created</small><strong>{dateText(session.user.created_at)}</strong></div><div className="profile-field"><small>User ID</small><strong>{session.user.id.slice(0,13)}…</strong></div></div><p className="notice-line">To correct your name or registration number, contact the campus FINDIT office.</p><button className="btn danger full" onClick={signOut} disabled={busy}>Sign out</button></section></div>}

  {reviewClaim && <div className="modal-bg" onClick={() => setReviewClaim(null)}><form className="modal" onSubmit={createHandover} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">OFFICE HANDOVER</span><h2>Record collection</h2></div><button type="button" className="close" onClick={() => setReviewClaim(null)}>×</button></div><label>Storage / collection location</label><input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Central Lost & Found Office"/><label>Handover notes</label><textarea value={handoverNotes} onChange={e => setHandoverNotes(e.target.value)} placeholder="Optional notes for the office record"/><button className="btn full" disabled={saving}>{saving ? 'Saving…' : 'Save handover record'}</button></form></div>}
  </div>
}
