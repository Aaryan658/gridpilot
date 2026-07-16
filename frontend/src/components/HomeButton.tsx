'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'

export default function HomeButton() {
  const pathname = usePathname()

  if (pathname === '/') return null

  return (
    <Link 
      href="/"
      className="fixed bottom-6 right-6 z-50 bg-[#7C5CBF] hover:bg-[#8d69d8] text-white p-3 rounded-full shadow-lg shadow-[#7C5CBF]/30 transition-all hover:scale-110 flex items-center justify-center group border border-[#7C5CBF]/50"
      title="Back to Landing Page"
    >
      <Home className="w-5 h-5" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 font-semibold text-sm group-hover:ml-2">
        Landing Page
      </span>
    </Link>
  )
}
