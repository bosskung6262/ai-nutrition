import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'NutriGenie — กินดีขึ้นในแบบของคุณ',
  description: 'ผู้ช่วยโภชนาการ AI ที่เข้าใจคุณ วางแผนมื้ออาหารเฉพาะบุคคลเพื่อเป้าหมายสุขภาพที่ดีขึ้น',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6f5f0',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="bg-background">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
