export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        {/* Header & Head-to-Head Selectors Skeleton */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="text-center space-y-2">
            <div className="mx-auto h-4 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="mx-auto h-8 sm:h-10 w-72 rounded-lg bg-slate-200 dark:bg-white/15 animate-pulse" />
          </div>

          {/* Versus Picker Skeleton */}
          <div className="mt-8 grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr,auto,1fr]">
            {/* Entity A */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="h-14 w-14 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
              </div>
            </div>

            {/* VS Badge */}
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black text-xs text-slate-400 dark:bg-white/10">
              VS
            </div>

            {/* Entity B */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="h-14 w-14 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Metrics Grid Skeleton */}
        <div className="mt-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1220]"
            >
              <div className="mx-auto h-3 w-28 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-3" />
              <div className="flex items-center justify-between gap-4">
                <div className="h-6 w-14 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-3 flex-1 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
                <div className="h-6 w-14 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
