import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

const CATEGORIES = ['Personal Items', 'Electronics', 'ID Cards', 'Stationery', 'Bags', 'Books', 'Keys', 'Other']
const EMPTY_REPORT = { item_name: '', category: 'Personal Items', report_type: 'lost', campus_location: '', incident_date: '', description: '', photo: null }
const dateText = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not provided'
const cleanError = error => error?.message || 'Something went wrong. Please try again.'

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
  const [officeMessages, setOfficeMessages] = useState([])
  const [officeLoading, setOfficeLoading] = useState(false)
  const [officeForm, setOfficeForm] = useState({ department: 'Central Lost & Found Office', subject: '', message: '' })
  const [replyDrafts, setReplyDrafts] = useState({})


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
    try {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false })
      if (error) throw error
      const withImages = await Promise.all((data || []).map(async item => {
        if (!item.photo_path) return { ...item, photo_url: null }
        const { data: signed, error: imageError } = await supabase.storage.from('findit-items').createSignedUrl(item.photo_path, 3600)
        if (imageError) {
          console.warn('FINDIT photo URL error:', imageError.message, item.photo_path)
          return { ...item, photo_url: null }
        }
        return { ...item, photo_url: signed?.signedUrl || null }
      }))
      setItems(withImages)
    } catch (error) {
      setItemsError(cleanError(error)); setItems([])
    } finally { setItemsLoading(false) }
  }, [])

  const loadMyClaims = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) { setClaims([]); return false }

    const { data, error } = await supabase
      .from('claims')
      .select('*, items(item_name, campus_location, report_type, status)')
      .eq('claimant_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setItemsError(`Your claims could not be loaded: ${cleanError(error)}`)
      return false
    }

    setClaims(data || [])
    return true
  }, [session?.user?.id])

  const loadStaffClaims = useCallback(async () => {
    if (!isStaff) { setStaffClaims([]); return false }
    const { data, error } = await supabase
      .from('claims')
      .select('*, items(item_name, campus_location, reporter_id)')
      .order('created_at', { ascending: false })

    if (error) {
      setItemsError(`Staff claims could not be loaded: ${cleanError(error)}`)
      return false
    }

    setStaffClaims(data || [])
    return true
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

    const itemId = showClaim.id
    // Admin-created claims belong to the student who originally reported the item.
    const claimantId = isAdmin ? showClaim.reporter_id : session.user.id

    if (!claimantId) {
      setNotice('This item has no linked reporting student, so a claim cannot be assigned.')
      return
    }

    setSaving(true)
    setNotice('')

    try {
      const { data: existingClaim, error: checkError } = await supabase
        .from('claims')
        .select('id, status')
        .eq('item_id', itemId)
        .eq('claimant_id', claimantId)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingClaim) {
        setShowClaim(null)
        setClaimMessage('')
        await loadMyClaims()
        await loadStaffClaims()
        setNotice(`A claim already exists for this student and item. Current status: ${existingClaim.status}.`)
        return
      }

      const { error: insertError } = await supabase
        .from('claims')
        .insert({
          item_id: itemId,
          claimant_id: claimantId,
          claim_message: isAdmin
            ? 'Claim submitted by campus administration on behalf of the original reporting student.'
            : claimMessage.trim(),
          status: 'pending'
        })

      if (insertError) throw insertError

      setShowClaim(null)
      setClaimMessage('')
      await loadMyClaims()
      await loadStaffClaims()
      setNotice(isAdmin
        ? 'Claim submitted and assigned to the original reporting student.'
        : 'Your claim has been submitted. You can track its status in My Claims.')
    } catch (error) {
      setNotice(`Claim not submitted: ${cleanError(error)}`)
    } finally {
      setSaving(false)
    }
  }


  async function updateClaimStatus(claim, status) {
    if (!isStaff || !['approved', 'rejected'].includes(status)) return
    setSaving(true)
    setNotice('')

    try {
      const { data, error } = await supabase
        .from('claims')
        .update({ status })
        .eq('id', claim.id)
        .select('id, status')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('No claim was updated. Check the staff UPDATE policy in Supabase.')

      setNotice(`Claim ${status}. The student can see the updated status after refreshing My Claims.`)
      await loadStaffClaims()
    } catch (error) {
      setNotice(`Could not update claim: ${cleanError(error)}`)
    } finally {
      setSaving(false)
    }
  }


  async function createHandover(event) {
    event.preventDefault()
    if (!isStaff || !reviewClaim || !session?.user) return
    if (reviewClaim.status !== 'approved') {
      setNotice('Only an approved claim can be handed over.')
      return
    }

    setSaving(true)
    setNotice('')
    try {
      const { data: existing, error: lookupError } = await supabase
        .from('handovers')
        .select('id')
        .eq('claim_id', reviewClaim.id)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (existing) throw new Error('A handover record already exists for this claim.')

      const { error: handoverError } = await supabase.from('handovers').insert({
        item_id: reviewClaim.item_id,
        claim_id: reviewClaim.id,
        handled_by: session.user.id,
        storage_location: storageLocation.trim() || null,
        handover_notes: handoverNotes.trim() || null,
        handed_over_at: new Date().toISOString(),
      })
      if (handoverError) throw handoverError

      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'verified' })
        .eq('id', reviewClaim.item_id)
      if (itemError) {
        setNotice(`Handover saved, but item status was not updated: ${cleanError(itemError)}`)
      } else {
        setNotice('Handover recorded. The student can now confirm collection in My Claims.')
      }

      setReviewClaim(null)
      setStorageLocation('')
      setHandoverNotes('')
      await loadItems()
      await loadStaffClaims()
    } catch (error) {
      setNotice(`Could not create handover: ${cleanError(error)}`)
    } finally {
      setSaving(false)
    }
  }

  async function confirmCollection(claim) {
    if (!session?.user || claim.claimant_id !== session.user.id) return
    setSaving(true)
    setNotice('')

    try {
      // A database function verifies ownership and updates only the confirmation timestamp.
      const { error } = await supabase.rpc('confirm_own_handover', {
        p_claim_id: claim.id,
      })
      if (error) throw error

      setNotice('Collection confirmation submitted. Thank you!')
      await loadMyClaims()
      await loadItems()
    } catch (error) {
      setNotice(`Could not confirm collection: ${cleanError(error)}`)
    } finally {
      setSaving(false)
    }
  }


  async function loadAdminUsers() {
    setAdminUsersError('')
    const { data, error } = await supabase.from('profiles').select('id, full_name, registration_number, role, created_at').order('created_at', { ascending: false })
    if (error) { setAdminUsersError(cleanError(error)); setAdminUsers([]) } else setAdminUsers(data || [])
  }

  async function changeUserRole(userId, role) {
    if (!isAdmin || !['student', 'staff', 'admin'].includes(role) || userId === session?.user?.id) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) setNotice(`Role update failed: ${cleanError(error)}`)
    else { setNotice('User role updated.'); await loadAdminUsers() }
  }

  const loadOfficeMessages = useCallback(async () => {
    if (!session?.user) return
    setOfficeLoading(true)
    try {
      let query = supabase.from('office_messages').select('*').order('created_at', { ascending: false })
      if (!isStaff) query = query.eq('sender_id', session.user.id)
      const { data, error } = await query
      if (error) throw error
      setOfficeMessages(data || [])
    } catch (error) { setNotice(`Could not load official messages: ${cleanError(error)}`) }
    finally { setOfficeLoading(false) }
  }, [session?.user?.id, isStaff])

  useEffect(() => {
    if (activeTab === 'Contact Officials' && session?.user) loadOfficeMessages()
  }, [activeTab, session?.user?.id, loadOfficeMessages])

  async function submitOfficeMessage(event) {
    event.preventDefault()
    if (!session?.user || !officeForm.subject.trim() || !officeForm.message.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('office_messages').insert({
        sender_id: session.user.id, department: officeForm.department,
        subject: officeForm.subject.trim(), message: officeForm.message.trim(), status: 'open'
      })
      if (error) throw error
      setOfficeForm({ department: 'Central Lost & Found Office', subject: '', message: '' })
      setNotice('Your message has been sent to campus officials.')
      await loadOfficeMessages()
    } catch (error) { setNotice(`Message not sent: ${cleanError(error)}`) }
    finally { setSaving(false) }
  }

  async function replyOfficeMessage(messageId) {
    if (!isStaff || !session?.user) return
    const reply = (replyDrafts[messageId] || '').trim()
    if (!reply) return
    setSaving(true)
    try {
      const { error } = await supabase.from('office_messages').update({
        staff_reply: reply, replied_by: session.user.id, replied_at: new Date().toISOString(), status: 'answered'
      }).eq('id', messageId)
      if (error) throw error
      setReplyDrafts(current => ({ ...current, [messageId]: '' }))
      setNotice('Official reply sent.')
      await loadOfficeMessages()
    } catch (error) { setNotice(`Reply not sent: ${cleanError(error)}`) }
    finally { setSaving(false) }
  }

  const visibleItems = useMemo(() => items.filter(item => {
    const query = `${item.item_name || ''} ${item.campus_location || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase()
    const type = (item.report_type || '').toLowerCase()
    const matchesTab = activeTab !== 'My Reports' || item.reporter_id === session?.user?.id
    const matchesFilter = filter === 'All' || type === filter.toLowerCase()
    return query.includes(search.toLowerCase()) && matchesTab && matchesFilter
  }), [items, search, filter, activeTab, session?.user?.id])
const foundCount = items.filter(item => item.report_type === 'found'|| (item.report_type === 'lost' && item.status === 'returned')).length
  const lostCount = items.filter(item => item.report_type === 'lost').length
  const myCount = items.filter(item => item.reporter_id === session?.user?.id).length

  if (authLoading) return <div className="fi"><div className="auth-wrap"><div className="auth-card">Loading FINDIT and checking your session…</div></div></div>

  if (!session) return <div className="fi"><div className="auth-wrap"><form className="auth-card" onSubmit={handleAuth}>
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

  const navItems = ['Overview', 'Browse Items', 'My Reports', 'My Claims', 'Contact Officials', ...(isStaff ? ['Staff Review'] : []), ...(isAdmin ? ['User Management'] : [])]
  const profileName = profile?.full_name || session.user.user_metadata?.full_name || 'Campus User'
  return <div className="fi"><div className="shell">
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
      <nav className="nav">{navItems.map(name => <button key={name} className={activeTab === name ? 'active' : ''} onClick={() => { setActiveTab(name); setSearch(''); setFilter('All'); if (name === 'User Management') loadAdminUsers(); if (name === 'Contact Officials') loadOfficeMessages() }}>{name === 'Overview' ? '⌂' : name === 'Browse Items' ? '▦' : name === 'My Reports' ? '▤' : name === 'My Claims' ? '◇' : name === 'Staff Review' ? '✓' : '⚙'}　{name}</button>)}</nav>
      <div className="side-bottom"><div className="help">Need assistance?<br/><strong>Central Lost & Found Office</strong><br/>Contact campus staff for collection support.</div><div className="user-mini"><div className="avatar">{profileName.charAt(0).toUpperCase()}</div><div><strong>{profileName}</strong><small>{session.user.email}</small></div></div></div>
    </aside>

    <main className="main"><header className="topbar"><div><span className="crumb">SAVEETHA / CAMPUS SERVICES</span><h1>{activeTab}</h1></div><div className="top-right"><button className="profile-btn" onClick={() => setShowProfile(true)}><span className="avatar">{profileName.charAt(0).toUpperCase()}</span><strong>My Profile ▾</strong></button><button className="btn secondary small" onClick={signOut} disabled={busy}>Sign out</button></div></header>
      {notice && <div className="notice">{notice}</div>}{itemsError && <div className="message error">{itemsError}</div>}

      {(activeTab === 'Overview' || activeTab === 'Browse Items' || activeTab === 'My Reports') && <>
        {activeTab === 'Overview' && <section className="banner"><div><span className="eyebrow" style={{color:'#c4d8f4'}}>YOUR CAMPUS, CONNECTED</span><h2>Lost something?<br/>Let's find it.</h2><p>A simple way to report, discover and recover belongings across Saveetha campus.</p><button className="btn" onClick={() => setShowReport(true)}>＋ Report an item</button></div><div className="banner-art">🎒　🔑　📱</div></section>}
        {activeTab === 'Overview' && <section className="stats"><div className="stat"><span>Total reports</span><strong>{items.length}</strong><small className="muted">Campus reports</small></div><div className="stat"><span>Found items</span><strong>{foundCount}</strong><small className="muted">Reported as found</small></div><div className="stat"><span>Lost items</span><strong>{lostCount}</strong><small className="muted">Being searched for</small></div><div className="stat"><span>My reports</span><strong>{myCount}</strong><small className="muted">Your submissions</small></div></section>}
        <section className="section"><div className="section-head"><div><span className="eyebrow">CAMPUS COMMUNITY</span><h2>{activeTab === 'My Reports' ? 'My submissions' : activeTab === 'Browse Items' ? 'Browse campus items' : 'Recent item reports'}</h2><p>Search reports and contact the office through a claim request.</p></div><button className="btn" onClick={() => setShowReport(true)}>＋ New report</button></div>
          <div className="toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, category, description or location…"/><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Lost</option><option>Found</option></select><button className="btn secondary" onClick={loadItems} disabled={itemsLoading}>{itemsLoading ? 'Loading…' : '↻ Refresh'}</button></div>
          {itemsLoading ? <div className="empty">Loading campus reports…</div> : visibleItems.length ? <div className="grid">{visibleItems.map(item => { const lost = item.report_type === 'lost'; const mine = item.reporter_id === session.user.id; return <article className="item" key={item.id}><div className="item-top item-top-photo">
  {item.photo_url ? <img className="item-photo" src={item.photo_url} alt={item.item_name || 'Reported item'} loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} /> :
    <div className="item-placeholder">{item.category === 'Electronics' ? '📱' : item.category === 'Bags' ? '🎒' : item.category === 'Books' ? '📚' : item.category === 'ID Cards' ? '🪪' : '🔎'}</div>}
  <span className={`pill ${lost ? '' : 'found'}`}>{lost ? 'LOST' : 'FOUND'}</span>
</div><div className="item-body"><span className="eyebrow">{item.category}</span><h3>{item.item_name}</h3><p>⌖ {item.campus_location}</p>{item.description && <p>{item.description}</p>}<div className="item-foot"><span>{dateText(item.incident_date || item.created_at)}</span><span>{(item.status || 'reported').replaceAll('_', ' ')}</span></div>{!mine && (() => {
  const myClaim = (isStaff || isAdmin ? staffClaims : claims).find(
  claim => claim.item_id === item.id
  )

  if (myClaim) {
    return (
      <div className="claim-status">
        <span className={`pill ${myClaim.status === 'approved' ? 'approved' : myClaim.status === 'rejected' ? 'rejected' : 'pending'}`}>
          {myClaim.items?.status === 'returned' ? 'ITEM COLLECTED' : myClaim.status === 'pending' ? 'CLAIM SUBMITTED' : myClaim.status === 'approved' ? 'CLAIM APPROVED' : myClaim.status === 'rejected' ? 'CLAIM REJECTED' : String(myClaim.status || 'submitted').toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <button
      className="btn small"
      style={{width:'100%',marginTop:12}}
      onClick={() => {
        setShowClaim(item)
        setClaimMessage('')
      }}
    >
      Submit a claim
    </button>
  )
})()}</div></article>})}</div> : <div className="empty">No matching reports found. Try another search or create a report.</div>}
        </section>
      </>}
      {activeTab === 'Contact Officials' && <section className="section">
        <div className="section-head"><div><span className="eyebrow">CAMPUS SUPPORT DESK</span><h2>{isStaff ? 'Department inbox' : 'Contact campus officials'}</h2><p>{isStaff ? 'Read student queries and reply securely.' : 'Contact the Central Lost & Found Office or a campus department. Official replies appear here.'}</p></div><button className="btn secondary" onClick={loadOfficeMessages} disabled={officeLoading}>Refresh</button></div>
        {!isStaff && <form className="office-compose" onSubmit={submitOfficeMessage}>
          <label>Office / department</label>
          <select value={officeForm.department} onChange={e => setOfficeForm({...officeForm, department:e.target.value})}>
            <option>Central Lost & Found Office</option><option>Engineering Office</option><option>Administration Office</option><option>Library</option><option>Hostel Office</option><option>Transport Office</option><option>Other Department</option>
          </select>
          <label>Subject</label><input required maxLength="120" value={officeForm.subject} onChange={e => setOfficeForm({...officeForm,subject:e.target.value})} placeholder="Message subject"/>
          <label>Message</label><textarea required maxLength="2000" value={officeForm.message} onChange={e => setOfficeForm({...officeForm,message:e.target.value})} placeholder="Explain what help you need…"/>
          <button className="btn" disabled={saving}>{saving ? 'Sending…' : 'Send message'}</button>
        </form>}
        <div className="office-list"><h3>{isStaff ? 'Student inbox' : 'Your messages'}</h3>
          {officeLoading ? <div className="empty">Loading…</div> : officeMessages.length ? officeMessages.map(message => <article className="office-message" key={message.id}>
            <div className="office-message-head"><div><strong>{message.subject}</strong><small>{message.department} · {dateText(message.created_at)}</small></div><span className={`pill ${message.status === 'answered' ? 'approved' : 'pending'}`}>{message.status || 'open'}</span></div>
            <p className="office-message-body">{message.message}</p>
            {message.staff_reply && <div className="office-reply"><strong>Official reply</strong><p>{message.staff_reply}</p><small>{message.replied_at ? dateText(message.replied_at) : ''}</small></div>}
            {isStaff && <div className="office-reply-form"><textarea value={replyDrafts[message.id] || ''} onChange={e => setReplyDrafts({...replyDrafts,[message.id]:e.target.value})} placeholder="Write official reply…"/><button className="btn small" disabled={saving} onClick={() => replyOfficeMessage(message.id)}>Send reply</button></div>}
          </article>) : <div className="empty">No messages yet.</div>}
        </div>
      </section>}

      {activeTab === 'My Claims' && <section className="section"><div className="section-head"><div><span className="eyebrow">CLAIM TRACKER</span><h2>My claim requests</h2><p>Track the review and collection status of your claims.</p></div><button className="btn secondary" onClick={loadMyClaims}>↻ Refresh</button></div>{claims.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Location</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>{claims.map(claim => <tr key={claim.id}><td>{claim.items?.item_name || 'Item'}</td><td>{claim.items?.campus_location || '—'}</td><td>{dateText(claim.created_at)}</td><td>{claim.status}</td><td>{claim.items?.status === 'returned' ? <span className="pill approved" style={{position:'static'}}>Collected</span> : claim.status === 'approved' ? <button className="btn small" onClick={() => confirmCollection(claim)} disabled={saving || busy}>Confirm received</button> : '—'}</td></tr>)}</tbody></table></div> : <div className="empty">You have not submitted any claims yet. Browse items to submit a claim.</div>}</section>}

      {activeTab === 'Staff Review' && isStaff && <section className="section"><div className="section-head"><div><span className="eyebrow">OFFICE WORKSPACE</span><h2>Claim review queue</h2><p>Review student requests and record item handovers.</p></div><button className="btn secondary" onClick={loadStaffClaims}>↻ Refresh</button></div>{staffClaims.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Claim message</th><th>Student ID</th><th>Status</th><th>Review</th></tr></thead><tbody>{staffClaims.map(claim => <tr key={claim.id}><td>{claim.items?.item_name || 'Item'}</td><td>{claim.claim_message}</td><td>{claim.claimant_id?.slice(0,8)}…</td><td>{claim.status}</td><td><div className="actions">{claim.status === 'pending' && <><button className="btn small" onClick={() => updateClaimStatus(claim,'approved')} disabled={busy}>Approve</button><button className="btn danger small" onClick={() => updateClaimStatus(claim,'rejected')} disabled={busy}>Reject</button></>}{claim.status === 'approved' && <button className="btn secondary small" onClick={() => setReviewClaim(claim)}>Record handover</button>}</div></td></tr>)}</tbody></table></div> : <div className="empty">No claim requests are available.</div>}</section>}

      {activeTab === 'User Management' && isAdmin && <section className="section"><div className="section-head"><div><span className="eyebrow">ADMINISTRATION</span><h2>Campus user management</h2><p>Manage student, staff and administrator roles.</p></div><button className="btn secondary" onClick={loadAdminUsers}>↻ Refresh</button></div>{adminUsersError && <div className="message error">{adminUsersError} Check the profiles SELECT policy for admins.</div>}<div className="table-wrap"><table><thead><tr><th>Name</th><th>Registration no.</th><th>Role</th><th>Change role</th></tr></thead><tbody>{adminUsers.map(user => <tr key={user.id}><td>{user.full_name || 'Campus user'}</td><td>{user.registration_number || '—'}</td><td>{user.role}</td><td><select value={user.role || 'student'} onChange={e => changeUserRole(user.id,e.target.value)} disabled={user.id === session.user.id}><option value="student">Student</option><option value="staff">Staff</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table></div></section>}

      <footer><span>SAVEETHA FINDIT © 2026</span><span>Campus Lost & Found · Student project prototype</span></footer>
    </main>
  </div>
{showReport && <div className="modal-bg" onClick={() => setShowReport(false)}><form className="modal" onSubmit={submitReport} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">CAMPUS REPORT</span><h2>Report an item</h2></div><button type="button" className="close" onClick={() => setShowReport(false)}>×</button></div><div className="form-grid"><div><label>Report type</label><select value={report.report_type} onChange={e => setReport({...report,report_type:e.target.value})}><option value="lost">Lost</option><option value="found">Found</option></select></div><div><label>Category</label><select value={report.category} onChange={e => setReport({...report,category:e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div><div style={{gridColumn:'1/-1'}}><label>Item name</label><input required maxLength="100" value={report.item_name} onChange={e => setReport({...report,item_name:e.target.value})} placeholder="Example: Black water bottle"/></div><div><label>Campus location</label><input required maxLength="150" value={report.campus_location} onChange={e => setReport({...report,campus_location:e.target.value})} placeholder="Library, block, lab…"/></div><div><label>Date</label><input type="date" value={report.incident_date} onChange={e => setReport({...report,incident_date:e.target.value})}/></div><div style={{gridColumn:'1/-1'}}><label>Description</label><textarea maxLength="1000" value={report.description} onChange={e => setReport({...report,description:e.target.value})} placeholder="Describe the item. Keep unique proof private."/></div><div style={{gridColumn:'1/-1'}}><label>Photo (optional)</label><input type="file" accept="image/*" onChange={e => setReport({...report,photo:e.target.files?.[0] || null})}/></div></div><button className="btn full" disabled={saving}>{saving ? 'Submitting…' : 'Submit report'}</button><p className="notice-line">Photo upload requires a private Supabase Storage bucket named findit-items and suitable storage policies.</p></form></div>}

  {showClaim && <div className="modal-bg" onClick={() => setShowClaim(null)}><form className="modal" onSubmit={submitClaim} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">OWNERSHIP REQUEST</span><h2>Claim: {showClaim.item_name}</h2></div><button type="button" className="close" onClick={() => setShowClaim(null)}>×</button></div>{isAdmin ? <p className="intro">This claim will be assigned to the student who originally reported this item and will appear in that student's My Claims.</p> : <p className="intro">Explain why you believe this item belongs to you. Do not post passwords, full ID numbers or sensitive personal information.</p>}{!isAdmin && <><label>Claim message</label><textarea required maxLength="1000" value={claimMessage} onChange={e => setClaimMessage(e.target.value)} placeholder="Describe identifying details that staff can verify…"/> </>}<button className="btn full" disabled={saving}>{saving ? 'Submitting…' : isAdmin ? 'Submit claim for reporting student' : 'Send claim for review'}</button></form></div>}

  {showProfile && <div className="modal-bg" onClick={() => setShowProfile(false)}><section className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>My Profile</h2></div><button className="close" onClick={() => setShowProfile(false)}>×</button></div><div className="profile-grid"><div className="profile-field"><small>Full name</small><strong>{profile?.full_name || profileName}</strong></div><div className="profile-field"><small>Registration number</small><strong>{profile?.registration_number || 'Not provided'}</strong></div><div className="profile-field"><small>Email</small><strong>{session.user.email}</strong></div><div className="profile-field"><small>Account role</small><strong>{profile?.role || 'student'}</strong></div><div className="profile-field"><small>Account created</small><strong>{dateText(session.user.created_at)}</strong></div><div className="profile-field"><small>User ID</small><strong>{session.user.id.slice(0,13)}…</strong></div></div><p className="notice-line">To correct your name or registration number, contact the campus FINDIT office.</p><button className="btn danger full" onClick={signOut} disabled={busy}>Sign out</button></section></div>}

  {reviewClaim && <div className="modal-bg" onClick={() => setReviewClaim(null)}><form className="modal" onSubmit={createHandover} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">OFFICE HANDOVER</span><h2>Record collection</h2></div><button type="button" className="close" onClick={() => setReviewClaim(null)}>×</button></div><label>Storage / collection location</label><input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Central Lost & Found Office"/><label>Handover notes</label><textarea value={handoverNotes} onChange={e => setHandoverNotes(e.target.value)} placeholder="Optional notes for the office record"/><button className="btn full" disabled={saving}>{saving ? 'Saving…' : 'Save handover record'}</button></form></div>}
  </div>
}
