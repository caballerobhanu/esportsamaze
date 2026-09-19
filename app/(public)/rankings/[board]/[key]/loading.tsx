export default function RankingBreakdownLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[var(--page-max-width)] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb Skeleton */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
          <span className="text-slate-300 dark:text-white/20">/</span>
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
          <span className="text-slate-300 dark:text-white/20">/</span>
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
        </div>

        {/* Hero Card Skeleton (matches #0A5FC4 style) */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-[#0A5FC4] p-6 text-white sm:mb-8 sm:p-8 animate-pulse">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="space-y-3">
              <div className="h-5 w-44 rounded-full bg-white/20" />
              <div className="h-10 w-64 max-w-sm rounded-xl bg-white/30" />
              <div className="h-4 w-48 rounded-md bg-white/20" />
            </div>
            <div className="h-12 w-28 rounded-2xl bg-white/20" />
          </div>
        </div>

        {/* Events Table / Breakdown Skeleton */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 dark:border-white/5">
                <div className="space-y-2">
                  <div className="h-4 w-44 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
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
