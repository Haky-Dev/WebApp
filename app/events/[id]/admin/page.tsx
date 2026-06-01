'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import ExpectedList from '@/components/admin/ExpectedList'
import AttendanceTracker from '@/components/admin/AttendanceTracker'
import AssignmentPanel from '@/components/admin/AssignmentPanel'
import AssignmentAnimation from '@/components/animation/AssignmentAnimation'
import type { Participant } from '@/lib/types'

type Tab = 'expected' | 'attendance' | 'assign'

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('expected')
  const [animationPairs, setAnimationPairs] = useState<
    { a: Participant; b: Participant }[] | null
  >(null)

  useEffect(() => {
    const saved = localStorage.getItem('admin_token')
    if (saved) setToken(saved)
  }, [])

  function handleTokenSet(t: string) {
    localStorage.setItem('admin_token', t)
    setToken(t)
  }

  function handleAnimationEnd() {
    router.push(`/events/${id}/results`)
  }

  if (animationPairs) {
    return (
      <AssignmentAnimation
        pairs={animationPairs}
        onEnd={handleAnimationEnd}
      />
    )
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      {!token && (
        <AdminPinModal eventId={id} onSuccess={handleTokenSet} />
      )}

      <h1 className="text-xl font-bold mb-1">🔒 주최자 모드</h1>
      <p className="text-sm text-gray-400 mb-6">Event: {id.slice(0, 8)}...</p>

      <div className="flex border-b mb-6">
        {([
          ['expected', '명단 관리'],
          ['attendance', '참가 확인'],
          ['assign', '마감 / 배정'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm ${tab === key
              ? 'border-b-2 border-blue-600 font-semibold'
              : 'text-gray-400'}`}
          >{label}</button>
        ))}
      </div>

      {token && (
        <>
          {tab === 'expected' && <ExpectedList token={token} eventId={id} />}
          {tab === 'attendance' && <AttendanceTracker token={token} eventId={id} />}
          {tab === 'assign' && (
            <AssignmentPanel
              token={token}
              eventId={id}
              onAssignStart={setAnimationPairs}
            />
          )}
        </>
      )}
    </main>
  )
}
