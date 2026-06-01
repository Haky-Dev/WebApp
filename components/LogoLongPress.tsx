'use client'
import { useRef, useCallback } from 'react'

interface Props {
  onLongPress: () => void
  durationMs?: number
  children: React.ReactNode
}

export default function LogoLongPress({ onLongPress, durationMs = 3000, children }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    timer.current = setTimeout(onLongPress, durationMs)
  }, [onLongPress, durationMs])

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <div
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      className="select-none cursor-pointer"
    >
      {children}
    </div>
  )
}
