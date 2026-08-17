import { Skeleton } from '@/components/ui/Feedback'

/** Shown while a lazily-loaded route chunk is in flight. */
export function RouteFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="h-14 shrink-0 border-b border-line px-4 py-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
