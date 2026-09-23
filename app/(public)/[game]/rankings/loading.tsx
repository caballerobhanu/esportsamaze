export default function RankingsLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[var(--page-max-width)] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-36 rounded-md bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="h-9 w-64 rounded-lg bg-slate-200 dark:bg-white/15 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="h-10 w-28 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Leaderboard Table Skeleton */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="border-b border-slate-100 p-4 dark:border-white/10">
            <div className="h-10 w-full max-w-sm rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-6 w-8 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                </div>
                <div className="h-6 w-16 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
