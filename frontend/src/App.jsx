import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import VantaBackground from './background/VantaBackground'
import Sidebar from './components/layout/Sidebar'
import Footer from './components/layout/Footer'
import DepotDashboard from './pages/DepotDashboard'
import ScheduleOptimizer from './pages/ScheduleOptimizer'
import NationalGrid from './pages/NationalGrid'
import CommandCenter from './pages/CommandCenter'

export default function App() {
  return (
    <BrowserRouter>
      <VantaBackground />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pl-[260px] transition-[padding] duration-300 max-lg:pl-[72px]">
          <main className="min-h-[calc(100vh-48px)] px-6 py-5">
            <Routes>
              <Route path="/" element={<DepotDashboard />} />
              <Route path="/optimizer" element={<ScheduleOptimizer />} />
              <Route path="/grid" element={<NationalGrid />} />
              <Route path="/command" element={<CommandCenter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  )
}
