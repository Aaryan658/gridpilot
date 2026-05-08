export default function Header({ title, subtitle, demoMode }) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {demoMode && (
        <span className="rounded-md border border-[#f9ca2455] bg-[#f9ca2422] px-2 py-1 text-xs text-[#f9ca24]">
          Demo Mode
        </span>
      )}
    </div>
  )
}
