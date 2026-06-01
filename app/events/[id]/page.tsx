'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import RegistrationForm from '@/components/registration/RegistrationForm'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import type { Participant } from '@/lib/types'

const PARTICIPANT_KEY = 'my_participant_id'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const event = useRealtimeEvent(id)
  const [registered, setRegistered] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (event?.status === 'closed' && registered) {
      const pid = localStorage.getItem(PARTICIPANT_KEY)
      router.push(`/events/${id}/results${pid ? `?p=${pid}` : ''}`)
    }
  }, [event?.status, registered, id, router])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const res = await fetch(`/api/participants?eventId=${id}`).catch(() => null)
      if (res?.ok) { const data = await res.json(); setParticipantCount(data.length ?? 0) }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id])

  function handleSuccess(participant: Participant) {
    localStorage.setItem(PARTICIPANT_KEY, participant.id)
    setRegistered(true)
    setParticipantCount(c => c + 1)
  }

  function startPress() {
    pressTimer.current = setTimeout(() => router.push(`/events/${id}/admin`), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  if (!event) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>불러오는 중...</span>
    </div>
  )

  if (event.status === 'closed' && !registered) {
    return (
      <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 384, width: '100%', padding: '24px', textAlign: 'center' }}>
          <LogoType />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0 8px', letterSpacing: '-0.5px' }}>{event.name}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>참가 신청이 마감되었습니다.</p>
          <button className="btn-cta" onClick={() => router.push(`/events/${id}/results`)}>
            결과 보기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 384, margin: '0 auto', padding: '24px' }}>
        <div
          style={{ textAlign: 'center', marginBottom: 30, cursor: 'pointer', userSelect: 'none' }}
          onMouseDown={startPress} onMouseUp={endPress}
          onTouchStart={startPress} onTouchEnd={endPress}
        >
          <div style={{ marginBottom: 10 }}><LogoType /></div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 5 }}>
            {event.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>참가 신청</div>
        </div>

        {registered ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent-success)' }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>등록 완료!</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
              주최자가 배정을 시작하면<br />자동으로 결과가 표시됩니다.
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              현재 등록:{' '}
              <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{participantCount}명</span>
            </p>
          </div>
        ) : (
          <>
            <RegistrationForm eventId={id} onSuccess={handleSuccess} />
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginTop: 16 }}>
              현재 등록:{' '}
              <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{participantCount}명</span>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
