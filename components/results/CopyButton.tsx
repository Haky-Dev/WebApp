'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'

interface Props { pairs: Pair[] }

export default function CopyButton({ pairs }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const header = '팀\t퍼스트 이름\t퍼스트 동호회\t퍼스트 레이팅\t세컨드 이름\t세컨드 동호회\t세컨드 레이팅\t합산 레이팅'
    const rows = pairs.map(p => {
      const ratingA = p.participant_a?.rating ?? 0
      const ratingB = p.participant_b?.rating ?? 0
      return [
        p.group_label ?? p.team_number,
        p.participant_a?.name ?? '',
        p.participant_a?.club ?? '',
        ratingA.toFixed(2),
        p.participant_b?.name ?? '',
        p.participant_b?.club ?? '',
        ratingB.toFixed(2),
        (ratingA + ratingB).toFixed(2),
      ].join('\t')
    })
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
