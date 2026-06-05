'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import MyPartnerTab from '@/components/results/MyPartnerTab'
import AllResultsTab from '@/components/results/AllResultsTab'
import CopyButton from '@/components/results/CopyButton'
import AdminPinModal from '@/components/admin/AdminPinModal'
import PartnerRevealAnimation from '@/components/results/PartnerRevealAnimation'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import type { Pair, Participant } from '@/lib/types'

type Tab = 'my' | 'all'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [participantId, setParticipantId] = useState<string | null>(searchParams.get('p'))

  const isDesktop = useIsDesktop()
  const event = useRealtimeEvent(id)
  const [pairs, setPairs] = useState<Pair[]>([])
  const [tab, setTab] = useState<Tab>(searchParams.get('p') ? 'my' : 'all')
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showReveal, setShowReveal] = useState(false)
  const [revealPartner, setRevealPartner] = useState<Participant | null>(null)
  const [allNames, setAllNames] = useState<string[]>([])

  function startPress() {
    if (adminToken) return
    pressTimer.current = setTimeout(() => setShowPinModal(true), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function handlePinSuccess(token: string) {
    localStorage.setItem(`admin_token_${id}`, token)
    setAdminToken(token)
    setShowPinModal(false)
  }

  useEffect(() => {
    const stored = localStorage.getItem('my_participant_id')
    const effectiveId = searchParams.get('p') || stored
    if (effectiveId && effectiveId !== participantId) {
      setParticipantId(effectiveId)
      setTab('my')
    }

    fetch(`/api/pairs/${id}`)
      .then(r => r.json())
      .then((data: Pair[]) => {
        setPairs(data)
        if (effectiveId && !sessionStorage.getItem(`seen_partner_${id}`)) {
          const myPair = data.find(p =>
            p.participant_a_id === effectiveId || p.participant_b_id === effectiveId
          )
          if (myPair) {
            const partner = myPair.participant_a_id === effectiveId
              ? myPair.participant_b!
              : myPair.participant_a!
            const names = data
              .flatMap(p => [p.participant_a?.name, p.participant_b?.name])
              .filter(Boolean) as string[]
            setRevealPartner(partner)
            setAllNames(names)
            setShowReveal(true)
          }
        }
      })
    setAdminToken(localStorage.getItem(`admin_token_${id}`) || localStorage.getItem('master_token'))
  }, [id])

  useEffect(() => {
    if (event?.status === 'collecting' && !adminToken) {
      router.push(`/events/${id}`)
    }
  }, [event?.status, adminToken, id, router])

  function handleRevealEnd() {
    sessionStorage.setItem(`seen_partner_${id}`, '1')
    setShowReveal(false)
  }

  async function handleReset() {
    if (!adminToken) return
    setResetting(true)
    const res = await fetch('/api/admin/pairs', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: id }),
    })
    setResetting(false)
    if (res.ok) {
      setShowResetConfirm(false)
      router.push(`/events/${id}/admin`)
    }
  }

  if (showReveal && revealPartner) {
    return (
      <PartnerRevealAnimation
        partner={revealPartner}
        allNames={allNames}
        onEnd={handleRevealEnd}
      />
    )
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{
        maxWidth: isDesktop ? 1100 : 512,
        margin: '0 auto',
        padding: isDesktop ? '40px 48px' : '24px',
      }}>

        {showPinModal && (
          <AdminPinModal
            eventId={id}
            onSuccess={handlePinSuccess}
            onCancel={() => setShowPinModal(false)}
          />
        )}

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
                <button onClick={() => setShowResetConfirm(false)} disabled={resetting} className="btn-ghost" style={{ flex: 1 }}>취소</button>
                <button onClick={handleReset} disabled={resetting} className="btn-danger" style={{ flex: 1 }}>
                  {resetting ? '초기화 중...' : '초기화'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <button
              onClick={() => router.push('/')}
              style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
            >
              ← 홈
            </button>
            <button
              onClick={() => router.push(`/events/${id}/notice`)}
              style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
            >
              📋 공지 보기
            </button>
            <div style={{ fontSize: 11, letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
              배정 결과
            </div>
            <div
              style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block' }}
              onMouseDown={startPress} onMouseUp={endPress}
              onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
            >
              <LogoType />
            </div>
          </div>
          {adminToken && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingTop: 20 }}>
              <CopyButton pairs={pairs} />
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: 'var(--neon-cyan)', cursor: 'pointer', padding: 0 }}
              >
                배정 초기화
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {(['my', 'all'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: tab === t ? 900 : 700,
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
              }}
            >
              {t === 'my' ? '내 파트너' : '전체 결과'}
            </button>
          ))}
        </div>

        {tab === 'my' && <MyPartnerTab pairs={pairs} participantId={participantId} />}
        {tab === 'all' && <AllResultsTab pairs={pairs} highlightId={participantId} />}
      </div>
    </main>
  )
}
