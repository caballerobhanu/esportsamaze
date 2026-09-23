export default function TournamentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-(--ed-canvas) text-(--ed-ink) antialiased">
      {children}
    </div>
  );
}
