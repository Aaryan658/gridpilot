'use client'

import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Activity, FileText, Settings, LogOut, User as UserIcon } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, isLoading, viewAsAdmin, setViewAsAdmin } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (isLoading) {
    return <div className="min-h-screen bg-[#0F1117] flex items-center justify-center text-[#00C851]">Loading...</div>
  }

  const isAdmin = user?.role === 'gridpilot_admin' && viewAsAdmin;

  // If not an admin (i.e. normal user), just render the normal dashboard without the new sidebar wrapper
  if (!isAdmin) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Tonight's Schedule", href: '/dashboard', icon: Calendar },
    { name: 'Live Status', href: '/dashboard/live', icon: Activity },
    { name: 'Nightly Report', href: '/dashboard/report', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-[#0F1117] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#161821] border-r border-[#2A2D3D] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[#2A2D3D]">
          <h1 className="text-xl font-bold text-[#00C851] tracking-tight font-space">
            GridPilot
          </h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-[#00C851]/10 text-[#00C851]' 
                    : 'text-gray-400 hover:bg-[#2A2D3D] hover:text-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#00C851]' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#2A2D3D]">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-400 rounded-lg hover:bg-[#2A2D3D] hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-[#161821] border-b border-[#2A2D3D] flex items-center justify-between px-8">
          <div className="text-gray-400 text-sm">
            {pathname === '/dashboard' && "Schedule Overview"}
            {pathname === '/dashboard/live' && "Charger Grid Live Status"}
            {pathname === '/dashboard/report' && "Nightly Performance Report"}
            {pathname === '/dashboard/settings' && "System Settings"}
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1.5 bg-[#2A2D3D] rounded-full text-xs">
                <span className="w-2 h-2 rounded-full bg-[#00C851] mr-2"></span>
                {user.role === 'gridpilot_admin' ? 'Global Admin' : `Depot: ${user.depot_id}`}
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                {user.email}
              </div>
              <button
                onClick={() => {
                  setViewAsAdmin(false)
                  router.push('/dashboard')
                }}
                className="ml-4 px-3 py-1.5 bg-[#7C5CBF] hover:bg-[#6A4E9E] rounded-lg text-xs font-semibold transition-colors"
              >
                View as Depot Mode
              </button>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#0F1117] p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
