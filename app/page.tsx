'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import type { TournamentEvent, Club } from '@/lib/types'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme') as 'dark' | 'light'
    setTheme(t || 'light')
  }, [])
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setTheme(next)
  }
  return (
    <button onClick={toggle} style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }} aria-label="테마 전환">
      {theme === 'dark' ? '☀️' : '🌑'}
    </button>
  )
}

function statusLabel(status: string) {
  if (status === 'collecting') return <span className="badge-collecting">모집 중</span>
  return <span className="badge-closed">배정 완료</span>
}

function borderColor(status: string) {
  return status === 'collecting' ? 'var(--neon-pink)' : 'var(--neon-green)'
}

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = useState<TournamentEvent[]>([])
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // 마스터 어드민 상태
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [masterToken, setMasterToken] = useState<string | null>(null)
  const [showMasterPinModal, setShowMasterPinModal] = useState(false)
  const [masterPinInput, setMasterPinInput] = useState('')
  const [masterPinError, setMasterPinError] = useState('')

  // 이벤트별 어드민 접근
  const [adminTarget, setAdminTarget] = useState<string | null>(null)

  // 동호회 관리
  const [clubs, setClubs] = useState<Club[]>([])
  const [newClubName, setNewClubName] = useState('')
  const [clubError, setClubError] = useState('')

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const createPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(setEvents)
    const saved = localStorage.getItem('master_token')
    if (saved) { setMasterToken(saved); setIsMasterAdmin(true) }
  }, [])

  useEffect(() => {
    if (isMasterAdmin) {
      fetch('/api/clubs').then(r => r.json()).then(setClubs)
    }
  }, [isMasterAdmin])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    setCreating(false)
    if (!res.ok) { const d = await res.json(); setCreateError(d.error); return }
    const event = await res.json()
    router.push(`/events/${event.id}`)
  }

  async function handleMasterPinSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMasterPinError('')
    const res = await fetch('/api/admin/verify-master-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: masterPinInput }),
    })
    if (!res.ok) { setMasterPinError('마스터 PIN이 올바르지 않습니다.'); return }
    const { token } = await res.json()
    localStorage.setItem('master_token', token)
    setMasterToken(token)
    setIsMasterAdmin(true)
    setShowMasterPinModal(false)
    setMasterPinInput('')
  }

  function handleAdminSuccess(token: string) {
    if (!adminTarget) return
    localStorage.setItem(`admin_token_${adminTarget}`, token)
    router.push(`/events/${adminTarget}/admin`)
  }

  async function handleAddClub(e: React.FormEvent) {
    e.preventDefault()
    setClubError('')
    if (!newClubName.trim() || !masterToken) return
    const res = await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` },
      body: JSON.stringify({ name: newClubName }),
    })
    if (!res.ok) { const d = await res.json(); setClubError(d.error); return }
    const club: Club = await res.json()
    setClubs(c => [...c, club].sort((a, b) => a.name.localeCompare(b.name, 'ko')))
    setNewClubName('')
  }

  async function handleDeleteClub(id: string) {
    if (!masterToken) return
    const res = await fetch(`/api/clubs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${masterToken}` },
    })
    if (res.ok) setClubs(c => c.filter(cl => cl.id !== id))
  }

  function startPress() {
    if (isMasterAdmin) return
    pressTimer.current = setTimeout(() => setShowMasterPinModal(true), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function startCreatePress() {
    if (showCreateModal) return
    createPressTimer.current = setTimeout(() => setShowCreateModal(true), 3000)
  }
  function endCreatePress() {
    if (createPressTimer.current) clearTimeout(createPressTimer.current)
  }

  return (
    <main className="page-scanline relative" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 24px' }}>

        {/* 마스터 PIN 모달 */}
        {showMasterPinModal && (
          <div className="modal-overlay">
            <form className="modal-panel" style={{ borderTop: '2px solid var(--neon-green)' }} onSubmit={handleMasterPinSubmit}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                🔑 마스터 어드민
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 18 }}>
                마스터 PIN 입력
              </div>
              <label className="field-label">PIN</label>
              <input
                type="password"
                className="input-field"
                style={{ marginBottom: 12, letterSpacing: '6px' }}
                placeholder="••••"
                value={masterPinInput}
                onChange={e => setMasterPinInput(e.target.value)}
                autoFocus
              />
              {masterPinError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{masterPinError}</p>}
              <button type="submit" className="btn-cta" style={{ marginBottom: 10 }}>확인</button>
              <button type="button" onClick={() => { setShowMasterPinModal(false); setMasterPinError('') }} className="btn-ghost" style={{ width: '100%' }}>취소</button>
            </form>
          </div>
        )}

        {/* 토너먼트 개설 모달 */}
        {showCreateModal && (
          <div className="modal-overlay">
            <form
              className="modal-panel"
              style={{ borderTop: '2px solid var(--neon-cyan)' }}
              onSubmit={handleCreate}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                🏆 토너먼트 개설
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 18 }}>
                새 토너먼트 만들기
              </div>
              <label className="field-label">토너먼트 이름</label>
              <input
                className="input-field"
                style={{ marginBottom: 12 }}
                placeholder="예: 봄 클럽 드래프트"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
              <label className="field-label">관리자 PIN (4자리 이상)</label>
              <input
                type="password"
                className="input-field"
                style={{ marginBottom: 12, letterSpacing: '6px' }}
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                minLength={4}
              />
              {createError && (
                <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{createError}</p>
              )}
              <button type="submit" disabled={creating} className="btn-cta" style={{ marginBottom: 10 }}>
                {creating ? '생성 중...' : '+ 만들기'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: '100%' }}
                onClick={() => {
                  setShowCreateModal(false)
                  setName('')
                  setPin('')
                  setCreateError('')
                }}
              >
                취소
              </button>
            </form>
          </div>
        )}

        {/* 이벤트별 어드민 PIN 모달 */}
        {adminTarget && (
          <AdminPinModal
            eventId={adminTarget}
            onSuccess={handleAdminSuccess}
            onCancel={() => setAdminTarget(null)}
          />
        )}

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div
              style={{ marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
              onMouseDown={startPress} onMouseUp={endPress}
              onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
            >
              <LogoType />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.05 }}>
              드래프트<br />매니저{isMasterAdmin && ' 🔑'}
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* 마스터 어드민 패널 */}
        {isMasterAdmin && (
          <div style={{ marginBottom: 28, padding: 20, background: 'var(--bg-surface)', border: '1.5px solid var(--accent)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', marginBottom: 16, textTransform: 'uppercase' }}>
              🔑 마스터 어드민
            </div>

            {/* 동호회 관리 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                동호회 관리
              </div>
              <form onSubmit={handleAddClub} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="동호회 이름"
                  value={newClubName}
                  onChange={e => setNewClubName(e.target.value)}
                />
                <button type="submit" className="btn-secondary">추가</button>
              </form>
              {clubError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{clubError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {clubs.map(c => (
                  <div key={c.id} className="card-surface" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                    <button
                      onClick={() => handleDeleteClub(c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
                {clubs.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>동호회가 없습니다.</p>
                )}
              </div>
            </div>

            {/* 새 토너먼트 만들기 */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                새 토너먼트 만들기
              </div>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="field-label">토너먼트 이름</label>
                  <input className="input-field" placeholder="예: 봄 클럽 드래프트" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label">관리자 PIN (4자리 이상)</label>
                  <input className="input-field" type="password" placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} required minLength={4} />
                </div>
                {createError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{createError}</p>}
                <button type="submit" disabled={creating} className="btn-cta">
                  {creating ? '생성 중...' : '+ 토너먼트 만들기'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 토너먼트 목록 */}
        <div
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, cursor: 'default', userSelect: 'none' }}
          onMouseDown={startCreatePress} onMouseUp={endCreatePress} onMouseLeave={endCreatePress}
          onTouchStart={startCreatePress} onTouchEnd={endCreatePress} onTouchCancel={endCreatePress}
        >
          진행 중인 토너먼트
        </div>

        {events.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>토너먼트가 없습니다.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => router.push(`/events/${ev.id}`)}
                style={{
                  flex: 1, textAlign: 'left',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${borderColor(ev.status)}`,
                  borderRadius: 6, padding: '13px 14px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{ev.name}</span>
                  {statusLabel(ev.status)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                  {new Date(ev.created_at).toLocaleDateString('ko-KR')}
                </div>
              </button>
              {isMasterAdmin && (
                <button
                  onClick={() => router.push(`/events/${ev.id}/admin`)}
                  style={{
                    padding: '0 14px',
                    background: 'var(--accent-bg)',
                    border: '1.5px solid var(--accent)',
                    borderRadius: 6, color: 'var(--accent)',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  관리
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
