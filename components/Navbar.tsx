'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Leaf, LogOut, Menu, Repeat, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

interface BrandLogoProps {
  compact?: boolean
  href?: string
}

export function BrandLogo({ compact = false, href = '/' }: BrandLogoProps) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="NutriGenie หน้าหลัก">
      <span className="grid size-9 -rotate-[27deg] place-items-center rounded-[50%_45%_50%_42%] bg-[var(--brand)] shadow-sm">
        <Leaf className="size-[18px] rotate-[27deg] text-[var(--bg)]" />
      </span>
      {!compact && (
        <span className="font-[var(--font-kanit)] text-[22px] font-semibold tracking-[-0.03em] text-[var(--brand-ink)]">
          Nutri<span className="text-[var(--brand)]">Genie</span>
        </span>
      )}
    </Link>
  )
}

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isLandingPage = pathname === '/'
  const closeMenu = () => setIsMenuOpen(false)

  // ปิดเมนูมือถืออัตโนมัติเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // ล็อก scroll ตอนเปิดเมนูมือถือ
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    logout()
    router.push('/')
    closeMenu()
  }

  const navLinkClass = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-[var(--accent)]/20 text-[var(--primary)]'
        : 'text-[var(--muted)] hover:text-[var(--primary)]'
    }`

  const navLinks: { href: string; label: string; icon?: typeof Leaf }[] = isLandingPage
    ? [
        { href: '#features', label: 'ฟีเจอร์' },
        { href: '#how', label: 'วิธีใช้งาน' },
        { href: '/dashboard', label: 'แดชบอร์ด' },
        { href: '/smart-swap', label: 'Smart Swap', icon: Repeat },
      ]
    : [
        { href: '/', label: 'หน้าหลัก' },
        { href: '/dashboard', label: 'แดชบอร์ด' },
        { href: '/pantry', label: 'สร้างเมนู' },
        { href: '/smart-swap', label: 'Smart Swap', icon: Repeat },
      ]

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/75 backdrop-blur-xl">
      <div className="shell flex min-h-[76px] items-center justify-between gap-4">
        <BrandLogo />

        <nav className="nav-desktop items-center gap-1" aria-label="เมนูหลัก">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
              {link.icon && <link.icon className="size-4" aria-hidden="true" />}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {!loading &&
            (user ? (
              <>
                <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5">
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--color-card)] text-[var(--primary)]">
                    <User className="size-4" />
                  </span>
                  <span className="max-w-36 truncate text-sm font-semibold text-[var(--foreground)]">
                    {user.name}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-ghost px-2.5"
                  onClick={handleLogout}
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/onboarding" className="btn-primary px-5 py-2.5 text-sm">
                  เริ่มใช้งาน
                </Link>
              </>
            ))}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="btn-ghost nav-mobile-toggle px-2"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 md:hidden"
        >
          <nav className="shell flex flex-col gap-1" aria-label="เมนูหลักบนมือถือ">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(link.href)}
                onClick={closeMenu}
              >
                {link.icon && <link.icon className="size-4" aria-hidden="true" />}
                {link.label}
              </Link>
            ))}

            {!loading &&
              (user ? (
                <>
                  <div className="mt-2 flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-white px-3 py-2">
                    <span className="grid size-8 place-items-center rounded-full bg-[var(--color-card)] text-[var(--primary)]">
                      <User className="size-4" />
                    </span>
                    <span className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {user.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost mt-2 justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    ออกจากระบบ
                  </button>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href="/login" className="btn-secondary py-2.5 text-sm" onClick={closeMenu}>
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/onboarding"
                    className="btn-primary py-2.5 text-sm"
                    onClick={closeMenu}
                  >
                    เริ่มใช้งาน
                  </Link>
                </div>
              ))}
          </nav>
        </div>
      )}
    </header>
  )
}