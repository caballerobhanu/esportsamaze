'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Wrench,
  Sparkles,
  Clock,
  Lock,
} from 'lucide-react';
import type { MaintenanceSettings } from '@/lib/site-settings';
import {
  DiscordIcon,
  TwitterXIcon,
  InstagramIcon,
  YoutubeIcon,
} from '@/components/social-icons';

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        completed: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="flex items-center justify-center gap-3 py-4 text-slate-400 font-mono text-sm">
        <Clock className="w-4 h-4 animate-spin text-(--ed-blue)" />
        Synchronizing system clock...
      </div>
    );
  }

  if (timeLeft.completed) {
    return (
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        Finalizing deployment checks. Service resuming shortly!
      </div>
    );
  }

  const units = [
    { label: 'Days', value: String(timeLeft.days).padStart(2, '0') },
    { label: 'Hours', value: String(timeLeft.hours).padStart(2, '0') },
    { label: 'Minutes', value: String(timeLeft.minutes).padStart(2, '0') },
    { label: 'Seconds', value: String(timeLeft.seconds).padStart(2, '0') },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto w-full">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="relative group bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 text-center shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-(--ed-blue)/50"
        >
          <div className="absolute inset-0 bg-radial from-(--ed-blue)/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative text-2xl sm:text-4xl font-black font-mono tracking-tight text-white">
            {unit.value}
          </div>
          <div className="relative text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaintenanceView({ settings }: { settings: MaintenanceSettings }) {
  const isComingSoon = settings.mode === 'COMING_SOON';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-(--ed-blue) selection:text-white">
      {/* Dynamic Background Ambient Accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 blur-[140px] rounded-full" />
        <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] bg-purple-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 -right-32 w-[450px] h-[450px] bg-emerald-600/10 blur-[130px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
        />
      </div>

      {/* Top Brand Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="Esports Amaze"
            className="h-8 sm:h-9 w-auto object-contain brightness-0 invert"
          />
        </div>

        {/* Live status badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              isComingSoon ? 'bg-amber-400 animate-ping' : 'bg-blue-400 animate-pulse'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px] uppercase tracking-wider">
            {isComingSoon ? 'Stage: Pre-Launch' : 'Status: Maintenance'}
          </span>
        </div>
      </header>

      {/* Center Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        {/* Notice Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
          {isComingSoon ? (
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Wrench className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span>{settings.noticeBadge || (isComingSoon ? 'Next Chapter Incoming' : 'System Upgrade')}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 uppercase leading-tight">
          {settings.title}
        </h1>

        {/* Subtitle / Description */}
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed mb-10">
          {settings.subtitle}
        </p>

        {/* Countdown Timer */}
        {settings.showCountdown && settings.estimatedEnd && (
          <div className="w-full mb-10">
            <CountdownTimer targetDate={settings.estimatedEnd} />
          </div>
        )}

        {/* Community Social Links */}
        <div className="flex items-center justify-center gap-2">
          {settings.socialLinks.discord && (
            <a
              href={settings.socialLinks.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors"
              title="Join Discord"
              aria-label="Join our Discord"
            >
              <DiscordIcon className="w-4 h-4" />
            </a>
          )}
          {settings.socialLinks.twitter && (
            <a
              href={settings.socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-sky-500/50 hover:bg-sky-500/10 transition-colors"
              title="Follow on Twitter / X"
              aria-label="Follow us on X"
            >
              <TwitterXIcon className="w-4 h-4" />
            </a>
          )}
          {settings.socialLinks.instagram && (
            <a
              href={settings.socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-pink-500/50 hover:bg-pink-500/10 transition-colors"
              title="Follow on Instagram"
              aria-label="Follow us on Instagram"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
          )}
          {settings.socialLinks.youtube && (
            <a
              href={settings.socialLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
              title="Watch on YouTube"
              aria-label="Subscribe on YouTube"
            >
              <YoutubeIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      </main>

      {/* Bottom Discreet Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs border-t border-slate-900">
        <div>
          &copy; {new Date().getFullYear()} Esports Amaze. All rights reserved.
        </div>

        <div className="flex items-center gap-4">
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="hover:text-slate-300 transition-colors"
            >
              {settings.contactEmail}
            </a>
          )}

          {/* Discreet Admin Link */}
          <Link
            href="/poorvith/login"
            className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors text-[11px]"
            title="Administrator Portal"
          >
            <Lock className="w-3 h-3" />
            <span>Staff Portal</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
