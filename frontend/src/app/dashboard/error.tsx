"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-8">
      <ErrorMessage
        message={error.message || "An unexpected error occurred in the dashboard."}
        onRetry={reset}
      />
    </div>
  );
}
