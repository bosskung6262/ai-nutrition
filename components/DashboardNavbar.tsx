'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Leaf, LogOut, User } from 'lucide-react'
import type { AuthUser } from '@/lib/types'

interface DashboardNavbarProps {
  user: AuthUser
  onLogout: () => void
}

export function DashboardNavbar({ user, onLogout }: DashboardNavbarProps) {
  const [hover, setHover] = useState(false)

  return (
    <header
      style={{
        padding: '18px 0',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(241,243,224,0.7)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="shell"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        {/* ---------- LOGO ---------- */}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          aria-label="NutriGenie หน้าหลัก"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50% 45% 50% 42%',
              background: '#778873',
              transform: 'rotate(-27deg)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Leaf style={{ width: 18, height: 18, color: '#F1F3E0', transform: 'rotate(27deg)' }} />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-kanit)',
              fontSize: 22,
              fontWeight: 600,
              color: '#4A6353',
              whiteSpace: 'nowrap',
            }}
          >
            Nutri<span style={{ color: '#778873' }}>Genie</span>
          </div>
        </Link>

        {/* ---------- USER + LOGOUT ---------- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* User Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px 6px 6px',
              borderRadius: 999,
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              maxWidth: '60vw',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--card)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}
            >
              <User style={{ width: 16, height: 16 }} />
            </div>
            <div style={{ lineHeight: 1.25, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.name}
              </div>
              <div
                className="hidden sm:block"
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.email}
              </div>
            </div>
          </div>

          {/* Logout Button — ไม่ใช้ btn-ghost ป้องกัน style hamburger ค้าง */}
          <button
            type="button"
            onClick={onLogout}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: hover ? '#778873' : '#FFFFFF',
              color: hover ? '#F1F3E0' : '#4A6353',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-kanit)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            <LogOut style={{ width: 16, height: 16 }} />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  )
}