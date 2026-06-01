'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import MyPartnerTab from '@/components/results/MyPartnerTab'
import AllResultsTab from '@/components/results/AllResultsTab'
import type { Pair } from '@/lib/types'

type Tab = 'my' | 'all'

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
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold mb-1">🎯 Tournament Draft</h1>
      <p className="text-sm text-gray-400 mb-6">파트너 배정 결과</p>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setTab('my')}
          className={`flex-1 py-2 text-sm ${tab === 'my'
            ? 'border-b-2 border-blue-600 font-semibold'
            : 'text-gray-400'}`}
        >내 파트너</button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 text-sm ${tab === 'all'
            ? 'border-b-2 border-blue-600 font-semibold'
            : 'text-gray-400'}`}
        >전체 결과</button>
      </div>

      {tab === 'my' && (
        <MyPartnerTab pairs={pairs} participantId={participantId} />
      )}
      {tab === 'all' && (
        <AllResultsTab pairs={pairs} highlightId={participantId} />
      )}
    </main>
  )
}
