export default function TournamentLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      {/* Tournament Hero Skeleton */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 pt-5 pb-7 sm:pb-9">
          {/* Breadcrumb placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-12 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <span className="text-slate-300 dark:text-white/20">/</span>
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <span className="text-slate-300 dark:text-white/20">/</span>
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            {/* Emblem placeholder */}
            <div className="h-28 w-28 sm:h-36 sm:w-36 shrink-0 rounded-2xl bg-slate-100 border border-slate-200/80 dark:border-white/10 dark:bg-white/5 animate-pulse" />

            {/* Info placeholder */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="h-8 sm:h-10 w-3/4 max-w-md rounded-lg bg-slate-200 dark:bg-white/15 animate-pulse" />
              <div className="flex flex-wrap gap-4 pt-1">
                <div className="h-4 w-32 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-28 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs & Body Skeleton */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8">
        {/* Tab Nav placeholder */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
          <div className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-20 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
        </div>

        {/* Overview Body placeholder */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Standings Table Skeleton */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="h-5 w-36 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-20 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0 dark:border-white/5">
                    <div className="h-4 w-6 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-4 w-32 flex-1 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-4 w-12 rounded bg-slate-200/70 dark:bg-white/5 animate-pulse" />
                    <div className="h-4 w-10 rounded bg-slate-200/70 dark:bg-white/5 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Top Fraggers Skeleton */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
              <div className="h-5 w-28 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                      <div className="h-3 w-16 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                    </div>
                    <div className="h-5 w-8 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
