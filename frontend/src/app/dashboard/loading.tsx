import SkeletonCard from "@/components/ui/SkeletonCard";
import SkeletonChart from "@/components/ui/SkeletonChart";
import SkeletonTable from "@/components/ui/SkeletonTable";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0F1117] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Four stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        {/* Chart placeholder */}
        <SkeletonChart height={280} />
        {/* Table placeholder */}
        <SkeletonTable rows={10} columns={6} />
      </div>
    </div>
  );
}
