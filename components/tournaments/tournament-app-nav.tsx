import Link from 'next/link';
import { LayoutDashboard, Trophy, Swords, ScrollText, Users, Banknote, Crosshair } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'format', label: 'Format', icon: ScrollText },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'prizepool', label: 'Prize Pool', icon: Banknote },
  { id: 'statistics', label: 'Statistics', icon: Crosshair },
] as const;

export function TournamentAppNav({ slug, activeTab }: { slug: string; activeTab: string }) {
  const normalizedActiveTab = activeTab === 'fraggers' ? 'statistics' : activeTab;
  return (
    <>
      {/* Desktop: hairline tab bar with blue underline indicator */}
      <div className="sticky top-14 z-30 mt-8 border-b border-(--ed-hair) bg-(--ed-canvas) sm:top-16">
        <nav className="hidden items-end gap-7 overflow-x-auto md:flex">
          {TABS.map((tab) => {
            const active = normalizedActiveTab === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={`/tournaments/${slug}?tab=${tab.id}`}
                className={`ed-tab ${active ? 'ed-tab-active' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile: fixed bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-(--ed-hair) bg-(--ed-surface) px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-7 gap-0.5 py-1.5">
          {TABS.map((tab) => {
            const active = normalizedActiveTab === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={`/tournaments/${slug}?tab=${tab.id}`}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-(--ed-blue)' : 'text-(--ed-stone)'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">
                  {tab.id === 'prizepool' ? 'Prize' : tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
