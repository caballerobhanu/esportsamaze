export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ed-canvas)] transition-colors">
      <div className="flex flex-col items-center gap-3" aria-hidden="true">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--ed-hair)] border-t-[var(--ed-blue)] animate-spin" />
        <span className="ed-label">Loading</span>
      </div>
    </div>
  );
}
