import { NextRequest, NextResponse } from 'next/server'
import { signMasterToken } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  if (!pin) return NextResponse.json({ error: 'Missing pin' }, { status: 400 })

  if (pin !== process.env.MASTER_ADMIN_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = await signMasterToken()
  return NextResponse.json({ token })
}
