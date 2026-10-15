import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-[var(--font-kanit)] text-5xl font-semibold text-primary">404</p>
      <h1 className="mt-3 font-[var(--font-kanit)] text-2xl font-semibold text-foreground">
        ไม่พบหน้าที่คุณกำลังมองหา
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        ลิงก์อาจเปลี่ยนแปลงหรือถูกลบไปแล้ว
      </p>
      <Link href="/" className="btn-primary mt-6">
        กลับหน้าหลัก
      </Link>
    </div>
  )
}
