export default function Footer() {
  return (
    <footer className="flex h-12 items-center justify-between border-t border-[var(--border-primary)] bg-[rgba(10,14,26,0.9)] px-6 text-[11px] text-[var(--text-muted)] backdrop-blur-[10px]">
      <div>GridPilot v1.0 | Corporate EV Fleet Depot, Gurugram</div>
      <div className="flex gap-2 max-xl:hidden">
        {['ACN-Data', 'CEA 2022-23', 'pandapower', 'CVXPY+ECOS', 'Lithium Urban Technologies ref'].map((item) => (
          <span key={item} className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] px-2 py-1">
            {item}
          </span>
        ))}
      </div>
      <div className="text-[#00d4aa]">Powered by FirstFlight</div>
    </footer>
  )
}
