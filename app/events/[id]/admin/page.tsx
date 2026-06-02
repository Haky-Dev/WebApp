'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import AdminParticipantPanel from '@/components/admin/AdminParticipantPanel'
import AssignmentPanel from '@/components/admin/AssignmentPanel'
import AssignmentAnimation from '@/components/animation/AssignmentAnimation'
import type { Participant } from '@/lib/types'

type Tab = 'participants' | 'assign'

const TABS: [Tab, string][] = [
  ['participants', '명단 관리'],
  ['assign', '마감 / 배정'],
]

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('participants')
  const [animationPairs, setAnimationPairs] = useState<{ a: Participant; b: Participant }[] | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(`admin_token_${id}`)
    if (saved) setToken(saved)
  }, [])

  function handleTokenSet(t: string) {
    localStorage.setItem(`admin_token_${id}`, t)
    setToken(t)
  }

  function handleAnimationEnd() {
    router.push(`/events/${id}/results`)
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

  if (animationPairs) {
    return <AssignmentAnimation pairs={animationPairs} onEnd={handleAnimationEnd} />
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>
        {!token && <AdminPinModal eventId={id} onSuccess={handleTokenSet} />}

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
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 5 }}>
              🔒 주최자 모드
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {id.slice(0, 8)}...
            </div>
          </div>
          {token && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              토너먼트 삭제
            </button>
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
            {tab === 'assign' && <AssignmentPanel token={token} eventId={id} onAssignStart={setAnimationPairs} />}
          </>
        )}
      </div>
    </main>
  )
}
