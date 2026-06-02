import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveEventId } from '@/lib/auth/admin-token'

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const eventId = await resolveEventId(token, body.eventId)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { error: pairsError } = await supabase
    .from('pairs')
    .delete()
    .eq('event_id', eventId)

  if (pairsError) return NextResponse.json({ error: pairsError.message }, { status: 500 })

  const { error: statusError } = await supabase
    .from('events')
    .update({ status: 'collecting' })
    .eq('id', eventId)

  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
