'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Award,
  Check,
  Clock,
  Copy,
  Database,
  Dumbbell,
  Flame,
  History,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Server,
  Sparkles,
  Target,
  Ticket,
  Trash2,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { ImportPlaylistModal } from '@/components/ImportPlaylistModal'
import { PlaylistBuilder } from '@/components/PlaylistBuilder'
import { PlaylistDetailModal } from '@/components/PlaylistDetailModal'
import { RecipeInstructionModal } from '@/components/RecipeInstructionModal'
import { ShareCodeModal } from '@/components/ShareCodeModal'
import {
  buildPlaylistShareUrl,
  getDailyQuota,
  loadProfile,
  recipeToMealPlan,
  removeSavedMeal,
} from '@/lib/store'
import { DAILY_QUOTA_MAX, type DailyQuota, type Profile, type SavedMeal } from '@/lib/types'
import type { MealPlanItem, PlaylistPayload } from '@/types/meal-plan'

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

/**
 * Accepts either a raw share code (`NUTRI-7D-RZ9M7D`) or a full share URL
 * (`https://host/dashboard?code=NUTRI-7D-RZ9M7D`) and returns just the code.
 */
function extractShareCode(input: string): string {
  const value = input.trim()
  if (!value) return ''
  try {
    const fromUrl = new URL(value).searchParams.get('code')
    if (fromUrl) return fromUrl.trim().toUpperCase()
  } catch {
    /* not an absolute URL — fall through to the raw/fragment cases */
  }
  // A pasted `…?code=…` fragment without a scheme.
  const match = value.match(/[?&]code=([^&\s]+)/)
  if (match) {
    try {
      return decodeURIComponent(match[1]).trim().toUpperCase()
    } catch {
      return match[1].trim().toUpperCase()
    }
  }
  return value.toUpperCase()
}

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
  const [detailFor, setDetailFor] = useState<SavedMeal | null>(null)
  const [shareCodeSeed, setShareCodeSeed] = useState<{ title: string; meals: MealPlanItem[] } | null>(null)

  // Meal Plan Playlist state
  const [playlists, setPlaylists] = useState<PlaylistPayload[]>([])
  const [codeInput, setCodeInput] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PlaylistPayload | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [detailPlaylist, setDetailPlaylist] = useState<PlaylistPayload | null>(null)
  const [isPlaylistBuilderOpen, setIsPlaylistBuilderOpen] = useState(false)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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

  const fetchPlaylists = useCallback(async () => {
    if (!user?.email) return
    try {
      const res = await fetch('/api/playlists')
      if (!res.ok) return
      const data = (await res.json().catch(() => null)) as
        | { playlists?: PlaylistPayload[] }
        | null
      setPlaylists(data?.playlists || [])
    } catch {
      /* keep whatever we already had */
    }
  }, [user?.email])

  /**
   * Load the profile from the `profiles` table so personalization (target
   * calories, allergies, health conditions) survives a fresh browser session.
   * Falls back to the session-scoped local cache when the API is unavailable.
   */
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { profile?: Profile | null } | null
        if (data?.profile) {
          setProfile(data.profile)
          return
        }
      }
    } catch {
      /* fall through to the local cache */
    }
    setProfile(loadProfile())
  }, [])

  /** Fetch a shared playlist by code and open the import confirmation modal. */
  const loadPlaylist = useCallback(async (rawInput: string) => {
    const code = extractShareCode(rawInput)
    if (!code) return
    setCodeBusy(true)
    setCodeError(null)
    setImportError(null)
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(code)}`)
      if (res.status === 404) {
        setCodeError('ไม่พบแผนการกินนี้ หรือลิงก์ถูกตั้งเป็นส่วนตัว')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json().catch(() => null)) as { playlist?: PlaylistPayload } | null
      if (!data?.playlist) {
        setCodeError('ไม่พบแผนการกินนี้')
        return
      }
      setPreview(data.playlist)
    } catch {
      setCodeError('ไม่สามารถดึงข้อมูลแผนการกินได้ในขณะนี้')
    } finally {
      setCodeBusy(false)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    setQuota(getDailyQuota())
    void fetchProfile()
    void fetchSaved()
    void fetchPlaylists()

    // URL / query-parameter import, e.g. /dashboard?code=NUTRI-3D-XXXX
    const shared = new URLSearchParams(window.location.search).get('code')
    if (shared) {
      setCodeInput(shared)
      void loadPlaylist(shared)
    }
  }, [loading, user, router, fetchProfile, fetchSaved, fetchPlaylists, loadPlaylist])

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
      setDetailFor((current) => (current?.id === id ? null : current))
    }
  }

  /** Offer the clicked meal first, then its siblings, when bundling a share code. */
  const openShareCode = (meal: SavedMeal) => {
    const ordered = [meal, ...saved.filter((item) => item.id !== meal.id)]
    setShareCodeSeed({ title: meal.recipe.title, meals: ordered.map((item) => recipeToMealPlan(item.recipe)) })
  }

  /** Drop `?code=…` from the address bar once the import is done. */
  const clearSharedCode = () => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const onConfirmImport = async () => {
    if (!preview) return
    setImportBusy(true)
    setImportError(null)
    try {
      const res = await fetch('/api/playlists/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: preview.code }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPreview(null)
      setCodeInput('')
      clearSharedCode()
      setToast('นำเข้าแผนการกินลง Dashboard เรียบร้อยแล้ว')
      void fetchPlaylists()
      setTimeout(() => setToast(null), 3200)
    } catch {
      setImportError('นำเข้าแผนการกินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setImportBusy(false)
    }
  }

  const onCopyShareUrl = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildPlaylistShareUrl(code))
      setCopiedCode(code)
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  /** Remove a saved playlist, then drop it from the local list. */
  const onDeletePlaylist = async (code: string) => {
    setDeletingCode(code)
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(code)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPlaylists((prev) => prev.filter((playlist) => playlist.code !== code))
      setDetailPlaylist((current) => (current?.code === code ? null : current))
      setToast('ลบแผนการกินเรียบร้อยแล้ว')
    } catch {
      setToast('ลบแผนการกินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setDeletingCode(null)
      setTimeout(() => setToast(null), 3000)
    }
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

        <div className="mb-5 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className={`${CARD} flex h-full flex-col p-5 sm:p-6`}>
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

          <div className={`${CARD} flex h-full flex-col p-5 sm:p-6`}>
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

            <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--card)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--brand)] transition-all duration-500"
                style={{ width: `${quota.max > 0 ? Math.min(100, (quota.used / quota.max) * 100) : 0}%` }}
              />
            </div>

            <div className="mb-5 flex justify-between text-xs text-[var(--muted)]">
              <span>ใช้ไปแล้ว {quota.used} ครั้ง</span>
              <span>รีเซ็ตใหม่ในวันพรุ่งนี้</span>
            </div>

            <div className="mt-auto">
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
        </div>

        <div className={`${CARD} mb-5 p-5 sm:p-6`}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className={ICON_TILE}>
              <PackagePlus className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">Meal Plan Playlist</span>
              <h2 className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                นำเข้าแผนการกินด้วยโค้ด
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              className="input-field flex-1"
              placeholder="กรอกโค้ดแผนการกิน (เช่น NUTRI-3D-XXXX)"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadPlaylist(codeInput)
              }}
              disabled={codeBusy}
            />
            <button
              className={`btn-primary ${FOCUS_RING}`}
              onClick={() => void loadPlaylist(codeInput)}
              disabled={codeBusy || !codeInput.trim()}
            >
              {codeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              ดึงข้อมูลแผนการกิน
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            วางลิงก์แชร์ทั้งลิงก์ก็ได้ ระบบจะดึงโค้ดให้อัตโนมัติ
          </p>
          {codeError && <p className="mt-2 text-xs text-[var(--color-danger)]">{codeError}</p>}
        </div>

        <div className={`${CARD} mb-5 p-5 sm:p-6`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={ICON_TILE}>
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-[#708c77] uppercase">My Playlists</span>
                <h2 className="font-[var(--font-kanit)] text-xl font-semibold text-[var(--foreground)]">
                  แผนการกินของฉัน
                </h2>
              </div>
            </div>
            <button
              className={`btn-primary text-xs ${FOCUS_RING}`}
              onClick={() => setIsPlaylistBuilderOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              สร้างแผนการกินใหม่
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-center">
              <div className="mb-1.5 font-[var(--font-kanit)] text-sm text-[var(--foreground)]">
                ยังไม่มีแผนการกิน
              </div>
              <div className="text-xs text-[var(--muted)]">
                เริ่มสร้างแผนการกินสำหรับหลายวันเพื่อติดตามโภชนาการที่ดียิ่งขึ้น
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((pl) => {
                const isDeleting = deletingCode === pl.code
                return (
                  <div
                    key={pl.code}
                    role="button"
                    tabIndex={0}
                    aria-label={`ดูรายละเอียดแผน ${pl.title}`}
                    onClick={() => setDetailPlaylist(pl)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setDetailPlaylist(pl)
                      }
                    }}
                    className={`group flex h-full cursor-pointer flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${FOCUS_RING}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="tag-pill bg-primary/10 text-primary border-none text-[10px] py-1 px-2.5">
                        {pl.days} วัน · {pl.meals.length} เมนู
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void onDeletePlaylist(pl.code)
                        }}
                        disabled={isDeleting}
                        className={`grid h-7 w-7 place-items-center rounded-full text-[var(--color-danger)] transition-all duration-300 disabled:cursor-wait ${FOCUS_RING} ${
                          isDeleting ? 'bg-[var(--color-danger)]/20' : 'bg-[var(--color-danger)]/10'
                        }`}
                        aria-label={`ลบแผน ${pl.title}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <h3 className="mt-2 font-[var(--font-kanit)] text-[15px] leading-snug font-semibold text-[var(--foreground)]">
                      {pl.title}
                    </h3>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">โค้ด {pl.code}</p>
                    <div className="mt-auto flex flex-col gap-2 pt-3">
                      <button
                        className={`btn-ghost w-full text-xs ${FOCUS_RING}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setDetailPlaylist(pl)
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        ดูรายละเอียดแผน
                      </button>
                      <button
                        className={`btn-secondary w-full text-xs ${FOCUS_RING}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          void onCopyShareUrl(pl.code)
                        }}
                      >
                        {copiedCode === pl.code ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedCode === pl.code ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์แชร์'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((meal) => {
                const Icon = RANK_ICONS[meal.recipe.rankNum] || Award
                const isDeleting = deleteBusy.has(meal.id)
                return (
                  <div
                    key={meal.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`ดูสูตรเต็ม ${meal.recipe.title}`}
                    onClick={() => setDetailFor(meal)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setDetailFor(meal)
                      }
                    }}
                    className={`group relative flex h-full cursor-pointer flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${FOCUS_RING}`}
                  >
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        void onDeleteSaved(meal.id)
                      }}
                      disabled={isDeleting}
                      className={`absolute top-3 right-3 z-[2] grid h-7 w-7 place-items-center rounded-full text-[var(--color-danger)] opacity-0 transition-all duration-300 group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait ${FOCUS_RING} ${
                        isDeleting ? 'bg-[var(--color-danger)]/20' : 'bg-[var(--color-danger)]/10'
                      }`}
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

                    <h3 className="line-clamp-2 font-[var(--font-kanit)] text-[15px] leading-snug font-semibold text-[var(--foreground)]">
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

                    <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--border)] pt-3">
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

                    <div className="mt-auto">
                      <div className="mb-2 font-[var(--font-kanit)] text-xs font-semibold text-[var(--foreground)]">
                        ส่วนผสม
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[13px] leading-relaxed text-[var(--muted)]">
                        {meal.recipe.ingredients.slice(0, 3).map((ing, j) => (
                          <div key={j} className="truncate">• {ing}</div>
                        ))}
                        {meal.recipe.ingredients.length > 3 && (
                          <div className="text-[var(--primary)] text-xs font-medium">
                            +{meal.recipe.ingredients.length - 3} เพิ่มเติม
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDetailFor(meal)
                        }}
                        className={`btn-ghost text-xs ${FOCUS_RING}`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        ดูสูตรเต็ม
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openShareCode(meal)
                        }}
                        className={`btn-secondary text-xs ${FOCUS_RING}`}
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        สร้างโค้ดแชร์
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {preview && (
        <ImportPlaylistModal
          playlist={preview}
          busy={importBusy}
          error={importError}
          onClose={() => {
            if (importBusy) return
            setPreview(null)
          }}
          onConfirm={() => void onConfirmImport()}
        />
      )}

      {detailPlaylist && (
        <PlaylistDetailModal
          playlist={detailPlaylist}
          profile={profile}
          deleting={deletingCode === detailPlaylist.code}
          onDelete={() => void onDeletePlaylist(detailPlaylist.code)}
          onClose={() => setDetailPlaylist(null)}
        />
      )}

      {isPlaylistBuilderOpen && (
        <PlaylistBuilder
          savedMeals={saved}
          profile={profile}
          onCreated={() => {
            setIsPlaylistBuilderOpen(false)
            void fetchPlaylists()
            setToast('สร้างแผนการกินใหม่เรียบร้อยแล้ว')
            setTimeout(() => setToast(null), 3000)
          }}
          onClose={() => setIsPlaylistBuilderOpen(false)}
        />
      )}

      {detailFor && (
        <RecipeInstructionModal
          recipe={detailFor.recipe}
          onCreateShareCode={() => openShareCode(detailFor)}
          onClose={() => setDetailFor(null)}
        />
      )}

      {shareCodeSeed && (
        <ShareCodeModal
          meals={shareCodeSeed.meals}
          defaultTitle={shareCodeSeed.title}
          onCreated={() => void fetchPlaylists()}
          onClose={() => setShareCodeSeed(null)}
        />
      )}
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
