'use client'
import { useEffect, useState } from 'react'
import type { Club } from '@/lib/types'

export function useClubColors(): Map<string, string> {
  const [colorMap, setColorMap] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    fetch('/api/clubs')
      .then(r => r.json())
      .then((clubs: Club[]) => {
        const map = new Map<string, string>()
        for (const c of clubs) {
          if (c.color) map.set(c.name, c.color)
        }
        setColorMap(map)
      })
  }, [])
  return colorMap
}
