"use client";

export default function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-[#2A2D3D] bg-[#161821] animate-pulse"
      style={{ height }}
    />
  );
}
