import { NextResponse } from 'next/server'
import { z } from 'zod'
import { JsonStore } from '@/lib/server-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SavedProfile = {
  userEmail: string
  updatedAt: string
  age: string
  gender: string
  height: string
  weight: string
  activity: string
  diet: string
  health: string[]
  avoid: string[]
  bmr?: number
  tdee?: number
  targetCalories?: number
}

const profileStore = new JsonStore<string, SavedProfile>('ai-nutrition-profiles.json')

const profileSchema = z.object({
  userEmail: z.string().email({ message: 'อีเมลไม่ถูกต้อง' }).optional(),
  age: z.string().min(1),
  gender: z.string().min(1),
  height: z.string().min(1),
  weight: z.string().min(1),
  activity: z.string().min(1),
  diet: z.string().default('none'),
  health: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  bmr: z.number().optional(),
  tdee: z.number().optional(),
  targetCalories: z.number().optional(),
})

function normEmail(email: string | undefined): string {
  return (email || '').trim().toLowerCase()
}

export async function POST(req: Request) {
  const STEP = '[POST /api/profile]'
  try {
    const body = (await req.json()) as unknown
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      console.error(`${STEP} Zod validation failed:`, parsed.error.issues)
      return NextResponse.json(
        { error: 'ข้อมูลโปรไฟล์ไม่ถูกต้อง: ' + parsed.error.issues[0]?.message },
        { status: 400 },
      )
    }

    const data = parsed.data
    const email = normEmail(data.userEmail)
    if (!email) {
      return NextResponse.json(
        { error: 'ต้องระบุ userEmail เพื่อบันทึกโปรไฟล์' },
        { status: 400 },
      )
    }

    const saved: SavedProfile = {
      userEmail: email,
      updatedAt: new Date().toISOString(),
      age: data.age,
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      activity: data.activity,
      diet: data.diet,
      health: data.health,
      avoid: data.avoid,
      bmr: data.bmr,
      tdee: data.tdee,
      targetCalories: data.targetCalories,
    }

    profileStore.set(email, saved)
    console.info(`${STEP} Saved profile for ${email} ok`)
    return NextResponse.json({ ok: true, saved }, { status: 200 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถบันทึกโปรไฟล์ได้ในขณะนี้', detail: msg },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  const STEP = '[GET /api/profile]'
  try {
    const { searchParams } = new URL(req.url)
    const email = normEmail(searchParams.get('userEmail') || undefined)
    if (!email) {
      return NextResponse.json(
        { error: 'ต้องระบุ userEmail ใน query string' },
        { status: 400 },
      )
    }
    const found = profileStore.get(email)
    if (!found) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }
    return NextResponse.json({ profile: found }, { status: 200 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`${STEP} Unhandled error:`, msg, error)
    return NextResponse.json(
      { error: 'ไม่สามารถโหลดโปรไฟล์ได้', detail: msg },
      { status: 500 },
    )
  }
}
