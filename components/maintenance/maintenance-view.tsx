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

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function TwitterXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

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
