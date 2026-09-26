'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Power,
  Wrench,
  Sparkles,
  ExternalLink,
  Save,
  Clock,
  Calendar,
  Mail,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import type { MaintenanceSettings } from '@/lib/site-settings';

interface FormProps {
  initialSettings: MaintenanceSettings;
  onSaveAction: (data: FormData) => Promise<void>;
  onToggleAction: () => Promise<void>;
}

export function MaintenanceSettingsForm({
  initialSettings,
  onSaveAction,
  onToggleAction,
}: FormProps) {
  const [enabled, setEnabled] = React.useState(initialSettings.enabled);
  const [mode, setMode] = React.useState<'MAINTENANCE' | 'COMING_SOON'>(initialSettings.mode);
  const [title, setTitle] = React.useState(initialSettings.title);
  const [subtitle, setSubtitle] = React.useState(initialSettings.subtitle);
  const [noticeBadge, setNoticeBadge] = React.useState(initialSettings.noticeBadge);
  const [estimatedEnd, setEstimatedEnd] = React.useState(
    initialSettings.estimatedEnd
      ? new Date(initialSettings.estimatedEnd).toISOString().slice(0, 16)
      : ''
  );
  const [showCountdown, setShowCountdown] = React.useState(initialSettings.showCountdown);
  const [contactEmail, setContactEmail] = React.useState(initialSettings.contactEmail);
  const [discord, setDiscord] = React.useState(initialSettings.socialLinks.discord || '');
  const [twitter, setTwitter] = React.useState(initialSettings.socialLinks.twitter || '');
  const [instagram, setInstagram] = React.useState(initialSettings.socialLinks.instagram || '');
  const [youtube, setYoutube] = React.useState(initialSettings.socialLinks.youtube || '');

  const [saving, setSaving] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const applyPreset = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    // Format to local YYYY-MM-DDTHH:MM for datetime-local
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    setEstimatedEnd(local);
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleAction();
      setEnabled((prev) => !prev);
    } finally {
      setToggling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const fd = new FormData();
    fd.set('enabled', enabled ? 'true' : 'false');
    fd.set('mode', mode);
    fd.set('title', title);
    fd.set('subtitle', subtitle);
    fd.set('noticeBadge', noticeBadge);
    fd.set('estimatedEnd', estimatedEnd ? new Date(estimatedEnd).toISOString() : '');
    fd.set('showCountdown', showCountdown ? 'true' : 'false');
    fd.set('contactEmail', contactEmail);
    fd.set('discord', discord);
    fd.set('twitter', twitter);
    fd.set('instagram', instagram);
    fd.set('youtube', youtube);

    try {
      await onSaveAction(fd);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Banner & Quick Toggle */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          enabled
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl text-white font-bold shrink-0 ${
                enabled ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            >
              {enabled ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-white">
                  {enabled
                    ? 'Maintenance / Coming Soon Mode is ACTIVE'
                    : 'Site is LIVE to the Public'}
                </h2>
                <span
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                    enabled
                      ? 'bg-amber-400 text-slate-950 animate-pulse'
                      : 'bg-emerald-400 text-slate-950'
                  }`}
                >
                  {enabled ? 'Active' : 'Live'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {enabled
                  ? 'All non-admin public visitors are intercepted and shown the maintenance screen. Authenticated admins can still browse the full live site.'
                  : 'Visitors have full access to all tournaments, standings, news, teams, and player profiles.'}
              </p>
            </div>
          </div>

          {/* Quick 1-Click Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all shadow-lg active:scale-95 shrink-0 ${
              enabled
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>
              {toggling
                ? 'Updating...'
                : enabled
                ? 'Turn OFF (Go Live)'
                : 'Turn ON Maintenance'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Mode Type */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-(--ed-blue)" />
            1. Screen Type & Objective
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setMode('MAINTENANCE');
                if (title === 'Coming Soon - The Arena Awakens') {
                  setTitle("We're Upgrading the Arena");
                }
              }}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                mode === 'MAINTENANCE'
                  ? 'border-(--ed-blue) bg-blue-500/10 ring-2 ring-(--ed-blue)'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-(--ed-blue) shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Under Maintenance
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Shows technical upgrade status. Ideal for database migrations, server reboots, or algorithm updates.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('COMING_SOON');
                if (title === "We're Upgrading the Arena") {
                  setTitle('Coming Soon - The Arena Awakens');
                }
              }}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                mode === 'COMING_SOON'
                  ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Coming Soon
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  High-hype pre-launch banner. Ideal for building anticipation before the official launch or season kickoff.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Messaging Content */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            2. Header & Announcements
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Notice Pill / Badge
              </label>
              <input
                type="text"
                value={noticeBadge}
                onChange={(e) => setNoticeBadge(e.target.value)}
                placeholder="e.g. Scheduled Maintenance or Next-Gen Esports"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Support / Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="connect@esportsamaze.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Headline Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. We're Upgrading the Arena"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Subtitle / Explanation Message
            </label>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={3}
              placeholder="Describe what's happening or what fans can look forward to..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              required
            />
          </div>
        </div>

        {/* Section 3: Live Countdown Timer */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-(--ed-blue)" />
              3. Estimated Return & Countdown
            </h3>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCountdown}
                onChange={(e) => setShowCountdown(e.target.checked)}
                className="w-4 h-4 text-(--ed-blue) rounded focus:ring-(--ed-blue)"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Show Live Countdown Clock
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Target Date & Time
              </label>
              <input
                type="datetime-local"
                value={estimatedEnd}
                onChange={(e) => setEstimatedEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(1)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +1h
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(3)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +3h
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(12)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +12h
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(24)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +24h
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(72)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +3d
                </button>
                <button
                  type="button"
                  onClick={() => setEstimatedEnd('')}
                  className="px-2 py-1 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Social Channels */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-(--ed-blue)" />
            4. Community & Social Handles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Discord Invite URL
              </label>
              <input
                type="url"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="https://discord.gg/..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Twitter / X Profile URL
              </label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                YouTube Channel URL
              </label>
              <input
                type="url"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Link
            href="/maintenance"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs transition-colors shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Live Preview in New Tab</span>
          </Link>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-500 inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Configuration saved successfully!
              </span>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-(--ed-blue) hover:bg-(--ed-blue)/90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
