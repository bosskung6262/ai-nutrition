'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Dumbbell,
  Flame,
  History,
  Loader2,
  Plus,
  Server,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { getDailyQuota, loadProfile, removeSavedMeal } from '@/lib/store'
import { DAILY_QUOTA_MAX, type DailyQuota, type Profile, type SavedMeal } from '@/lib/types'

const RANK_ICONS: Record<number, typeof Award> = {
  1: Award,
  2: Dumbbell,
  3: Clock,
}

const TONE_CLASS: Record<string, string> = {
  gold: 'rank-badge-gold',
  sage: 'rank-badge-sage',
  ochre: 'rank-badge-ochre',
}

const MEAL_TIME_MAP: Record<string, string> = {
  breakfast: 'มื้อเช้า',
  lunch: 'มื้อกลางวัน',
  dinner: 'มื้อเย็น',
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2'

const CARD = 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm'

const ICON_TILE =
  'grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/25 text-[var(--primary-dark)]'

function formatThaiTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} น.`
  } catch {
    return iso
  }
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [quota, setQuota] = useState<DailyQuota>({
    date: new Date().toISOString().split('T')[0],
    used: 0,
    max: DAILY_QUOTA_MAX,
  })
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saved, setSaved] = useState<SavedMeal[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedVia, setSavedVia] = useState<'supabase' | 'fallback' | 'unknown'>('unknown')
  const [deleteBusy, setDeleteBusy] = useState<Set<string>>(new Set())
  const [openCard, setOpenCard] = useState<number | null>(null)

  const fetchSaved = useCallback(async () => {
    if (!user?.email) return
    setSavedLoading(true)
    try {
      const res = await fetch('/api/saved-meals')
      if (!res.ok) throw new Error(`GET /api/saved-meals -> ${res.status}`)
      const data = (await res.json().catch(() => null)) as
        | { meals?: SavedMeal[]; via?: string }
        | null
      setSaved(data?.meals || [])
      setSavedVia(data?.via === 'supabase' ? 'supabase' : 'unknown')
    } catch {
      setSaved(getLocalSavedFallback())
      setSavedVia('fallback')
    } finally {
      setSavedLoading(false)
    }
  }, [user?.email])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    setQuota(getDailyQuota())
    setProfile(loadProfile())
    void fetchSaved()
  }, [loading, user, router, fetchSaved])

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
        <div className="font-[var(--font-kanit)] text-base text-muted-foreground">กำลังโหลด...</div>
      </div>
    )
  }

  const remaining = Math.max(0, quota.max - quota.used)

  const onDeleteSaved = async (id: string) => {
    setDeleteBusy((prev) => new Set(prev).add(id))
    try {
      if (user?.email) {
        await fetch(
          `/api/saved-meals?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        ).catch(() => null)
      }
    } finally {
      removeSavedMeal(id)
      setSaved((prev) => prev.filter((m) => m.id !== id))
      setDeleteBusy((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      if (openCard !== null) {
        const foundIdx = saved.findIndex((m) => m.id === id)
        if (foundIdx === openCard) setOpenCard(null)
        else if (foundIdx !== -1 && foundIdx < openCard) setOpenCard((c) => (c as number) - 1)
      }
    }
  }

  const toggleCard = (idx: number) => {
    setOpenCard((cur) => (cur === idx ? null : idx))
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <div className="shell pt-9">
        <div className="mb-7">
          <h1 className="font-[var(--font-kanit)] text-2xl font-semibold text-[var(--foreground)]">
            สวัสดีค่ะ, <span className="text-primary">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            มาสร้างเมนูสุขภาพที่<span className="text-primary font-medium">เหมาะกับคุณ</span>วันนี้กันเถอะ
          </p>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className={`${CARD} p-5 sm:p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={ICON_TILE}>
                  <Target className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">My Profile</span>
                  <h2 className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                    สรุปเป้าหมายสุขภาพ
                  </h2>
                </div>
              </div>
              <button
                className={`btn-ghost text-xs ${FOCUS_RING}`}
                onClick={() => router.push('/onboarding')}
              >
                <Sparkles className="h-3.5 w-3.5" />
                ตั้งค่าใหม่
              </button>
            </div>

            {profile ? (
              <>
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                    <div className="flex min-h-5 items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                      <Activity className="h-3.5 w-3.5" />
                      BMR
                    </div>
                    <div className="mt-1 font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                      {profile.bmr?.toLocaleString() ?? '-'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">กิโลแคลอรีพื้นฐาน</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                    <div className="flex min-h-5 items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                      <Zap className="h-3.5 w-3.5" />
                      TDEE
                    </div>
                    <div className="mt-1 font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                      {profile.tdee?.toLocaleString() ?? '-'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">กิโลแคลอรีต่อวัน</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent)]/25 p-4">
                    <div className="flex min-h-5 items-center gap-1.5 text-xs font-medium text-[var(--primary)]">
                      <Flame className="h-3.5 w-3.5" />
                      Target Calories
                    </div>
                    <div className="mt-1 font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                      {profile.targetCalories?.toLocaleString() ?? (profile.tdee ? Math.round(profile.tdee * 0.9).toLocaleString() : '-')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">เป้าหมายต่อมื้อ/วัน</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5">
                  <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">อายุ {profile.age} ปี</span>
                  <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
                    {profile.gender === 'male' ? 'ชาย' : profile.gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}
                  </span>
                  <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">ส่วนสูง {profile.height} ซม.</span>
                  <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">น้ำหนัก {profile.weight} กก.</span>
                  {profile.diet && profile.diet !== 'none' && (
                    <span className="tag-pill bg-primary/10 text-primary border-none text-[11px]">{profile.diet}</span>
                  )}
                  {profile.health.length > 0 &&
                    profile.health.slice(0, 3).map((h) => (
                      <span key={h} className="tag-pill bg-primary/10 text-primary border-none text-[11px]">
                        {h}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-6 text-center">
                <div className="font-[var(--font-kanit)] text-sm text-[var(--foreground)]">
                  ยังไม่ได้ตั้งค่าข้อมูลสุขภาพ
                </div>
                <div className="mt-1 mb-4 text-xs text-[var(--muted)]">
                  กรุณาตั้งค่าเพื่อให้ AI วางแผนเมนูที่เหมาะสมกับร่างกายคุณ
                </div>
                <button
                  className={`btn-primary ${FOCUS_RING}`}
                  onClick={() => router.push('/onboarding')}
                >
                  <Sparkles className="h-4 w-4" />
                  เริ่มตั้งค่าโปรไฟล์
                </button>
              </div>
            )}
          </div>

          <div className={`${CARD} p-5 sm:p-6`}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className={ICON_TILE}>
                <Award className="h-4 w-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">Daily Quota</span>
                <h2 className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                  โควต้าวันนี้
                </h2>
              </div>
            </div>

            <div className="py-3 text-center">
              <span className="quota-badge text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                โควต้าเจนเมนูวันนี้เหลือ {remaining}/{quota.max} ครั้ง
              </span>
            </div>

            <div className="mb-5 flex gap-2.5">
              {Array.from({ length: quota.max }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    i < quota.used
                      ? 'bg-[var(--card)] opacity-35'
                      : 'bg-gradient-to-r from-[var(--accent)] to-[var(--brand)]'
                  }`}
                />
              ))}
            </div>

            <div className="mb-5 flex justify-between text-xs text-[var(--muted)]">
              <span>ใช้ไปแล้ว {quota.used} ครั้ง</span>
              <span>รีเซ็ตใหม่ในวันพรุ่งนี้</span>
            </div>

            <button
              className={`btn-primary w-full ${FOCUS_RING}`}
              disabled={remaining <= 0}
              onClick={() => router.push(profile ? '/pantry' : '/onboarding')}
            >
              <Plus className="h-4 w-4" />
              สร้างเมนูอาหารใหม่
            </button>

            {remaining <= 0 && (
              <div className="mt-2.5 text-center text-xs text-[var(--muted)]">
                โควต้าวันนี้หมดแล้ว มาเจนเมนูใหม่พรุ่งนี้นะคะ
              </div>
            )}
          </div>
        </div>

        <div className={`${CARD} p-5 sm:p-6`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={ICON_TILE}>
                <History className="h-4 w-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">Recent Activity</span>
                <h2 className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                  ประวัติบันทึกเมนู
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                  savedVia === 'supabase'
                    ? 'bg-[var(--accent)]/25 text-[var(--primary-dark)]'
                    : 'bg-[var(--color-card)]/50 text-[var(--muted)]'
                }`}
              >
                {savedVia === 'fallback' ? (
                  <Server className="h-3 w-3" />
                ) : (
                  <Database className="h-3 w-3" />
                )}
                {savedVia === 'supabase'
                  ? 'ฐานข้อมูล Supabase'
                  : savedVia === 'fallback'
                  ? 'Local Storage'
                  : 'กำลังโหลด...'}
              </span>
              <div className="text-xs text-[var(--muted)]">{saved.length} รายการ</div>
            </div>
          </div>

          {savedLoading ? (
            <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-12 text-sm text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
              กำลังโหลดประวัติบันทึกเมนู...
            </div>
          ) : saved.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-12 text-center">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)]/25 text-[var(--primary)]">
                <History className="h-5 w-5" />
              </span>
              <div className="mb-1.5 font-[var(--font-kanit)] text-sm text-[var(--foreground)]">
                ยังไม่มีเมนูที่บันทึกไว้
              </div>
              <div className="mb-5 text-xs text-[var(--muted)]">
                สร้างเมนูแรกของคุณแล้วกดบันทึกเมื่อพบเมนูที่ชอบนะคะ
              </div>
              <button
                className={`btn-secondary ${FOCUS_RING}`}
                onClick={() => router.push(profile ? '/pantry' : '/onboarding')}
              >
                <Plus className="h-3.5 w-3.5" />
                สร้างเมนูอาหารใหม่
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((meal, idx) => {
                const Icon = RANK_ICONS[meal.recipe.rankNum] || Award
                const expanded = openCard === idx
                const isDeleting = deleteBusy.has(meal.id)
                return (
                  <div
                    key={meal.id}
                    className={`group relative flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                      expanded ? '' : 'min-h-[300px]'
                    }`}
                  >
                    <button
                      onClick={() => onDeleteSaved(meal.id)}
                      disabled={isDeleting}
                      className={`absolute top-3 right-3 z-[2] grid h-7 w-7 place-items-center rounded-full text-[var(--color-danger)] transition-all duration-300 disabled:cursor-wait ${FOCUS_RING} ${
                        isDeleting ? 'bg-[var(--color-danger)]/20' : 'bg-[var(--color-danger)]/10'
                      } ${expanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
                      aria-label="ลบ"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <div className={TONE_CLASS[meal.recipe.tone] || 'rank-badge-sage'}>
                        <Icon className="h-3 w-3" />
                        {meal.recipe.rank}
                      </div>
                      <div className="pr-8 text-right text-[10px] leading-snug text-[var(--muted)]">
                        <div className="font-medium">
                          {MEAL_TIME_MAP[meal.mealTime] || meal.mealTime} · {meal.date}
                        </div>
                        <div>{formatThaiTimestamp(meal.savedAt)}</div>
                      </div>
                    </div>

                    <h3 className="font-[var(--font-kanit)] text-[15px] leading-snug font-semibold text-[var(--foreground)]">
                      {meal.recipe.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="tag-pill bg-primary/10 text-primary border-none text-[10px] py-1 px-2.5">
                        <Flame className="h-3 w-3" /> {meal.recipe.kcal} kcal
                      </span>
                      {meal.recipe.time && (
                        <span className="tag-pill bg-primary/10 text-primary border-none text-[10px] py-1 px-2.5">
                          <Clock className="h-3 w-3" /> {meal.recipe.time}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 grid grid-cols-3 gap-1.5 border-t border-[var(--border)] pt-3">
                      <div className="rounded-xl bg-[var(--bg)] p-2 text-center">
                        <b className="text-[13px] font-semibold text-[var(--foreground)]">{meal.recipe.macros[0]}</b>
                        <div className="text-[10px] text-[var(--muted)]">โปรตีน</div>
                      </div>
                      <div className="rounded-xl bg-[var(--bg)] p-2 text-center">
                        <b className="text-[13px] font-semibold text-[var(--foreground)]">{meal.recipe.macros[1]}</b>
                        <div className="text-[10px] text-[var(--muted)]">คาร์โบ</div>
                      </div>
                      <div className="rounded-xl bg-[var(--bg)] p-2 text-center">
                        <b className="text-[13px] font-semibold text-[var(--foreground)]">{meal.recipe.macros[2]}</b>
                        <div className="text-[10px] text-[var(--muted)]">ไขมัน</div>
                      </div>
                    </div>

                    <div className={expanded ? 'pt-2.5' : 'mt-auto'}>
                      <div className="mb-2 font-[var(--font-kanit)] text-xs font-semibold text-[var(--foreground)]">
                        ส่วนผสม
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[13px] leading-relaxed text-[var(--muted)]">
                        {(expanded ? meal.recipe.ingredients : meal.recipe.ingredients.slice(0, 3)).map((ing, j) => (
                          <div key={j} className="truncate">• {ing}</div>
                        ))}
                        {!expanded && meal.recipe.ingredients.length > 3 && (
                          <div className="text-[var(--primary)] text-xs font-medium">
                            +{meal.recipe.ingredients.length - 3} เพิ่มเติม
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCard(idx)}
                      className={`mt-1.5 flex w-full items-center justify-between border-t border-[var(--border)] pt-2.5 text-xs font-semibold text-[var(--primary)] ${FOCUS_RING}`}
                    >
                      <span>{expanded ? 'ย่อรายการ' : 'ดูส่วนผสมและข้อมูลเต็ม'}</span>
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getLocalSavedFallback(): SavedMeal[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem('ai-nutrition-saved')
    return raw ? (JSON.parse(raw) as SavedMeal[]) : []
  } catch {
    return []
  }
}
