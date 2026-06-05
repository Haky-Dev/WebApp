import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: participant } = await supabase
    .from('participants')
    .select('event_id, events(status)')
    .eq('id', id)
    .single()

  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const status = (participant.events as { status: string } | null)?.status
  if (status !== 'collecting') {
    return NextResponse.json({ error: 'Registration is closed' }, { status: 409 })
  }

  const { error } = await supabase.from('participants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
