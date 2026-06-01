'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TournamentEvent } from '@/lib/types'

export function useRealtimeEvent(eventId: string) {
  const [event, setEvent] = useState<TournamentEvent | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('events')
      .select('id, name, status, created_at')
      .eq('id', eventId)
      .single()
      .then(({ data }) => { if (data) setEvent(data) })

    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => setEvent(payload.new as TournamentEvent)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  return event
}
