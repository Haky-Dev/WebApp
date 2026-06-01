import type { Pair } from '@/lib/types'

interface Props {
  pairs: Pair[]
  participantId: string | null
}

export default function MyPartnerTab({ pairs, participantId }: Props) {
  const myPair = participantId
    ? pairs.find(p => p.participant_a_id === participantId || p.participant_b_id === participantId)
    : null

  if (!myPair) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>본인의 파트너를 확인하려면</p>
        <p>QR 코드로 등록한 기기에서 확인해주세요.</p>
      </div>
    )
  }

  const me = myPair.participant_a_id === participantId
    ? myPair.participant_a!
    : myPair.participant_b!
  const partner = myPair.participant_a_id === participantId
    ? myPair.participant_b!
    : myPair.participant_a!

  return (
    <div className="space-y-6 py-4">
      <div className="text-center p-6 bg-blue-50 rounded-2xl">
        <p className="text-xs text-gray-400 mb-1">팀 {myPair.team_number}</p>
        <p className="font-semibold mb-4">{me.name}의 파트너</p>
        <div className="text-3xl font-bold text-blue-700">{partner.name}</div>
        {partner.club && <p className="text-sm text-gray-500 mt-1">{partner.club}</p>}
        <p className="text-lg text-gray-600 mt-2">레이팅 {partner.rating.toFixed(2)}</p>
      </div>
    </div>
  )
}
