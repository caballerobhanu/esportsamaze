import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Activity, ArrowLeft, ArrowRight, AtSign, CalendarDays, Camera, Check, Crosshair, Gamepad2, Globe, MessageCircle, PlaySquare, ShieldCheck, Swords, Trophy, Users } from 'lucide-react';
import prisma from '@/lib/prisma';
import { computePlayerRankings } from '@/lib/krafton-rankings';
import { formatDate } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

interface PlayerPageProps { params: Promise<{ slug: string }> }
type SocialMap = Record<string, string>;
export const dynamic = 'force-dynamic';

const socialIcons: Record<string, typeof Globe> = { instagram: Camera, youtube: PlaySquare, twitter: AtSign, x: AtSign, discord: MessageCircle, website: Globe };

function socialHref(key: string, value: string) {
  if (/^https?:\/\//.test(value)) return value;
  const handle = value.replace(/^@/, '');
  if (key === 'instagram') return `https://instagram.com/${handle}`;
  if (key === 'youtube') return `https://youtube.com/@${handle}`;
  if (key === 'twitter' || key === 'x') return `https://twitter.com/${handle}`;
  if (key === 'discord') return `https://discord.gg/${handle}`;
  return value;
}

function calcAge(date: Date | null) { return date ? Math.floor((Date.now() - date.getTime()) / (365.25 * 86_400_000)) : null; }

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const player = await prisma.player.findUnique({ where: { slug }, select: { ign: true } });
    return { title: player ? `${player.ign} — Player Profile | Esports Amaze` : 'Player Profile | Esports Amaze' };
  } catch { return { title: 'Player Profile | Esports Amaze' }; }
}

