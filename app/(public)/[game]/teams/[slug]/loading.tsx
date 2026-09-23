export default function TeamLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      {/* Team Hero Skeleton */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        <div className="relative mx-auto max-w-[var(--page-max-width)] px-4 sm:px-6 pt-3 sm:pt-6 pb-5 sm:pb-8 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-10 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <span className="text-slate-300 dark:text-white/20">/</span>
            <div className="h-3 w-12 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <span className="text-slate-300 dark:text-white/20">/</span>
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Logo placeholder */}
            <div className="h-32 w-32 sm:h-56 sm:w-56 shrink-0 rounded-2xl bg-slate-100 border border-slate-200/80 dark:border-white/10 dark:bg-white/5 animate-pulse" />

            {/* Team info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="h-8 sm:h-11 w-64 max-w-sm rounded-lg bg-slate-200 dark:bg-white/15 animate-pulse" />
              <div className="flex flex-wrap gap-4 pt-1">
                <div className="h-4 w-28 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs & Content */}
      <div className="mx-auto flex w-full max-w-[var(--page-max-width)] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8 lg:px-8">
        {/* Tab navigation placeholder */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
          <div className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-20 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-20 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
        </div>

        {/* Overview content */}
        <div className="mt-6 space-y-6">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1220]"
              >
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="mt-2 h-7 w-20 rounded bg-slate-200 dark:bg-white/15 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Roster preview grid */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-5" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-3 w-12 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
