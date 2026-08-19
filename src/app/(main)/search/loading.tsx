import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Searching for music">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <h1 className="text-2xl font-semibold">Searching for music...</h1>
        </div>
        <div className="max-w-md flex-1">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative">
              <Skeleton className="aspect-[2/3] w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
