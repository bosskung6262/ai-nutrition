'use client'

import Link from 'next/link'
import { Leaf, Menu, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

export function LandingNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="nav shell" aria-label="เมนูหลัก">
      <Link href="/dashboard" className="logo" aria-label="NutriGenie แดชบอร์ด">
        <span className="logo-mark"><Leaf className="size-4 rotate-[27deg] text-[#F1F3E0]" /></span>
        <span>Nutri<span>Genie</span></span>
      </Link>
      <div className={`nav-links ${open ? 'is-open' : ''}`}>
        <a href="#features" onClick={() => setOpen(false)}>ฟีเจอร์</a>
        <a href="#how" onClick={() => setOpen(false)}>วิธีใช้งาน</a>
        <a href="/dashboard" onClick={() => setOpen(false)}>แดชบอร์ด</a>
        <Link href="/onboarding" className="nav-cta" onClick={() => setOpen(false)}>
          เริ่มใช้งาน <ArrowRight />
        </Link>
      </div>
      <button type="button" className="menu-button" onClick={() => setOpen((current) => !current)} aria-label="เปิดเมนู" aria-expanded={open}>
        {open ? <X /> : <Menu />}
      </button>
    </nav>
  )
}
