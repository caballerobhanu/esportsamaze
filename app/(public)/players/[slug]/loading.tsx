export default function PlayerLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      {/* Player Hero Skeleton */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 pt-3 sm:pt-6 pb-5 sm:pb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-10 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <span className="text-slate-300 dark:text-white/20">/</span>
            <div className="h-3 w-14 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <span className="text-slate-300 dark:text-white/20">/</span>
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            {/* Portrait placeholder */}
            <div className="h-32 w-32 sm:h-72 sm:w-72 shrink-0 rounded-2xl bg-slate-100 border border-slate-200/80 dark:border-white/10 dark:bg-white/5 animate-pulse" />

            {/* Info and 4 stats ribbon */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="h-9 sm:h-12 w-56 max-w-sm rounded-lg bg-slate-200 dark:bg-white/15 animate-pulse" />
              <div className="h-4 w-40 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />

              {/* 4 Stats ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="h-3 w-12 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="mt-1.5 h-6 w-16 rounded bg-slate-200 dark:bg-white/15 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs & Content */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8">
        {/* Tab nav placeholder */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
          <div className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-20 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-20 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
        </div>

        {/* Content grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Chart box */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0b1220]">
              <div className="h-5 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-6" />
              <div className="h-52 w-full rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
          </div>

          <div className="space-y-6">
            {/* Details box */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0b1220]">
              <div className="h-5 w-28 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-0 dark:border-white/5">
                    <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
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