async function getStanding(ign: string) {
  try {
    const rows = await prisma.playerRanking.findMany({ select: { tier: true, endDate: true, finishes: true, mvpTourney: true, mvpFinals: true, igl: true, survivor: true, emerging: true, player: { select: { ign: true } } } });
    const standings = computePlayerRankings(rows.map((r) => ({ tournament: '', tier: r.tier, endDate: r.endDate.toISOString().slice(0, 10), player: r.player.ign, team: '', finishes: r.finishes, mvpTourney: r.mvpTourney > 0, mvpFinals: r.mvpFinals > 0, igl: r.igl > 0, survivor: r.survivor > 0, emerging: r.emerging > 0 })));
    return standings.find((s) => s.name.toLowerCase() === ign.toLowerCase()) ?? null;
  } catch { return null; }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const player = await prisma.player.findUnique({
    where: { slug },
    include: { currentTeam: true, game: true, matchStats: { take: 6, orderBy: { matchGame: { match: { scheduledAt: 'desc' } } }, include: { matchGame: { include: { match: { include: { tournament: true } } } } } } },
  });
  if (!player) notFound();
  const [standing, prevPlayer, nextPlayer] = await Promise.all([
    getStanding(player.ign),
    prisma.player.findFirst({ where: { id: { lt: player.id } }, orderBy: { id: 'desc' }, select: { slug: true, ign: true } }),
    prisma.player.findFirst({ where: { id: { gt: player.id } }, orderBy: { id: 'asc' }, select: { slug: true, ign: true } }),
  ]);
  const socials = (player.socialLinks ?? {}) as SocialMap;
  const realName = [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Name not disclosed';
  const age = calcAge(player.birthDate);
  const games = player.matchStats.length;
  const kills = player.matchStats.reduce((sum, stat) => sum + stat.kills, 0);
  const assists = player.matchStats.reduce((sum, stat) => sum + stat.assists, 0);
  const kd = games ? (kills / games).toFixed(1) : '—';
  const avatar = player.avatarUrl || (player.slug === 'jonathan' ? '/images/players/jonathan.png' : null);
  const statCards = [['K/D', kd, Crosshair], ['Kills', kills || '—', Swords], ['Assists', assists || '—', Activity], ['Global rank', standing ? `#${standing.rank}` : '—', Trophy]] as const;

  return <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
    <Navbar />
    <main>
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(10,95,196,.16),transparent_35%),linear-gradient(115deg,transparent_45%,rgba(10,95,196,.05)_45%,rgba(10,95,196,.05)_46%,transparent_46%)] dark:bg-[radial-gradient(circle_at_70%_10%,rgba(37,99,235,.22),transparent_35%),linear-gradient(115deg,transparent_45%,rgba(255,255,255,.03)_45%,rgba(255,255,255,.03)_46%,transparent_46%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-14">
          <div className="mb-9 flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400 dark:text-slate-500"><Link href="/" className="hover:text-[#0A5FC4]">Home</Link><span>/</span><span>{player.game?.name || 'Esports'}</span><span>/</span><span className="text-[#0A5FC4] dark:text-blue-300">Player profile</span></div><div className="flex gap-2">{prevPlayer && <Link href={`/players/${prevPlayer.slug}`} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10" aria-label={`Previous player: ${prevPlayer.ign}`}><ArrowLeft className="h-4 w-4" /></Link>}{nextPlayer && <Link href={`/players/${nextPlayer.slug}`} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10" aria-label={`Next player: ${nextPlayer.ign}`}><ArrowRight className="h-4 w-4" /></Link>}</div></div>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_280px_1.15fr]">
            <div className="order-2 lg:order-1"><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active roster</div><p className="mb-2 text-sm font-bold uppercase tracking-[.25em] text-[#0A5FC4] dark:text-blue-300">{player.game?.name || 'Competitive player'}</p><h1 className="text-6xl font-black tracking-[-.08em] text-slate-950 dark:text-white sm:text-7xl lg:text-8xl">{player.ign}</h1><p className="mt-4 text-base font-medium text-slate-500 dark:text-slate-400">{realName} <span className="mx-2 text-slate-300">•</span> {player.role || 'Professional player'}</p>{player.currentTeam && <Link href={`/teams/${player.currentTeam.slug}`} className="mt-7 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A5FC4] text-xs text-white">{player.currentTeam.tag?.slice(0, 3) || 'TM'}</span><span>{player.currentTeam.name}</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>}</div>
            <div className="order-1 flex justify-center lg:order-2"><div className="relative h-64 w-64 overflow-hidden rounded-[2.5rem] border-8 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-72 sm:w-72">{avatar ? <Image src={avatar} alt={player.ign} fill className="object-contain object-bottom" priority /> : <div className="flex h-full items-center justify-center text-8xl font-black text-[#0A5FC4]/30">{player.ign.slice(0, 2).toUpperCase()}</div>}<div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white dark:border-[#182338]"><Check className="h-4 w-4" strokeWidth={3} /></div></div></div>
            <div className="order-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">{statCards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"><Icon className="mb-5 h-4 w-4 text-[#0A5FC4] dark:text-blue-300" /><p className="text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">{label}</p></div>)}</div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"><div className="grid gap-8 lg:grid-cols-[1.4fr_.8fr]">
        <div className="space-y-8"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8"><div className="mb-7 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">Performance log</p><h2 className="mt-1 text-2xl font-black tracking-tight">Recent match stats</h2></div><Gamepad2 className="h-6 w-6 text-slate-300 dark:text-slate-700" /></div>{player.matchStats.length ? <div className="overflow-x-auto"><table className="w-full min-w-[530px] text-left"><thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10"><tr><th className="pb-3">Tournament</th><th className="pb-3">Map</th><th className="pb-3 text-center">K</th><th className="pb-3 text-center">A</th><th className="pb-3 text-center">D</th><th className="pb-3 text-right">Date</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/10">{player.matchStats.map((stat) => <tr key={stat.id} className="text-sm"><td className="py-4 pr-3 font-bold">{stat.matchGame.match.tournament.name}</td><td className="py-4 text-slate-500">{stat.matchGame.mapName || '—'}</td><td className="py-4 text-center font-black text-[#0A5FC4] dark:text-blue-300">{stat.kills}</td><td className="py-4 text-center font-bold">{stat.assists}</td><td className="py-4 text-center font-bold text-slate-400">{stat.deaths}</td><td className="py-4 text-right text-xs text-slate-400">{new Date(stat.matchGame.match.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">Match-by-match performance will appear here once results are published.</div>}</section><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-[#0A5FC4]/10 p-2.5 text-[#0A5FC4] dark:text-blue-300"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">About the player</p><h2 className="text-xl font-black">Career snapshot</h2></div></div><p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">{player.ign} is a professional {player.game?.name || 'esports'} player competing as a {player.role || 'specialist'}. Follow the profile for verified roster information, rankings, and tournament performance as the season progresses.</p></section></div>
        <aside className="space-y-8"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]"><div className="mb-6 flex items-center gap-3"><Users className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" /><h2 className="text-lg font-black">Player details</h2></div><dl className="space-y-4 text-sm">{[['Nationality', player.nationality || 'Not listed'], ['Role', player.role || 'Not listed'], ['Date of birth', player.birthDate ? `${formatDate(player.birthDate)}${age ? ` · ${age} years` : ''}` : 'Not listed'], ['Status', player.status === 'ACTIVE' ? 'Active competitor' : player.status]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-white/10"><dt className="text-slate-400">{label}</dt><dd className="text-right font-bold">{value}</dd></div>)}</dl>{Object.keys(socials).length > 0 && <div className="mt-6 flex gap-2 border-t border-slate-100 pt-5 dark:border-white/10">{Object.entries(socials).map(([key, value]) => { const Icon = socialIcons[key] || Globe; return <a key={key} href={socialHref(key, String(value))} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10" aria-label={key}><Icon className="h-4 w-4" /></a>; })}</div>}</section><section className="overflow-hidden rounded-3xl bg-[#0A5FC4] p-6 text-white shadow-xl shadow-blue-900/15"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">KRAFTON rating</p><p className="mt-3 text-5xl font-black tracking-tight">{standing ? `#${standing.rank}` : '—'}</p></div><Trophy className="h-6 w-6 text-amber-300" /></div><p className="mt-5 text-sm leading-6 text-blue-100">{standing ? `${standing.points.toFixed(1)} rating points from the latest rankings snapshot.` : 'Ranking data will appear once this player has an official rating snapshot.'}</p><Link href="/#krafton-rankings" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white hover:text-amber-200">View rankings <ArrowRight className="h-4 w-4" /></Link></section><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]"><div className="mb-5 flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" /><h2 className="text-lg font-black">Profile status</h2></div><div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4"><div className="rounded-full bg-emerald-500 p-2 text-white"><Check className="h-4 w-4" /></div><div><p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">Verified player profile</p><p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-300/70">Roster and identity data are maintained by Esports Amaze.</p></div></div></section></aside>
      </div></section>
    </main><Footer />
  </div>;
}
