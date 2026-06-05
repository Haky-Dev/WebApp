'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import AdminParticipantPanel from '@/components/admin/AdminParticipantPanel'
import AssignmentPanel from '@/components/admin/AssignmentPanel'
import AssignmentAnimation from '@/components/animation/AssignmentAnimation'
import GroupDrawCeremony from '@/components/animation/GroupDrawCeremony'
import type { Participant, EventStatus } from '@/lib/types'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'

type Tab = 'participants' | 'assign'

const TABS: [Tab, string][] = [
  ['participants', '명단 관리'],
  ['assign', '마감 / 배정'],
]

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tokenChecked, setTokenChecked] = useState(false)
  const [isMaster, setIsMaster] = useState(false)
  const [tab, setTab] = useState<Tab>('participants')
  const [animationPairs, setAnimationPairs] = useState<{ a: Participant; b: Participant }[] | null>(null)
  const [ceremonyGroups, setCeremonyGroups] = useState<DrawnGroup[] | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [eventStatus, setEventStatus] = useState<EventStatus>('collecting')
  const [eventName, setEventName] = useState<string>('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const adminSaved = localStorage.getItem(`admin_token_${id}`)
    const masterSaved = localStorage.getItem('master_token')
    if (adminSaved) {
      setToken(adminSaved)
    } else if (masterSaved) {
      setToken(masterSaved)
      setIsMaster(true)
    }
    setTokenChecked(true)
  }, [])

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.status) setEventStatus(data.status)
        if (data.name) setEventName(data.name)
      })
  }, [id])

  function handleTokenSet(t: string) {
    localStorage.setItem(`admin_token_${id}`, t)
    setToken(t)
  }

  function handleAnimationEnd() {
    router.push(`/events/${id}/results`)
  }

  async function handlePublish() {
    if (!token) return
    setPublishing(true)
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: id }),
    })
    setPublishing(false)
    if (res.ok) router.push(`/events/${id}/results`)
  }

  async function handleDelete() {
    if (!token) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      localStorage.removeItem(`admin_token_${id}`)
      router.push('/')
    } else {
      const data = await res.json()
      setDeleteError(data.error ?? '삭제 실패')
      setDeleting(false)
    }
  }

  async function handleReset() {
    if (!token) return
    setResetting(true)
    const res = await fetch('/api/admin/pairs', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: id }),
    })
    setResetting(false)
    if (res.ok) {
      setEventStatus('collecting')
      setCeremonyGroups(null)
      setShowResetConfirm(false)
      setTab('participants')
    }
  }

  if (animationPairs) {
    return <AssignmentAnimation pairs={animationPairs} onEnd={handleAnimationEnd} />
  }

  if (ceremonyGroups) {
    return <GroupDrawCeremony groups={ceremonyGroups} publishing={publishing} onPublish={handlePublish} />
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>
        {tokenChecked && !token && <AdminPinModal eventId={id} onSuccess={handleTokenSet} />}

        {/* 배정 초기화 확인 모달 */}
        {showResetConfirm && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ borderTop: '2px solid var(--neon-cyan)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                ⚠ 배정 초기화
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>배정을 초기화할까요?</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
                배정 결과가 삭제되고 다시 배정할 수 있습니다.<br />참가자는 유지됩니다.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  취소
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="btn-danger"
                  style={{ flex: 1 }}
                >
                  {resetting ? '초기화 중...' : '초기화'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 토너먼트 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ borderTop: '2px solid var(--accent-danger)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-danger)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                ⚠ 토너먼트 삭제
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>정말 삭제할까요?</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
                참가자, 명단, 배정 결과 포함<br />모든 데이터가 삭제됩니다.
              </p>
              {deleteError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{deleteError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                  disabled={deleting}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger"
                  style={{ flex: 1 }}
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <button
              onClick={() => router.push('/')}
              style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
            >
              ← 홈
            </button>
            <div style={{ fontSize: 11, fontWeight: 800, color: isMaster ? 'var(--neon-cyan)' : 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 5 }}>
              {isMaster ? '⚡ 마스터 모드' : '🔒 주최자 모드'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {eventName || id.slice(0, 8) + '...'}
            </div>
          </div>
          {token && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {eventStatus === 'closed' && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  배정 초기화
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                토너먼트 삭제
              </button>
            </div>
          )}
        </div>

        {/* 탭 (2개) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: tab === key ? 900 : 700,
                color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {token && (
          <>
            {tab === 'participants' && <AdminParticipantPanel token={token} eventId={id} />}
            {tab === 'assign' && (
              eventStatus === 'drawing' ? (
                <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1.5px solid var(--neon-cyan)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon-cyan)' }}>추첨이 진행 중입니다 (결과 비공개)</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6 }}>
                    결과를 발표하면 참가자 기기에 자동으로 표시됩니다.
                  </p>
                  <button onClick={handlePublish} disabled={publishing} className="btn-cta">
                    {publishing ? '발표 중...' : '결과 발표 ✓'}
                  </button>
                  <button onClick={() => setShowResetConfirm(true)} className="btn-ghost">배정 초기화</button>
                </div>
              ) : (
                <AssignmentPanel
                  token={token}
                  eventId={id}
                  eventStatus={eventStatus}
                  onAssignStart={(pairs) => { setEventStatus('closed'); setAnimationPairs(pairs) }}
                  onGroupDrawStart={(groups) => { setEventStatus('drawing'); setCeremonyGroups(groups) }}
                  onReset={handleReset}
                />
              )
            )}
          </>
        )}
      </div>
    </main>
  )
}
