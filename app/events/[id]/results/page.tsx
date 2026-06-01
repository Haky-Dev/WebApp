'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import MyPartnerTab from '@/components/results/MyPartnerTab'
import AllResultsTab from '@/components/results/AllResultsTab'
import type { Pair } from '@/lib/types'

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
  const searchParams = useSearchParams()
  const participantId = searchParams.get('p') ||
    (typeof window !== 'undefined' ? localStorage.getItem('my_participant_id') : null)

  const [pairs, setPairs] = useState<Pair[]>([])
  const [tab, setTab] = useState<Tab>(participantId ? 'my' : 'all')

  useEffect(() => {
    fetch(`/api/pairs/${id}`).then(r => r.json()).then(setPairs)
  }, [id])

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
            배정 결과
          </div>
          <LogoType />
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
