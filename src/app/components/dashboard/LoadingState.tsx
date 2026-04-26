import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { TableCell, TableRow } from '../ui/table';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols: number;
}

export function TableSkeleton({ rows = 7, cols }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton
                className={`h-4 ${
                  j === cols - 1 ? 'w-8 ml-auto' : j === 0 ? 'w-36' : 'w-24'
                }`}
              />
              {j === 0 && <Skeleton className="h-3 w-20 mt-1.5 opacity-50" />}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-11 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full rounded-lg overflow-hidden" style={{ height }}>
      <Skeleton className="w-full h-full" />
    </div>
  );
}
