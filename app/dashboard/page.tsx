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
import { DashboardNavbar } from '@/components/DashboardNavbar'
import { getDailyQuota, loadProfile, removeSavedMeal } from '@/lib/store'
import type { DailyQuota, Profile, SavedMeal } from '@/lib/types'

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
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [quota, setQuota] = useState<DailyQuota>({
    date: new Date().toISOString().split('T')[0],
    used: 0,
    max: 3,
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
      const res = await fetch(
        '/api/saved-meals?userEmail=' + encodeURIComponent(user.email),
      )
      const data = (await res.json().catch(() => null)) as
        | { meals?: SavedMeal[]; via?: string }
        | null
      const meals = data?.meals || []
      setSaved(meals)
      setSavedVia((data?.via as 'supabase' | 'fallback') || (meals.length > 0 ? 'unknown' : 'fallback'))
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
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 18, color: 'var(--muted)' }}>กำลังโหลด...</div>
      </div>
    )
  }

  const remaining = Math.max(0, quota.max - quota.used)

  const onDeleteSaved = async (id: string) => {
    setDeleteBusy((prev) => new Set(prev).add(id))
    try {
      if (user?.email) {
        await fetch(
          `/api/saved-meals?userEmail=${encodeURIComponent(user.email)}&id=${encodeURIComponent(id)}`,
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      <DashboardNavbar user={user} onLogout={logout} />

      <div className="shell" style={{ paddingTop: 36 }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: 'var(--font-kanit)',
              margin: 0,
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: 'var(--foreground)',
            }}
          >
            สวัสดีค่ะ, {user.name.split(' ')[0]}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 15 }}>
            มาสร้างเมนูสุขภาพที่เหมาะกับคุณวันนี้กันเถอะ
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 22 }}>
          <div className="glass-card" style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #D2DCB6 0%, #A1BC98 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#5c6b59',
                  }}
                >
                  <Target style={{ width: 20, height: 20 }} />
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-kanit)',
                    margin: 0,
                    fontSize: 18,
                    color: 'var(--foreground)',
                  }}
                >
                  สรุปเป้าหมายสุขภาพ
                </h2>
              </div>
              <button
                className="btn-ghost"
                onClick={() => router.push('/onboarding')}
                style={{ fontSize: 12 }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                ตั้งค่าใหม่
              </button>
            </div>

            {profile ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>
                      <Activity style={{ width: 13, height: 13 }} />
                      BMR
                    </div>
                    <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 26, fontWeight: 600, color: 'var(--foreground)' }}>
                      {profile.bmr?.toLocaleString() ?? '-'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>กิโลแคลอรีพื้นฐาน</div>
                  </div>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>
                      <Zap style={{ width: 13, height: 13 }} />
                      TDEE
                    </div>
                    <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 26, fontWeight: 600, color: 'var(--foreground)' }}>
                      {profile.tdee?.toLocaleString() ?? '-'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>กิโลแคลอรีต่อวัน</div>
                  </div>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #D2DCB6 0%, #A1BC98 100%)',
                      border: '1px solid rgba(119,136,115,0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5c6b59', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                      <Flame style={{ width: 13, height: 13 }} />
                      Target Calories
                    </div>
                    <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 26, fontWeight: 600, color: '#4a5748' }}>
                      {profile.targetCalories?.toLocaleString() ?? (profile.tdee ? Math.round(profile.tdee * 0.9).toLocaleString() : '-')}
                    </div>
                    <div style={{ fontSize: 11, color: '#5c6b59', opacity: 0.85 }}>เป้าหมายต่อมื้อ/วัน</div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 14,
                    borderRadius: 16,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="tag-pill" style={{ fontSize: 11 }}>
                    อายุ {profile.age} ปี
                  </span>
                  <span className="tag-pill" style={{ fontSize: 11 }}>
                    {profile.gender === 'male' ? 'ชาย' : profile.gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}
                  </span>
                  <span className="tag-pill" style={{ fontSize: 11 }}>
                    ส่วนสูง {profile.height} ซม.
                  </span>
                  <span className="tag-pill" style={{ fontSize: 11 }}>
                    น้ำหนัก {profile.weight} กก.
                  </span>
                  {profile.diet && profile.diet !== 'none' && (
                    <span className="tag-pill" style={{ fontSize: 11 }}>
                      {profile.diet}
                    </span>
                  )}
                  {profile.health.length > 0 &&
                    profile.health.slice(0, 3).map((h) => (
                      <span key={h} className="tag-pill" style={{ fontSize: 11 }}>
                        {h}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: 22,
                  borderRadius: 18,
                  background: 'var(--bg)',
                  border: '1px dashed var(--border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 15, color: 'var(--foreground)', marginBottom: 4 }}>
                  ยังไม่ได้ตั้งค่าข้อมูลสุขภาพ
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                  กรุณาตั้งค่าเพื่อให้ AI วางแผนเมนูที่เหมาะสมกับร่างกายคุณ
                </div>
                <button className="btn-primary" onClick={() => router.push('/onboarding')} style={{ padding: '10px 18px', fontSize: 13 }}>
                  <Sparkles style={{ width: 14, height: 14 }} />
                  เริ่มตั้งค่าโปรไฟล์
                </button>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #D2DCB6 0%, #A1BC98 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#5c6b59',
                  }}
                >
                  <Award style={{ width: 20, height: 20 }} />
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-kanit)',
                    margin: 0,
                    fontSize: 18,
                    color: 'var(--foreground)',
                  }}
                >
                  โควต้าวันนี้
                </h2>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '12px 0 18px' }}>
              <div className="quota-badge" style={{ display: 'inline-flex' }}>
                <Sparkles style={{ width: 16, height: 16 }} />
                โควต้าเจนเมนูวันนี้เหลือ {remaining}/{quota.max} ครั้ง
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {Array.from({ length: quota.max }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 999,
                    background: i < quota.used ? 'var(--card)' : 'linear-gradient(90deg, #A1BC98 0%, #778873 100%)',
                    opacity: i < quota.used ? 0.35 : 1,
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--muted)',
                marginBottom: 22,
              }}
            >
              <span>ใช้ไปแล้ว {quota.used} ครั้ง</span>
              <span>รีเซ็ตใหม่ในวันพรุ่งนี้</span>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%' }}
              disabled={remaining <= 0}
              onClick={() => router.push(profile ? '/pantry' : '/onboarding')}
            >
              <Plus style={{ width: 16, height: 16 }} />
              สร้างเมนูอาหารใหม่
            </button>

            {remaining <= 0 && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
                โควต้าวันนี้หมดแล้ว มาเจนเมนูใหม่พรุ่งนี้นะคะ
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'rgba(161,188,152,0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--primary)',
                }}
              >
                <History style={{ width: 20, height: 20 }} />
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-kanit)',
                  margin: 0,
                  fontSize: 18,
                  color: 'var(--foreground)',
                }}
              >
                ประวัติบันทึกเมนู
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: savedVia === 'supabase' ? 'rgba(161,188,152,0.2)' : 'rgba(210,220,182,0.4)',
                  color: savedVia === 'supabase' ? 'var(--primary-dark)' : 'var(--muted)',
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {savedVia === 'supabase' ? (
                  <Database style={{ width: 13, height: 13 }} />
                ) : savedVia === 'fallback' ? (
                  <Server style={{ width: 13, height: 13 }} />
                ) : (
                  <Database style={{ width: 13, height: 13 }} />
                )}
                {savedVia === 'supabase'
                  ? 'ฐานข้อมูล Supabase'
                  : savedVia === 'fallback'
                  ? 'Local Storage'
                  : 'กำลังโหลด...'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {saved.length} รายการ
              </div>
            </div>
          </div>

          {savedLoading ? (
            <div
              style={{
                padding: 54,
                borderRadius: 22,
                background: 'var(--bg)',
                border: '1px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              <Loader2 style={{ width: 22, height: 22, color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              กำลังโหลดประวัติบันทึกเมนู...
            </div>
          ) : saved.length === 0 ? (
            <div
              style={{
                padding: 54,
                borderRadius: 22,
                background: 'var(--bg)',
                border: '1px dashed var(--border)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: 'rgba(161,188,152,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  color: 'var(--primary)',
                }}
              >
                <History style={{ width: 26, height: 26 }} />
              </div>
              <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 16, color: 'var(--foreground)', marginBottom: 6 }}>
                ยังไม่มีเมนูที่บันทึกไว้
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                สร้างเมนูแรกของคุณแล้วกดบันทึกเมื่อพบเมนูที่ชอบนะคะ
              </div>
              <button
                className="btn-secondary"
                onClick={() => router.push(profile ? '/pantry' : '/onboarding')}
              >
                <Plus style={{ width: 14, height: 14 }} />
                สร้างเมนูอาหารใหม่
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {saved.map((meal, idx) => {
                const Icon = RANK_ICONS[meal.recipe.rankNum] || Award
                const expanded = openCard === idx
                const isDeleting = deleteBusy.has(meal.id)
                return (
                  <div
                    key={meal.id}
                    style={{
                      padding: 18,
                      borderRadius: 22,
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      minHeight: expanded ? 'auto' : 320,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(119,136,115,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <button
                      onClick={() => onDeleteSaved(meal.id)}
                      disabled={isDeleting}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isDeleting ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.08)',
                        color: 'var(--color-danger)',
                        border: 'none',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: isDeleting ? 'wait' : 'pointer',
                        opacity: expanded ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                        zIndex: 2,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = expanded ? '1' : '0.7')}
                      aria-label="ลบ"
                    >
                      {isDeleting ? (
                        <Loader2 style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <Trash2 style={{ width: 13, height: 13 }} />
                      )}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div className={TONE_CLASS[meal.recipe.tone] || 'rank-badge-sage'}>
                        <Icon style={{ width: 11, height: 11 }} />
                        {meal.recipe.rank}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'right', lineHeight: 1.35 }}>
                        <div style={{ fontWeight: 500 }}>
                          {MEAL_TIME_MAP[meal.mealTime] || meal.mealTime} · {meal.date}
                        </div>
                        <div>{formatThaiTimestamp(meal.savedAt)}</div>
                      </div>
                    </div>

                    <h3
                      style={{
                        fontFamily: 'var(--font-kanit)',
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        lineHeight: 1.3,
                      }}
                    >
                      {meal.recipe.title}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                      <span className="tag-pill" style={{ fontSize: 11, padding: '4px 10px' }}>
                        <Flame style={{ width: 10, height: 10 }} /> {meal.recipe.kcal} kcal
                      </span>
                      <span className="tag-pill" style={{ fontSize: 11, padding: '4px 10px' }}>
                        <Clock style={{ width: 10, height: 10 }} /> {meal.recipe.time}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                        marginTop: 4,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <div className="bg-[#F1F3E0] rounded-2xl p-3 text-center">
                        <b style={{ fontSize: 14 }}>{meal.recipe.macros[0]}</b>
                                              <div style={{ fontSize: 12 }}>โปรตีน</div>
                      </div>
                                            <div className="bg-[#F1F3E0] rounded-2xl p-3 text-center">
                        <b style={{ fontSize: 14 }}>{meal.recipe.macros[1]}</b>
                                              <div style={{ fontSize: 12 }}>คาร์โบ</div>
                      </div>
                                            <div className="bg-[#F1F3E0] rounded-2xl p-3 text-center">
                        <b style={{ fontSize: 14 }}>{meal.recipe.macros[2]}</b>
                                              <div style={{ fontSize: 12 }}>ไขมัน</div>
                      </div>
                    </div>

                    <div style={{ marginTop: expanded ? 0 : 'auto', paddingTop: expanded ? 10 : 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--font-kanit)',
                          color: 'var(--foreground)',
                          marginBottom: expanded ? 8 : 0,
                        }}
                      >
                        ส่วนผสม
                      </div>
                      {!expanded && (
                                              <div className="grid grid-cols-2 gap-2.5 text-sm text-[#2D3748]" style={{ marginTop: 6 }}>
                          {meal.recipe.ingredients.slice(0, 3).map((ing, j) => (
                                                  <div key={j}>• {ing}</div>
                          ))}
                          {meal.recipe.ingredients.length > 3 && (
                            <div style={{ color: 'var(--primary)' }}>+{meal.recipe.ingredients.length - 3}</div>
                          )}
                        </div>
                      )}
                      {expanded && (
                                              <div className="grid grid-cols-2 gap-2.5 text-sm text-[#2D3748]">
                          {meal.recipe.ingredients.map((ing, j) => (
                                                  <div key={j}>• {ing}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCard(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 0 0',
                        marginTop: 6,
                        background: 'none',
                        border: 'none',
                        borderTop: '1px solid var(--border)',
                        color: 'var(--primary)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{expanded ? 'ย่อรายการ' : 'ดูส่วนผสมและข้อมูลเต็ม'}</span>
                      {expanded ? (
                        <ChevronUp style={{ width: 14, height: 14 }} />
                      ) : (
                        <ChevronDown style={{ width: 14, height: 14 }} />
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
