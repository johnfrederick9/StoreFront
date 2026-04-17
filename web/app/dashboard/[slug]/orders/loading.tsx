import { Skeleton } from '@/components/ui'

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-24" />
      <div className="card mt-8 divide-y divide-gray-200">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3">
            <div className="grid grid-cols-[160px_1fr_120px_120px] gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
