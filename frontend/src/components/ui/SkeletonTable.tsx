"use client";

export default function SkeletonTable({
  rows = 10,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] overflow-hidden animate-pulse">
      {/* Header row */}
      <div className="flex gap-4 px-6 py-4 border-b border-[#2A2D3D]">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`h-${i}`} className="h-4 bg-[#2A2D3D] rounded flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 px-6 py-3 border-b border-[#1A1D2A]">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={`c-${r}-${c}`} className="h-3 bg-[#2A2D3D] rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
