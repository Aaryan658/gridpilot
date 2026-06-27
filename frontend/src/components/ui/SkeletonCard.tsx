"use client";

export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-5 animate-pulse">
      <div className="h-8 w-24 bg-[#2A2D3D] rounded mb-3" />
      <div className="h-4 w-32 bg-[#2A2D3D] rounded mb-2" />
      <div className="h-3 w-20 bg-[#2A2D3D] rounded" />
    </div>
  );
}
