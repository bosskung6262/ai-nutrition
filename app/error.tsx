'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="shell flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-[var(--font-kanit)] text-2xl font-semibold text-foreground">
        เกิดข้อผิดพลาดบางอย่าง
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        ขออภัย เราไม่สามารถโหลดหน้านี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        ลองอีกครั้ง
      </button>
    </div>
  )
}
