import type { Pair } from '@/lib/types'
import RatingBadge from '@/components/ui/RatingBadge'

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
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: 14, fontWeight: 700 }}>본인의 파트너를 확인하려면</p>
        <p style={{ fontSize: 14, fontWeight: 700 }}>QR 코드로 등록한 기기에서 확인해주세요.</p>
      </div>
    )
  }

  const partner = myPair.participant_a_id === participantId
    ? myPair.participant_b!
    : myPair.participant_a!

  return (
    <div>
      <div
        className="partner-card"
        style={{
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--neon-cyan)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
          내 파트너
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
          {myPair.group_label ?? `팀 ${myPair.team_number}`}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 5 }}>
          {partner.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
          {partner.club ? `${partner.club} · ` : ''}레이팅 <RatingBadge rating={partner.rating} fontSize={12} />
        </div>
      </div>
    </div>
  )
}
