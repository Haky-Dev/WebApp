'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'

interface Props { pairs: Pair[] }

export default function CopyButton({ pairs }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const header = '팀\t파트너A 이름\t파트너A 동호회\t파트너A 레이팅\t파트너B 이름\t파트너B 동호회\t파트너B 레이팅'
    const rows = pairs.map(p =>
      [
        p.team_number,
        p.participant_a?.name ?? '',
        p.participant_a?.club ?? '',
        p.participant_a?.rating.toFixed(2) ?? '',
        p.participant_b?.name ?? '',
        p.participant_b?.club ?? '',
        p.participant_b?.rating.toFixed(2) ?? '',
      ].join('\t')
    )
    navigator.clipboard.writeText([header, ...rows].join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-ghost"
      style={{ flexShrink: 0, fontSize: 13, padding: '10px 14px', whiteSpace: 'nowrap' }}
    >
      {copied ? '복사됨 ✓' : '구글 시트 복사'}
    </button>
  )
}
