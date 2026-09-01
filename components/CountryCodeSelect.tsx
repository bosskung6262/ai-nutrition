'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, Phone } from 'lucide-react'

export interface CountryCode {
  code: string
  name: string
  nameTh: string
  dialCode: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'TH', name: 'Thailand', nameTh: 'ไทย', dialCode: '+66' },
  { code: 'SG', name: 'Singapore', nameTh: 'สิงคโปร์', dialCode: '+65' },
  { code: 'MY', name: 'Malaysia', nameTh: 'มาเลเซีย', dialCode: '+60' },
  { code: 'ID', name: 'Indonesia', nameTh: 'อินโดนีเซีย', dialCode: '+62' },
  { code: 'PH', name: 'Philippines', nameTh: 'ฟิลิปปินส์', dialCode: '+63' },
  { code: 'VN', name: 'Vietnam', nameTh: 'เวียดนาม', dialCode: '+84' },
  { code: 'KH', name: 'Cambodia', nameTh: 'กัมพูชา', dialCode: '+855' },
  { code: 'LA', name: 'Laos', nameTh: 'ลาว', dialCode: '+856' },
  { code: 'MM', name: 'Myanmar', nameTh: 'พม่า', dialCode: '+95' },
  { code: 'JP', name: 'Japan', nameTh: 'ญี่ปุ่น', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', nameTh: 'เกาหลีใต้', dialCode: '+82' },
  { code: 'CN', name: 'China', nameTh: 'จีน', dialCode: '+86' },
  { code: 'HK', name: 'Hong Kong', nameTh: 'ฮ่องกง', dialCode: '+852' },
  { code: 'TW', name: 'Taiwan', nameTh: 'ไต้หวัน', dialCode: '+886' },
  { code: 'IN', name: 'India', nameTh: 'อินเดีย', dialCode: '+91' },
  { code: 'AU', name: 'Australia', nameTh: 'ออสเตรเลีย', dialCode: '+61' },
  { code: 'NZ', name: 'New Zealand', nameTh: 'นิวซีแลนด์', dialCode: '+64' },
  { code: 'US', name: 'United States', nameTh: 'สหรัฐอเมริกา', dialCode: '+1' },
  { code: 'CA', name: 'Canada', nameTh: 'แคนาดา', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', nameTh: 'สหราชอาณาจักร', dialCode: '+44' },
  { code: 'IE', name: 'Ireland', nameTh: 'ไอร์แลนด์', dialCode: '+353' },
  { code: 'FR', name: 'France', nameTh: 'ฝรั่งเศส', dialCode: '+33' },
  { code: 'DE', name: 'Germany', nameTh: 'เยอรมนี', dialCode: '+49' },
  { code: 'ES', name: 'Spain', nameTh: 'สเปน', dialCode: '+34' },
  { code: 'IT', name: 'Italy', nameTh: 'อิตาลี', dialCode: '+39' },
  { code: 'NL', name: 'Netherlands', nameTh: 'เนเธอร์แลนด์', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', nameTh: 'เบลเยียม', dialCode: '+32' },
  { code: 'CH', name: 'Switzerland', nameTh: 'สวิตเซอร์แลนด์', dialCode: '+41' },
  { code: 'AT', name: 'Austria', nameTh: 'ออสเตรีย', dialCode: '+43' },
  { code: 'SE', name: 'Sweden', nameTh: 'สวีเดน', dialCode: '+46' },
  { code: 'NO', name: 'Norway', nameTh: 'นอร์เวย์', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', nameTh: 'เดนมาร์ก', dialCode: '+45' },
  { code: 'FI', name: 'Finland', nameTh: 'ฟินแลนด์', dialCode: '+358' },
  { code: 'PL', name: 'Poland', nameTh: 'โปแลนด์', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', nameTh: 'โปรตุเกส', dialCode: '+351' },
  { code: 'GR', name: 'Greece', nameTh: 'กรีซ', dialCode: '+30' },
  { code: 'TR', name: 'Turkey', nameTh: 'ตุรกี', dialCode: '+90' },
  { code: 'RU', name: 'Russia', nameTh: 'รัสเซีย', dialCode: '+7' },
  { code: 'AE', name: 'United Arab Emirates', nameTh: 'สหรัฐอาหรับเอมิเรตส์', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', nameTh: 'ซาอุดีอาระเบีย', dialCode: '+966' },
  { code: 'QA', name: 'Qatar', nameTh: 'กาตาร์', dialCode: '+974' },
  { code: 'EG', name: 'Egypt', nameTh: 'อียิปต์', dialCode: '+20' },
  { code: 'ZA', name: 'South Africa', nameTh: 'แอฟริกาใต้', dialCode: '+27' },
  { code: 'BR', name: 'Brazil', nameTh: 'บราซิล', dialCode: '+55' },
  { code: 'AR', name: 'Argentina', nameTh: 'อาร์เจนตินา', dialCode: '+54' },
  { code: 'MX', name: 'Mexico', nameTh: 'เม็กซิโก', dialCode: '+52' },
  { code: 'CL', name: 'Chile', nameTh: 'ชิลี', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', nameTh: 'โคลอมเบีย', dialCode: '+57' },
  { code: 'PE', name: 'Peru', nameTh: 'เปรู', dialCode: '+51' },
]

export const DEFAULT_COUNTRY: CountryCode = COUNTRY_CODES[0]

interface CountryCodeSelectProps {
  value: CountryCode
  onChange: (c: CountryCode) => void
  id?: string
}

export function CountryCodeSelect({ value, onChange, id }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRY_CODES
    return COUNTRY_CODES.filter((c) => {
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.nameTh.includes(q) ||
        c.dialCode.includes(q)
      )
    })
  }, [query])

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          height: '100%',
          minHeight: 46,
          padding: '10px 12px',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 22,
              height: 15,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${flagGradientFor(value.code)})`,
              flexShrink: 0,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            }}
            aria-hidden
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
            {value.dialCode}
          </span>
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value.code}
          </span>
        </div>
        <ChevronDown
          style={{
            width: 14,
            height: 14,
            color: 'var(--muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            minWidth: 300,
            maxHeight: 320,
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 20px 48px rgba(119,136,115,0.16)',
            zIndex: 80,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: 10,
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search style={{ width: 14, height: 14, color: 'var(--muted)', flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อประเทศ / รหัส / Dial Code"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--foreground)',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', padding: 6 }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '20px 12px',
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Phone style={{ width: 16, height: 16, opacity: 0.4 }} />
                ไม่พบประเทศที่ค้นหา
              </div>
            ) : (
              filtered.map((c) => {
                const selected = c.code === value.code
                return (
                  <button
                    key={c.code + c.dialCode}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(c)
                      setOpen(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: 'none',
                      background: selected ? 'rgba(161,188,152,0.18)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: selected ? 'var(--primary-dark)' : 'var(--foreground)',
                      fontSize: 13,
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = 'rgba(161,188,152,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 15,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${flagGradientFor(c.code)})`,
                        flexShrink: 0,
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                      }}
                      aria-hidden
                    />
                    <div style={{ minWidth: 56, flexShrink: 0, fontWeight: 600 }}>{c.dialCode}</div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.nameTh} · {c.code}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function flagGradientFor(code: string): string {
  const palette: Record<string, [string, string]> = {
    TH: ['#EF3340 0 33%', '#FFFFFF 33% 66%, #EF3340 66%'],
    SG: ['#FFFFFF 0 50%', '#ED2939 50%'],
    MY: ['#CC0001 0 14%', '#FFFFFF 14% 28%, #CC0001 28% 42%, #FFFFFF 42% 56%, #CC0001 56% 70%, #FFFFFF 70% 84%, #010066 84%'],
    ID: ['#CE1126 0 50%', '#FFFFFF 50%'],
    PH: ['#0038A8 0 33%', '#CE1126 33% 66%, #FFFFFF 66%'],
    VN: ['#DA251D 0 50%', '#FFCD00 50%'],
    KH: ['#002B7F 0 17%', '#CE1126 17% 83%, #002B7F 83%'],
    LA: ['#CE1126 0 33%', '#FFFFFF 33% 66%, #002868 66%'],
    MM: ['#FECB00 0 33%', '#34B233 33% 66%, #EA2839 66%'],
    JP: ['#FFFFFF 0 100%'],
    KR: ['#FFFFFF 0 100%'],
    CN: ['#DE2910 0 100%'],
    HK: ['#DE2910 0 100%'],
    TW: ['#FE0000 0 100%'],
    IN: ['#FF9933 0 33%', '#FFFFFF 33% 66%, #138808 66%'],
    AU: ['#00008B 0 50%', '#FF0000 50%'],
    NZ: ['#00247D 0 100%'],
    US: ['#3C3B6E 0 50%', '#B22234 50%'],
    CA: ['#FF0000 0 25%', '#FFFFFF 25% 75%, #FF0000 75%'],
    GB: ['#012169 0 100%'],
    IE: ['#009A44 0 33%', '#FFFFFF 33% 66%, #FF7900 66%'],
    FR: ['#002395 0 33%', '#FFFFFF 33% 66%, #ED2939 66%'],
    DE: ['#000000 0 33%', '#DD0000 33% 66%, #FFCE00 66%'],
    ES: ['#AA151B 0 25%', '#F1BF00 25% 75%, #AA151B 75%'],
    IT: ['#009246 0 33%', '#FFFFFF 33% 66%, #CE2B37 66%'],
    NL: ['#AE1C28 0 33%', '#FFFFFF 33% 66%, #21468B 66%'],
    BE: ['#000000 0 33%', '#FAE042 33% 66%, #ED2939 66%'],
    CH: ['#FF0000 0 100%'],
    AT: ['#ED2939 0 33%', '#FFFFFF 33% 66%, #ED2939 66%'],
    SE: ['#006AA7 0 100%'],
    NO: ['#EF2B2D 0 100%'],
    DK: ['#C60C30 0 100%'],
    FI: ['#FFFFFF 0 100%'],
    PL: ['#DC143C 0 50%', '#FFFFFF 50%'],
    PT: ['#006600 0 40%', '#FF0000 40%'],
    GR: ['#0D5EAF 0 100%'],
    TR: ['#E30A17 0 100%'],
    RU: ['#FFFFFF 0 33%', '#0039A6 33% 66%, #D52B1E 66%'],
    AE: ['#CE1126 0 25%', '#00732F 25% 50%, #FFFFFF 50% 75%, #000000 75%'],
    SA: ['#006C35 0 60%', '#FFFFFF 60%'],
    QA: ['#8A1538 0 100%'],
    EG: ['#CE1126 0 33%', '#FFFFFF 33% 66%, #000000 66%'],
    ZA: ['#007749 0 25%', '#000000 25% 50%, #FFB81C 50% 75%, #DE3831 75%'],
    BR: ['#009C3B 0 50%', '#FFDF00 50%'],
    AR: ['#74ACDF 0 33%', '#FFFFFF 33% 66%, #74ACDF 66%'],
    MX: ['#006847 0 33%', '#FFFFFF 33% 66%, #CE1126 66%'],
    CL: ['#FFFFFF 0 50%', '#0039A6 50%'],
    CO: ['#FCD116 0 50%', '#003893 50% 75%, #CE1126 75%'],
    PE: ['#D91023 0 33%', '#FFFFFF 33% 66%, #D91023 66%'],
  }
  return palette[code]?.join(', ') || '#A1BC98 0 50%, #778873 50%'
}
