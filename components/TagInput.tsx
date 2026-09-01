'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface TagInputProps {
  label: string
  placeholder?: string
  values: string[]
  onChange: (next: string[]) => void
}

export function TagInput({ label, placeholder, values, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (values.includes(v)) {
      setDraft('')
      return
    }
    onChange([...values, v])
    setDraft('')
  }

  const remove = (t: string) => {
    onChange(values.filter((x) => x !== t))
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label
        style={{
          fontSize: 13,
          color: 'var(--foreground)',
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: 14,
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          background: '#FFFFFF',
          minHeight: 52,
        }}
      >
        {values.map((t) => (
          <span key={t} className="tag-pill">
            {t}
            <button className="tag-remove" type="button" onClick={() => remove(t)} aria-label={`ลบ ${t}`}>
              <X style={{ width: 10, height: 10 }} />
            </button>
          </span>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={values.length === 0 ? placeholder : 'พิมพ์แล้วกด + หรือ Enter'}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              padding: '4px 2px',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-prompt)',
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: draft.trim() ? 'var(--primary)' : 'rgba(119,136,115,0.15)',
              color: draft.trim() ? '#FFFFFF' : 'var(--muted)',
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 0.2s ease',
            }}
            aria-label="เพิ่ม"
          >
            <Plus style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  )
}
