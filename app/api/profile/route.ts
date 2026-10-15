import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { JsonStore } from '@/lib/server-db'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

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

/** Resolve the caller's identity from the signed session cookie (never from the request body/query). */
async function sessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
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
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      { error: 'ไม่สามารถบันทึกโปรไฟล์ได้ในขณะนี้', detail: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    )
  }
}

export async function GET() {
  const STEP = '[GET /api/profile]'
  try {
    const email = await sessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      { error: 'ไม่สามารถโหลดโปรไฟล์ได้', detail: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 },
    )
  }
}
