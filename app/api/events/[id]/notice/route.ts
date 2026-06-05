import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveEventId } from '@/lib/auth/admin-token'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('notice_content')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ slides: data.notice_content ?? null })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = await resolveEventId(token, id)
  if (!eventId || eventId !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slides } = await req.json()
  if (!Array.isArray(slides)) {
    return NextResponse.json({ error: 'slides must be an array' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('events')
    .update({ notice_content: slides })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
