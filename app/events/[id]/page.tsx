'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import RegistrationForm from '@/components/registration/RegistrationForm'
import LogoLongPress from '@/components/LogoLongPress'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import type { Participant } from '@/lib/types'

const PARTICIPANT_KEY = 'my_participant_id'

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const event = useRealtimeEvent(id)
  const [registered, setRegistered] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)

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
      if (res?.ok) {
        const data = await res.json()
        setParticipantCount(data.length ?? 0)
      }
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

  function handleLongPress() {
    router.push(`/events/${id}/admin`)
  }

  if (!event) return <div className="p-6 text-center">불러오는 중...</div>

  if (event.status === 'closed' && !registered) {
    return (
      <main className="max-w-sm mx-auto p-6 text-center">
        <h1 className="text-xl font-bold mb-4">{event.name}</h1>
        <p className="text-gray-500 mb-4">등록이 마감되었습니다.</p>
        <button
          onClick={() => router.push(`/events/${id}/results`)}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          결과 보기
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <LogoLongPress onLongPress={handleLongPress}>
        <h1 className="text-xl font-bold text-center mb-1 select-none">
          🎯 Tournament Draft
        </h1>
      </LogoLongPress>
      <p className="text-center text-gray-500 text-sm mb-6">{event.name}</p>

      {registered ? (
        <div className="text-center space-y-4">
          <div className="text-4xl">✓</div>
          <p className="font-semibold">등록 완료!</p>
          <p className="text-sm text-gray-500">
            주최자가 배정을 시작하면 자동으로 결과가 표시됩니다.
          </p>
          <p className="text-sm text-blue-600">현재 등록: {participantCount}명</p>
        </div>
      ) : (
        <>
          <RegistrationForm eventId={id} onSuccess={handleSuccess} />
          <p className="text-center text-xs text-gray-400 mt-4">
            현재 등록: {participantCount}명
          </p>
        </>
      )}
    </main>
  )
}
