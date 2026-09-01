'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Target, Activity, Zap, Flame, Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { TagInput } from '@/components/TagInput'
import { calcBMR, calcTDEE, loadProfile, saveProfile } from '@/lib/store'
import { ACTIVITY_LEVELS, DIET_STYLES, type Profile } from '@/lib/types'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState('')
  const [diet, setDiet] = useState('none')
  const [health, setHealth] = useState<string[]>([])
  const [avoid, setAvoid] = useState<string[]>([])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    const saved = loadProfile()
    if (saved) {
      setAge(saved.age)
      setGender(saved.gender)
      setHeight(saved.height)
      setWeight(saved.weight)
      setActivity(saved.activity)
      setDiet(saved.diet || 'none')
      setHealth(saved.health || [])
      setAvoid(saved.avoid || [])
    }
  }, [loading, user, router])

  const calc = useMemo(() => {
    const p: Profile = { age, gender, height, weight, activity, diet, health, avoid }
    if (p.age && p.gender && p.height && p.weight) {
      p.bmr = calcBMR(p)
      if (p.activity) p.tdee = calcTDEE(p.bmr, p.activity)
      p.targetCalories = p.tdee ? Math.round(p.tdee * 0.9) : undefined
    }
    return p
  }, [age, gender, height, weight, activity, diet, health, avoid])

  const canSubmit = Boolean(age && gender && height && weight && activity)

  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !user || submitting) return
    setSubmitting(true)
    try {
      saveProfile(calc)
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            ...calc,
          }),
        })
      } catch {
        /* server save failure should not block navigation */
      }
      router.push('/pantry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 18, color: 'var(--muted)' }}>กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div
        className="shell"
        style={{ padding: '44px 0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>ขั้นตอนที่ 1/2 · กำหนดเป้าหมายสุขภาพ</div>
      </div>

      <div className="shell">
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ marginBottom: 28, textAlign: 'left' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(161,188,152,0.2)',
                color: 'var(--primary)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.02,
                marginBottom: 16,
              }}
            >
              <Sparkles className="w-3 h-3" />
              โปรไฟล์สุขภาพส่วนตัว
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-kanit)',
                margin: 0,
                fontSize: 42,
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              บอกเล่าเกี่ยวกับตัวคุณ
            </h1>
            <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 15, maxWidth: 560 }}>
              ข้อมูลเหล่านี้จะช่วยให้ AI คำนวณพลังงานที่เผาไหม้ และวางแผนเมนูอาหารที่เหมาะสมกับเป้าหมายของคุณ
            </p>
          </div>

          <form onSubmit={submit} className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/60 shadow-xl my-8">
            <div className="card-header" style={{ marginTop: -4 }}>
              <button
                type="button"
                className="flex items-center gap-2 text-[#778873] hover:opacity-80 font-medium text-sm mb-6"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4" />
                ย้อนกลับ
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                <Target className="w-4 h-4" />
                ข้อมูลพื้นฐาน
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 18 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}>อายุ (ปี)</span>
                <input
                  className="input-field"
                  type="number"
                  min={10}
                  max={100}
                  placeholder="เช่น 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}>เพศ</span>
                <select
                  className="input-field"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">-- กรุณาเลือก --</option>
                  <option value="female">หญิง</option>
                  <option value="male">ชาย</option>
                  <option value="other">ไม่ต้องการระบุ</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}>ส่วนสูง (ซม.)</span>
                <input
                  className="input-field"
                  type="number"
                  min={120}
                  max={220}
                  placeholder="เช่น 165"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}>น้ำหนัก (กก.)</span>
                <input
                  className="input-field"
                  type="number"
                  min={30}
                  max={180}
                  placeholder="เช่น 62"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: '26px 0 0' }}>
              <legend style={{ marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                ระดับกิจกรรมในชีวิตประจำวัน
              </legend>
              <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ACTIVITY_LEVELS.map((lv) => {
                  const selected = activity === lv.id
                  return (
                    <button
                      key={lv.id}
                      type="button"
                      onClick={() => setActivity(lv.id)}
                      aria-pressed={selected}
                      className="hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A1BC98]/20"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 999,
                        border: selected ? '2px solid #778873' : '1.5px solid var(--border)',
                        background: selected ? '#D2DCB6' : '#FFFFFF',
                        color: selected ? 'var(--primary)' : 'var(--foreground)',
                        fontFamily: 'var(--font-prompt)',
                        fontSize: 13,
                        fontWeight: selected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-[#778873]" />}
                      <span>{lv.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset style={{ border: 0, padding: 0, margin: '26px 0 0' }}>
              <legend style={{ marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                รูปแบบการกิน (Diet Style)
              </legend>
              <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {DIET_STYLES.map((d) => {
                  const selected = diet === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiet(d.id)}
                      aria-pressed={selected}
                      className="hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A1BC98]/20"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 999,
                        border: selected ? '2px solid #778873' : '1.5px solid var(--border)',
                        background: selected ? '#D2DCB6' : '#FFFFFF',
                        color: selected ? 'var(--primary)' : 'var(--foreground)',
                        fontFamily: 'var(--font-prompt)',
                        fontSize: 13,
                        fontWeight: selected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-[#778873]" />}
                      <span>{d.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <TagInput
                label="ข้อควรระวังสุขภาพ / โรคประจำตัว"
                placeholder="เช่น เบาหวาน, ความดันโลหิตสูง, ลดเกลือ"
                values={health}
                onChange={setHealth}
              />
              <TagInput
                label="อาหารที่แพ้ / อาหารที่ไม่ทาน"
                placeholder="เช่น ถั่วเหลือง, หอย, ผักกาดขาว"
                values={avoid}
                onChange={setAvoid}
              />
            </div>

            <div
              style={{
                marginTop: 28,
                padding: 22,
                borderRadius: 22,
                background:
                  'linear-gradient(135deg, rgba(210,220,182,0.55) 0%, rgba(161,188,152,0.35) 100%)',
                border: '1px solid rgba(161,188,152,0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#5c6b59',
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                <Flame style={{ width: 14, height: 14 }} />
                การคำนวณจากข้อมูลของคุณ
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.55)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5c6b59', fontWeight: 500, marginBottom: 4 }}>
                    <Activity style={{ width: 12, height: 12 }} />
                    BMR
                  </div>
                  <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 24, fontWeight: 600, color: '#2a3528' }}>
                    {calc.bmr?.toLocaleString() || '--'}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#5c6b59', opacity: 0.85 }}>kcal (พื้นฐาน)</div>
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.55)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5c6b59', fontWeight: 500, marginBottom: 4 }}>
                    <Zap style={{ width: 12, height: 12 }} />
                    TDEE
                  </div>
                  <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 24, fontWeight: 600, color: '#2a3528' }}>
                    {calc.tdee?.toLocaleString() || '--'}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#5c6b59', opacity: 0.85 }}>kcal (ต่อวัน)</div>
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(119,136,115,0.85)', color: '#FFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, opacity: 0.95, marginBottom: 4 }}>
                    <Target style={{ width: 12, height: 12 }} />
                    แนะนำ
                  </div>
                  <div style={{ fontFamily: 'var(--font-kanit)', fontSize: 24, fontWeight: 600 }}>
                    {calc.targetCalories?.toLocaleString() || '--'}
                  </div>
                  <div style={{ fontSize: 10.5, opacity: 0.9 }}>kcal / วัน</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#5c6b59', marginTop: 12, opacity: 0.9 }}>
                * ผลการคำนวณเพียงประมาณการ AI จะปรับค่าให้เหมาะสมต่อมื้ออีกครั้ง
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 30,
                gap: 18,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 360 }}>
                {canSubmit
                  ? 'ข้อมูลครบถ้วนแล้ว กดดำเนินการต่อเพื่อไปเลือกช่วงเวลาและส่วนผสม'
                  : 'กรุณากรอกข้อมูลพื้นฐานให้ครบ (อายุ, เพศ, ส่วนสูง, น้ำหนัก, ระดับกิจกรรม)'}
              </div>
              <button className="btn-primary" type="submit" disabled={!canSubmit || submitting} style={{ minWidth: 240 }}>
                <Sparkles style={{ width: 16, height: 16 }} />
                {submitting ? 'กำลังบันทึกโปรไฟล์...' : 'ดำเนินการต่อ · เลือกมื้ออาหาร'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
