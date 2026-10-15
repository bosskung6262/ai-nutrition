import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Kanit, Prompt } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import { Navbar } from '@/components/Navbar'
import '@/app/globals.css'

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-prompt',
  display: 'swap',
})

const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-kanit',
  display: 'swap',
})

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
    <html lang="th" className={`${prompt.variable} ${kanit.variable} bg-background`}>
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
