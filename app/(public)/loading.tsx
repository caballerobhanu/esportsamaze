export default function PublicLoading() {
  return (
    <div className="w-full flex-1 animate-pulse bg-[var(--ed-canvas)] py-8 transition-colors">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        {/* Masthead Skeleton */}
        <div className="rounded-3xl border border-slate-200/60 bg-white/50 p-6 sm:p-8 dark:border-white/10 dark:bg-[#0d1526]/60">
          <div className="h-4 w-28 rounded-md bg-slate-200 dark:bg-white/10" />
          <div className="mt-4 h-9 w-64 max-w-full rounded-lg bg-slate-200 dark:bg-white/10 sm:h-11 sm:w-96" />
          <div className="mt-3 h-4 w-80 max-w-full rounded-md bg-slate-200/70 dark:bg-white/5" />
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-white/10" />
            <div className="h-9 w-32 rounded-xl bg-slate-200 dark:bg-white/10" />
            <div className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-white/10" />
          </div>
        </div>

        {/* Content Grid Skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/60 bg-white/50 p-5 dark:border-white/10 dark:bg-[#0d1526]/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-slate-200/70 dark:bg-white/5" />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-3 w-full rounded bg-slate-200/60 dark:bg-white/5" />
                <div className="h-3 w-4/5 rounded bg-slate-200/60 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
