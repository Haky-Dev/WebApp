import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

async function authorize(req: NextRequest, participantId: string) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyAdminToken(token)
  if (!payload) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('participants')
    .select('id')
    .eq('id', participantId)
    .eq('event_id', payload.eventId)
    .single()

  return data ? payload : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await authorize(req, id)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { club, rating } = await req.json()
  const updates: Record<string, unknown> = {}

  if (club !== undefined) updates.club = club?.trim() || null
  if (rating !== undefined) {
    const r = Number(rating)
    if (isNaN(r) || r < 0 || r > 30) {
      return NextResponse.json({ error: 'rating must be 0–30' }, { status: 400 })
    }
    updates.rating = Math.round(r * 100) / 100
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await authorize(req, id)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
