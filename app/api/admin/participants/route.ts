import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, club, rating } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  if (rating === undefined || rating === null) {
    return NextResponse.json({ error: 'rating required' }, { status: 400 })
  }
  const r = Number(rating)
  if (isNaN(r) || r < 0 || r > 30) {
    return NextResponse.json({ error: 'rating must be 0–30' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id: payload.eventId,
      name: name.trim(),
      club: club?.trim() || null,
      rating: Math.round(r * 100) / 100,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
