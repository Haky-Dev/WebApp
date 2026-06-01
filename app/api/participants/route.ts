import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json([], { status: 200 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .select('id, name, club, rating, registered_at')
    .eq('event_id', eventId)
    .order('registered_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { eventId, name, club, rating } = await req.json()

  if (!eventId || !name?.trim()) {
    return NextResponse.json({ error: 'eventId and name required' }, { status: 400 })
  }
  const r = Number(rating)
  if (isNaN(r) || r < 0 || r > 30) {
    return NextResponse.json({ error: 'rating must be 0–30' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status !== 'collecting') {
    return NextResponse.json({ error: 'Registration is closed' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      name: name.trim(),
      club: club?.trim() || null,
      rating: Math.round(r * 100) / 100,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
