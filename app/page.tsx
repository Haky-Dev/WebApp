'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import type { TournamentEvent } from '@/lib/types'

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
    <button
      onClick={toggle}
      style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
      aria-label="테마 전환"
    >
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
  const [error, setError] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminTarget, setAdminTarget] = useState<string | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(setEvents)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    setCreating(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    const event = await res.json()
    router.push(`/events/${event.id}`)
  }

  function handleAdminSuccess(token: string) {
    if (!adminTarget) return
    localStorage.setItem(`admin_token_${adminTarget}`, token)
    router.push(`/events/${adminTarget}/admin`)
  }

  function startPress() {
    pressTimer.current = setTimeout(() => setIsAdminMode(m => !m), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  return (
    <main
      className="page-scanline relative"
      style={{ minHeight: '100vh', background: 'var(--bg-base)' }}
    >
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 24px' }}>
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
              onTouchStart={startPress} onTouchEnd={endPress}
            >
              <LogoType />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.05 }}>
              드래프트<br />매니저{isAdminMode && ' 🔒'}
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* 관리자 토너먼트 생성 폼 */}
        {isAdminMode && (
          <div style={{
            marginBottom: 28,
            padding: 20,
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--accent)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', marginBottom: 16, textTransform: 'uppercase' }}>
              🔒 새 토너먼트 만들기
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label">토너먼트 이름</label>
                <input
                  className="input-field"
                  placeholder="예: 봄 클럽 드래프트"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label">관리자 PIN (4자리 이상)</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  required
                  minLength={4}
                />
              </div>
              {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{error}</p>}
              <button type="submit" disabled={creating} className="btn-cta">
                {creating ? '생성 중...' : '+ 토너먼트 만들기'}
              </button>
            </form>
          </div>
        )}

        {/* 토너먼트 목록 */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>
          진행 중인 토너먼트
        </div>

        {events.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>토너먼트가 없습니다.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {events.map(ev => (
            <div
              key={ev.id}
              style={{ display: 'flex', gap: 8 }}
            >
              <button
                onClick={() => router.push(`/events/${ev.id}`)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${borderColor(ev.status)}`,
                  borderRadius: 6,
                  padding: '13px 14px',
                  cursor: 'pointer',
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
              {isAdminMode && (
                <button
                  onClick={() => setAdminTarget(ev.id)}
                  style={{
                    padding: '0 14px',
                    background: 'var(--accent-bg)',
                    border: '1.5px solid var(--accent)',
                    borderRadius: 6,
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
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
