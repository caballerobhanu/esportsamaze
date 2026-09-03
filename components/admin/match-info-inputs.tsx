'use client';

import React from 'react';
import {
  Gamepad2,
  Trophy,
  Calendar,
  Clock,
  Globe,
  Radio,
  Tv,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  MapPin,
  Flame,
  Check,
  Search,
  ChevronDown,
} from 'lucide-react';
import { BGMI_PUBGM_MAPS } from '@/lib/tournament-math';

export interface MatchVodItem {
  id: string;
  title: string;
  type: 'MAIN' | 'LANGUAGE' | 'MAP_STREAM' | 'CLEAN_FEED' | 'WATCH_PARTY' | 'PLAYER_POV' | 'HIGHLIGHTS';
  language?: string;
  platform: 'YouTube' | 'Twitch' | 'Kick' | 'Loco' | 'Facebook' | 'Custom';
  url: string;
}

export interface GameOption {
  id: string;
  name: string;
  slug: string;
}

export interface TournamentOption {
  id: string;
  name: string;
  slug: string;
  gameId: string;
  prizeDistribution?: any;
  stages?: { id: string; name: string }[];
}

export interface MatchInfoInputsProps {
  allGames: GameOption[];
  allTournaments: TournamentOption[];
  initialGameId?: string;
  initialTournamentId?: string;
  initialStageName?: string;
  initialStageType?: string;
  initialGroupName?: string;
  initialMatchNumber?: number;
  initialOverallMatchNumber?: number;
  initialMapName?: string;
  initialMatchType?: string;
  initialScheduledAt?: string; // ISO date string
  initialMatchTime?: string;
  initialTimezone?: string;
  initialVods?: MatchVodItem[] | any;
  initialStatus?: string;
}

export const WORLD_TIMEZONES = [
  // Asia & Middle East
  { value: 'Asia/Kolkata', offset: '+05:30', code: 'IST', label: '🇮🇳 India (IST, UTC+5:30)' },
  { value: 'Asia/Riyadh', offset: '+03:00', code: 'AST', label: '🇸🇦 Saudi Arabia / Riyadh (AST, UTC+3:00)' },
  { value: 'Asia/Dubai', offset: '+04:00', code: 'GST', label: '🇦🇪 UAE / Dubai (GST, UTC+4:00)' },
  { value: 'Asia/Dhaka', offset: '+06:00', code: 'BST', label: '🇧🇩 Bangladesh / Dhaka (BST, UTC+6:00)' },
  { value: 'Asia/Karachi', offset: '+05:00', code: 'PKT', label: '🇵🇰 Pakistan / Karachi (PKT, UTC+5:00)' },
  { value: 'Asia/Kathmandu', offset: '+05:45', code: 'NPT', label: '🇳🇵 Nepal / Kathmandu (NPT, UTC+5:45)' },
  { value: 'Asia/Colombo', offset: '+05:30', code: 'IST', label: '🇱🇰 Sri Lanka (IST, UTC+5:30)' },
  { value: 'Asia/Singapore', offset: '+08:00', code: 'SGT', label: '🇸🇬 Singapore & Malaysia (SGT, UTC+8:00)' },
  { value: 'Asia/Kuala_Lumpur', offset: '+08:00', code: 'MYT', label: '🇲🇾 Malaysia / Kuala Lumpur (MYT, UTC+8:00)' },
  { value: 'Asia/Manila', offset: '+08:00', code: 'PHT', label: '🇵🇭 Philippines / Manila (PHT, UTC+8:00)' },
  { value: 'Asia/Bangkok', offset: '+07:00', code: 'ICT', label: '🇹🇭 Thailand / Bangkok (ICT, UTC+7:00)' },
  { value: 'Asia/Jakarta', offset: '+07:00', code: 'WIB', label: '🇮🇩 Indonesia / Jakarta (WIB, UTC+7:00)' },
  { value: 'Asia/Ho_Chi_Minh', offset: '+07:00', code: 'ICT', label: '🇻🇳 Vietnam / Ho Chi Minh (ICT, UTC+7:00)' },
  { value: 'Asia/Seoul', offset: '+09:00', code: 'KST', label: '🇰🇷 South Korea / Seoul (KST, UTC+9:00)' },
  { value: 'Asia/Tokyo', offset: '+09:00', code: 'JST', label: '🇯🇵 Japan / Tokyo (JST, UTC+9:00)' },
  { value: 'Asia/Shanghai', offset: '+08:00', code: 'CST', label: '🇨🇳 China / Beijing (CST, UTC+8:00)' },
  { value: 'Asia/Hong_Kong', offset: '+08:00', code: 'HKT', label: '🇭🇰 Hong Kong (HKT, UTC+8:00)' },
  { value: 'Asia/Taipei', offset: '+08:00', code: 'CST', label: '🇹🇼 Taiwan / Taipei (CST, UTC+8:00)' },
  { value: 'Asia/Tashkent', offset: '+05:00', code: 'UZT', label: '🇺🇿 Uzbekistan (UZT, UTC+5:00)' },
  { value: 'Asia/Almaty', offset: '+05:00', code: 'ALMT', label: '🇰🇿 Kazakhstan / Almaty (UTC+5:00)' },
  { value: 'Asia/Kuwait', offset: '+03:00', code: 'AST', label: '🇰🇼 Kuwait (AST, UTC+3:00)' },
  { value: 'Asia/Qatar', offset: '+03:00', code: 'AST', label: '🇶🇦 Qatar / Doha (AST, UTC+3:00)' },
  { value: 'Asia/Bahrain', offset: '+03:00', code: 'AST', label: '🇧🇭 Bahrain (AST, UTC+3:00)' },
  { value: 'Asia/Muscat', offset: '+04:00', code: 'GST', label: '🇴🇲 Oman (GST, UTC+4:00)' },

  // Global / UTC
  { value: 'UTC', offset: '+00:00', code: 'UTC', label: '🌐 UTC / GMT — Coordinated Universal Time (UTC+0:00)' },

  // Europe
  { value: 'Europe/London', offset: '+00:00', code: 'GMT', label: '🇬🇧 UK / London (GMT/BST, UTC+0/+1)' },
  { value: 'Europe/Berlin', offset: '+01:00', code: 'CET', label: '🇪🇺 Central Europe / Berlin / Paris (CET/CEST, UTC+1/+2)' },
  { value: 'Europe/Paris', offset: '+01:00', code: 'CET', label: '🇫🇷 France / Paris (CET, UTC+1:00)' },
  { value: 'Europe/Madrid', offset: '+01:00', code: 'CET', label: '🇪🇸 Spain / Madrid (CET, UTC+1:00)' },
  { value: 'Europe/Rome', offset: '+01:00', code: 'CET', label: '🇮🇹 Italy / Rome (CET, UTC+1:00)' },
  { value: 'Europe/Stockholm', offset: '+01:00', code: 'CET', label: '🇸🇪 Sweden / Stockholm (CET, UTC+1:00)' },
  { value: 'Europe/Athens', offset: '+02:00', code: 'EET', label: '🇬🇷 Greece / Athens (EET, UTC+2:00)' },
  { value: 'Europe/Bucharest', offset: '+02:00', code: 'EET', label: '🇷🇴 Romania (EET, UTC+2:00)' },
  { value: 'Europe/Helsinki', offset: '+02:00', code: 'EET', label: '🇫🇮 Finland / Helsinki (EET, UTC+2:00)' },
  { value: 'Europe/Moscow', offset: '+03:00', code: 'MSK', label: '🇷🇺 Russia / Moscow (MSK, UTC+3:00)' },
  { value: 'Europe/Istanbul', offset: '+03:00', code: 'TRT', label: '🇹🇷 Turkey / Istanbul (TRT, UTC+3:00)' },

  // Americas
  { value: 'America/New_York', offset: '-05:00', code: 'EST', label: '🇺🇸 US Eastern (EST/EDT, UTC-5/-4)' },
  { value: 'America/Chicago', offset: '-06:00', code: 'CST', label: '🇺🇸 US Central (CST/CDT, UTC-6/-5)' },
  { value: 'America/Denver', offset: '-07:00', code: 'MST', label: '🇺🇸 US Mountain (MST/MDT, UTC-7/-6)' },
  { value: 'America/Los_Angeles', offset: '-08:00', code: 'PST', label: '🇺🇸 US Pacific (PST/PDT, UTC-8/-7)' },
  { value: 'America/Anchorage', offset: '-09:00', code: 'AKST', label: '🇺🇸 Alaska (AKST, UTC-9:00)' },
  { value: 'Pacific/Honolulu', offset: '-10:00', code: 'HST', label: '🇺🇸 Hawaii (HST, UTC-10:00)' },
  { value: 'America/Toronto', offset: '-05:00', code: 'EST', label: '🇨🇦 Canada / Toronto (EST, UTC-5:00)' },
  { value: 'America/Vancouver', offset: '-08:00', code: 'PST', label: '🇨🇦 Canada / Vancouver (PST, UTC-8:00)' },
  { value: 'America/Mexico_City', offset: '-06:00', code: 'CST', label: '🇲🇽 Mexico / Mexico City (CST, UTC-6:00)' },
  { value: 'America/Bogota', offset: '-05:00', code: 'COT', label: '🇨🇴 Colombia / Bogota (COT, UTC-5:00)' },
  { value: 'America/Lima', offset: '-05:00', code: 'PET', label: '🇵🇪 Peru / Lima (PET, UTC-5:00)' },
  { value: 'America/Santiago', offset: '-04:00', code: 'CLT', label: '🇨🇱 Chile / Santiago (CLT, UTC-4:00)' },
  { value: 'America/Sao_Paulo', offset: '-03:00', code: 'BRT', label: '🇧🇷 Brazil / Sao Paulo (BRT, UTC-3:00)' },
  { value: 'America/Buenos_Aires', offset: '-03:00', code: 'ART', label: '🇦🇷 Argentina / Buenos Aires (ART, UTC-3:00)' },

  // Oceania & Pacific
  { value: 'Australia/Sydney', offset: '+10:00', code: 'AEST', label: '🇦🇺 Australia / Sydney & Melbourne (AEST/AEDT, UTC+10/+11)' },
  { value: 'Australia/Brisbane', offset: '+10:00', code: 'AEST', label: '🇦🇺 Australia / Brisbane (AEST, UTC+10:00)' },
  { value: 'Australia/Adelaide', offset: '+09:30', code: 'ACST', label: '🇦🇺 Australia / Adelaide (ACST, UTC+9:30)' },
  { value: 'Australia/Perth', offset: '+08:00', code: 'AWST', label: '🇦🇺 Australia / Perth (AWST, UTC+8:00)' },
  { value: 'Pacific/Auckland', offset: '+12:00', code: 'NZST', label: '🇳🇿 New Zealand / Auckland (NZST/NZDT, UTC+12/+13)' },
  { value: 'Pacific/Fiji', offset: '+12:00', code: 'FJT', label: '🇫🇯 Fiji (FJT, UTC+12:00)' },

  // Africa
  { value: 'Africa/Cairo', offset: '+02:00', code: 'EET', label: '🇪🇬 Egypt / Cairo (EET, UTC+2:00)' },
  { value: 'Africa/Johannesburg', offset: '+02:00', code: 'SAST', label: '🇿🇦 South Africa (SAST, UTC+2:00)' },
  { value: 'Africa/Nairobi', offset: '+03:00', code: 'EAT', label: '🇰🇪 Kenya / Nairobi (EAT, UTC+3:00)' },
  { value: 'Africa/Lagos', offset: '+01:00', code: 'WAT', label: '🇳🇬 Nigeria / Lagos (WAT, UTC+1:00)' },
  { value: 'Africa/Casablanca', offset: '+01:00', code: 'WET', label: '🇲🇦 Morocco / Casablanca (UTC+1:00)' },
];

const VOD_TYPES = [
  { value: 'MAIN', label: '📺 Main Broadcast', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { value: 'LANGUAGE', label: '🗣️ Language Cast', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { value: 'MAP_STREAM', label: '🗺️ Map & Drone Cam', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { value: 'CLEAN_FEED', label: '🎧 No Commentary', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
  { value: 'WATCH_PARTY', label: '🎉 Watch Party / Co-Stream', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { value: 'PLAYER_POV', label: '🎯 Player POV', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { value: 'HIGHLIGHTS', label: '⚡ Highlights / Replay', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
] as const;

const LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Bengali',
  'Malayalam',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Urdu',
  'Arabic',
  'Thai',
  'Indonesian',
  'Vietnamese',
  'Tagalog',
  'Korean',
  'Japanese',
  'Chinese (Mandarin)',
  'Spanish',
  'Portuguese',
  'Russian',
  'French',
  'German',
  'Turkish',
];

const POPULAR_STAGE_TYPES = [
  'Battle Royale Points Table',
  'Groups Round Robin',
  'Grand Finals',
  'Semi Finals',
  'Survival Stage / Last Chance',
  'Playoffs / Elimination Bracket',
  'Single Elimination Bracket',
  'Double Elimination Bracket',
  'Swiss System Stage',
  'Placement Stage',
  'GSL Group Format',
];

const POPULAR_STAGE_NAMES = [
  'Grand Finals',
  'Semi Finals',
  'Quarter Finals',
  'Survival Stage',
  'League Stage',
  'Group Stage',
  'Group Stage - Group A vs B',
  'Group Stage - Group B vs C',
  'Group Stage - Group A vs C',
  'Day 1',
  'Day 2',
  'Day 3',
  'Day 4',
  'The Grind / Pre-Qualifiers',
  'Round of 32',
  'Round of 64',
  'Play-ins',
  'Last Chance Qualifier (LCQ)',
];

export function MatchInfoInputs({
  allGames,
  allTournaments,
  initialGameId,
  initialTournamentId,
  initialStageName = 'Grand Finals',
  initialStageType = '',
  initialGroupName = '',
  initialMatchNumber = 1,
  initialOverallMatchNumber,
  initialMapName = 'Erangel',
  initialMatchType = 'LAN',
  initialScheduledAt,
  initialMatchTime,
  initialTimezone = 'Asia/Kolkata',
  initialVods = [],
  initialStatus = 'SCHEDULED',
}: MatchInfoInputsProps) {
  // 1. Game & Tournament Selection
  const defaultGameId = initialGameId || (allTournaments.find((t) => t.id === initialTournamentId)?.gameId || allGames[0]?.id || '');
  const [selectedGameId, setSelectedGameId] = React.useState(defaultGameId);
  const [selectedTournamentId, setSelectedTournamentId] = React.useState(initialTournamentId || '');

  // Filter tournaments by selected game
  const filteredTournaments = React.useMemo(() => {
    if (!selectedGameId) return allTournaments;
    return allTournaments.filter((t) => t.gameId === selectedGameId);
  }, [allTournaments, selectedGameId]);

  // If selected tournament is not in filtered tournaments, switch to first available or reset
  React.useEffect(() => {
    if (selectedTournamentId && !filteredTournaments.some((t) => t.id === selectedTournamentId)) {
      setSelectedTournamentId(filteredTournaments[0]?.id || '');
    } else if (!selectedTournamentId && filteredTournaments.length > 0) {
      setSelectedTournamentId(filteredTournaments[0].id);
    }
  }, [selectedGameId, filteredTournaments, selectedTournamentId]);

  // 2. Stage & Stage Type Typeahead States
  const currentTournament = allTournaments.find((t) => t.id === selectedTournamentId);
  const allKnownStages = React.useMemo(() => {
    const set = new Set<string>();
    if (currentTournament?.prizeDistribution?.stages && Array.isArray(currentTournament.prizeDistribution.stages)) {
      currentTournament.prizeDistribution.stages.forEach((s: any) => {
        if (s.stageName?.trim()) set.add(s.stageName.trim());
      });
    }
    if (currentTournament?.stages && Array.isArray(currentTournament.stages)) {
      currentTournament.stages.forEach((s: any) => {
        if (s.name?.trim()) set.add(s.name.trim());
      });
    }
    POPULAR_STAGE_NAMES.forEach((s) => set.add(s));
    return Array.from(set);
  }, [currentTournament]);

  const [stageName, setStageName] = React.useState(initialStageName || 'Grand Finals');
  const [showStageSuggs, setShowStageSuggs] = React.useState(false);

  const stageSuggestions = React.useMemo(() => {
    if (!stageName.trim()) return allKnownStages.slice(0, 6);
    const q = stageName.toLowerCase();
    return allKnownStages.filter((s) => s.toLowerCase().includes(q)).slice(0, 6);
  }, [stageName, allKnownStages]);

  const [stageType, setStageType] = React.useState(initialStageType || '');
  const [showStageTypeSuggs, setShowStageTypeSuggs] = React.useState(false);

  const stageTypeSuggestions = React.useMemo(() => {
    if (!stageType.trim()) return POPULAR_STAGE_TYPES.slice(0, 6);
    const q = stageType.toLowerCase();
    return POPULAR_STAGE_TYPES.filter((s) => s.toLowerCase().includes(q)).slice(0, 6);
  }, [stageType]);

  const [groupName, setGroupName] = React.useState(initialGroupName || '');

  // 3. Match Numbers
  const [matchNumber, setMatchNumber] = React.useState<number>(initialMatchNumber || 1);
  const [overallMatchNumber, setOverallMatchNumber] = React.useState<number | ''>(
    initialOverallMatchNumber != null ? initialOverallMatchNumber : ''
  );

  // 4. Map & Match Type (Online vs Offline)
  const [mapName, setMapName] = React.useState(initialMapName || 'Erangel');
  const [matchType, setMatchType] = React.useState(
    initialMatchType === 'Online' ? 'Online' : 'LAN'
  );

function parseTimeTo24h(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const s = timeStr.trim();

  // 1. Check 12-hour format with AM/PM e.g. "04:20 PM" or "4:20pm" or "4 PM"
  const ampmMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 2. Check 24-hour format with colon e.g. "16:20" or "16:20 IST"
  const colonMatch = s.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // 3. Check 4-digit military format e.g. "1620" or "1620 IST" or "0930"
  const fourDigitMatch = s.match(/\b(\d{2})(\d{2})\b/);
  if (fourDigitMatch) {
    const hours = parseInt(fourDigitMatch[1], 10);
    const minutes = parseInt(fourDigitMatch[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return null;
}

function parseTimezoneFromStr(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const upper = timeStr.toUpperCase();
  const tzFound = WORLD_TIMEZONES.find((tz) => upper.includes(tz.code) || upper.includes(tz.value.toUpperCase()));
  return tzFound ? tzFound.value : null;
}

  // 5. Date, Time & Timezone Handling
  const detectedTz = initialTimezone || parseTimezoneFromStr(initialMatchTime) || 'Asia/Kolkata';

  const parseInitialDate = () => {
    if (initialScheduledAt) {
      try {
        const d = new Date(initialScheduledAt);
        if (!isNaN(d.getTime())) {
          const dateParts = d.toLocaleDateString('en-CA', { timeZone: detectedTz });
          if (dateParts && dateParts.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateParts;
          }
          return d.toISOString().slice(0, 10);
        }
      } catch {}
    }
    return new Date().toISOString().slice(0, 10);
  };

  const parseInitialTime = () => {
    const fromMatchTime = parseTimeTo24h(initialMatchTime);
    if (fromMatchTime) return fromMatchTime;

    if (initialScheduledAt) {
      try {
        const d = new Date(initialScheduledAt);
        if (!isNaN(d.getTime())) {
          const timeStr = d.toLocaleTimeString('en-GB', {
            timeZone: detectedTz,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          });
          if (timeStr && timeStr.match(/^\d{2}:\d{2}$/)) {
            return timeStr;
          }
          return d.toTimeString().slice(0, 5);
        }
      } catch {}
    }
    return '17:30';
  };

  const [matchDate, setMatchDate] = React.useState(parseInitialDate);
  const [matchTime, setMatchTime] = React.useState(parseInitialTime);
  const [timezone, setTimezone] = React.useState(detectedTz);
  const [tzSearch, setTzSearch] = React.useState('');

  const filteredTimezones = React.useMemo(() => {
    if (!tzSearch.trim()) return WORLD_TIMEZONES;
    const q = tzSearch.toLowerCase();
    return WORLD_TIMEZONES.filter(
      (tz) =>
        tz.label.toLowerCase().includes(q) ||
        tz.value.toLowerCase().includes(q) ||
        tz.code.toLowerCase().includes(q) ||
        tz.offset.includes(q)
    );
  }, [tzSearch]);

  // Compute calculated ScheduledAt (ISO string) and formatted display time
  const { scheduledAtIso, formattedDisplayTime } = React.useMemo(() => {
    const tzObj = WORLD_TIMEZONES.find((tz) => tz.value === timezone) || WORLD_TIMEZONES[0];
    const tzLabelCode = tzObj.code;
    const formattedTime = `${matchTime} ${tzLabelCode}`;

    // Create ISO string taking timezone offset into account
    try {
      const dateTimeString = `${matchDate}T${matchTime}:00${tzObj.offset}`;
      const parsedDate = new Date(dateTimeString);
      if (!isNaN(parsedDate.getTime())) {
        return {
          scheduledAtIso: parsedDate.toISOString(),
          formattedDisplayTime: formattedTime,
        };
      }
    } catch {}

    return {
      scheduledAtIso: `${matchDate}T${matchTime}:00Z`,
      formattedDisplayTime: formattedTime,
    };
  }, [matchDate, matchTime, timezone]);

  // 6. Multi-VOD / Multi-Stream Links
  const [vods, setVods] = React.useState<MatchVodItem[]>(() => {
    if (Array.isArray(initialVods) && initialVods.length > 0) {
      return initialVods.map((v, i) => ({
        id: v.id || `vod-${Date.now()}-${i}`,
        title: v.title || 'Official Stream',
        type: v.type || 'MAIN',
        language: v.language || 'Hindi',
        platform: v.platform || 'YouTube',
        url: v.url || '',
      }));
    }
    return [];
  });

  const addVod = (type: MatchVodItem['type'] = 'MAIN') => {
    const preset = VOD_TYPES.find((v) => v.value === type);
    setVods((prev) => [
      ...prev,
      {
        id: `vod-${Date.now()}-${prev.length}`,
        title: preset ? preset.label.replace(/^[^\s]+\s*/, '') : 'Official Cast',
        type,
        language: type === 'LANGUAGE' ? 'Hindi' : 'English',
        platform: 'YouTube',
        url: '',
      },
    ]);
  };

  const updateVod = (index: number, patch: Partial<MatchVodItem>) => {
    setVods((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const removeVod = (index: number) => {
    setVods((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTitlePreview = `Match ${matchNumber} (${mapName})${stageName ? ` · ${stageName}` : ''}${
    overallMatchNumber ? ` · Overall #${overallMatchNumber}` : ''
  }`;

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue) transition-all';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

  return (
    <div className="space-y-6">
      {/* Hidden inputs submitted to Server Action */}
      <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
      <input type="hidden" name="matchTime" value={formattedDisplayTime} />
      <input type="hidden" name="stageType" value={stageType} />
      <input type="hidden" name="stageName" value={stageName} />
      <input type="hidden" name="matchType" value={matchType} />
      <input type="hidden" name="overallMatchNumber" value={overallMatchNumber === '' ? '' : overallMatchNumber} />
      <input type="hidden" name="vodsJson" value={JSON.stringify(vods)} />

      {/* ═══ SECTION 1: GAME & TOURNAMENT CASCADING SELECTOR ═══ */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5">
        <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3.5 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> 1. Select Game &amp; Tournament
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Game Selection */}
          <div>
            <label className={labelCls}>Esports Title / Game *</label>
            <div className="relative">
              <select
                name="gameId"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                required
                className={inputCls + ' font-bold text-slate-900 dark:text-white cursor-pointer'}
              >
                {allGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    🎮 {g.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Selecting a game filters tournaments below to keep your match list organized.
            </p>
          </div>

          {/* 2. Tournament Selection */}
          <div>
            <label className={labelCls}>Tournament Event *</label>
            <select
              name="tournamentId"
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              required
              className={inputCls + ' font-bold text-slate-900 dark:text-white cursor-pointer'}
            >
              {filteredTournaments.length === 0 ? (
                <option value="" disabled>
                  No tournaments found for this game
                </option>
              ) : (
                filteredTournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏆 {t.name}
                  </option>
                ))
              )}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Showing {filteredTournaments.length} tournament(s) for the selected game.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: STAGE & STAGE TYPE WITH TYPEAHEAD ═══ */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 flex items-center gap-2">
          <Layers className="w-4 h-4" /> 2. Stage &amp; Competition Format
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Stage Name (Typeahead: Search, Select or Add on the fly) */}
          <div className="relative">
            <label className={labelCls}>Tournament Stage *</label>
            <div className="relative">
              <input
                type="text"
                value={stageName}
                onChange={(e) => {
                  setStageName(e.target.value);
                  setShowStageSuggs(true);
                }}
                onFocus={() => setShowStageSuggs(true)}
                onBlur={() => setTimeout(() => setShowStageSuggs(false), 250)}
                placeholder="Type or select stage (e.g. Grand Finals)"
                required
                className={inputCls + ' font-bold'}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Stage suggestions popover */}
            {showStageSuggs && stageSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                <div className="p-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2.5">
                  Suggested Stages (Select or type new)
                </div>
                {stageSuggestions.map((stg, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => {
                      setStageName(stg);
                      setShowStageSuggs(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span className="font-semibold">{stg}</span>
                    {stageName.toLowerCase() === stg.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-(--ed-blue) dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Select an existing stage or type a new one directly.
            </p>
          </div>

          {/* Dynamic Stage Type (Optional Typeahead) */}
          <div className="relative">
            <label className={labelCls}>Stage Type / System (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={stageType}
                onChange={(e) => {
                  setStageType(e.target.value);
                  setShowStageTypeSuggs(true);
                }}
                onFocus={() => setShowStageTypeSuggs(true)}
                onBlur={() => setTimeout(() => setShowStageTypeSuggs(false), 250)}
                placeholder="Optional (e.g. Battle Royale Points Table)"
                className={inputCls}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Stage type suggestions popover */}
            {showStageTypeSuggs && stageTypeSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                <div className="p-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2.5">
                  Preset Systems (Select or type custom)
                </div>
                {stageTypeSuggestions.map((st, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => {
                      setStageType(st);
                      setShowStageTypeSuggs(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>{st}</span>
                    {stageType.toLowerCase() === st.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-(--ed-blue) dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Leave blank or select tournament system.</p>
          </div>

          {/* Group Name (Optional) */}
          <div>
            <label className={labelCls}>Group / Lobby (Optional)</label>
            <input
              type="text"
              name="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Group A vs Group B, Lobby 1"
              className={inputCls}
            />
            <p className="text-[10px] text-slate-400 mt-1">Useful when stages have sub-groups.</p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: MATCH NUMBERS, MAP & ONLINE / OFFLINE ═══ */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 flex items-center gap-2">
          <Flame className="w-4 h-4" /> 3. Match Details &amp; Map
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stage Match # */}
          <div>
            <label className={labelCls}>Stage Match # *</label>
            <input
              type="number"
              name="matchNumber"
              min={1}
              max={200}
              value={matchNumber}
              onChange={(e) => setMatchNumber(parseInt(e.target.value) || 1)}
              required
              className={inputCls + ' font-mono font-bold text-sm'}
            />
            <p className="text-[10px] text-slate-400 mt-1">Sequence in this stage (e.g. Match 6 of Finals).</p>
          </div>

          {/* Overall Match # */}
          <div>
            <label className={labelCls}>Overall Event Match # (Optional)</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={overallMatchNumber}
              onChange={(e) => {
                const val = e.target.value;
                setOverallMatchNumber(val === '' ? '' : parseInt(val) || '');
              }}
              placeholder="e.g. 32"
              className={inputCls + ' font-mono font-bold text-sm'}
            />
            <p className="text-[10px] text-slate-400 mt-1">Cumulative match # across entire event.</p>
          </div>

          {/* Map Selection */}
          <div>
            <label className={labelCls}>Map Played *</label>
            <select
              name="mapName"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className={inputCls + ' font-bold text-slate-900 dark:text-white cursor-pointer'}
            >
              {BGMI_PUBGM_MAPS.map((m) => (
                <option key={m} value={m}>
                  🗺️ {m}
                </option>
              ))}
            </select>
          </div>

          {/* Match Type (Online vs Offline/LAN) */}
          <div>
            <label className={labelCls}>Match Type (Environment) *</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMatchType('Online')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  matchType === 'Online'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Online
              </button>
              <button
                type="button"
                onClick={() => setMatchType('LAN')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  matchType !== 'Online'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Offline (LAN)
              </button>
            </div>
          </div>
        </div>

        {/* Live Match Title Preview Banner */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Match Label:</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
              {formatTitlePreview}
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {matchType === 'Online' ? '🌐 Online' : '🏟️ Offline LAN'}
          </span>
        </div>
      </div>

      {/* ═══ SECTION 4: SEPARATE DATE, TIME & FULL WORLD TIMEZONE SELECTOR ═══ */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 flex items-center gap-2">
          <Clock className="w-4 h-4" /> 4. Schedule, Date &amp; Timezone
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Match Date */}
          <div>
            <label className={labelCls}>Match Date *</label>
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              required
              className={inputCls + ' font-mono'}
            />
          </div>

          {/* Match Time (Local) */}
          <div>
            <label className={labelCls}>Match Start Time (Local) *</label>
            <input
              type="time"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              required
              className={inputCls + ' font-mono font-bold'}
            />
          </div>

          {/* Timezone Selector with Search Filter */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Timezone (Global Coverage) *
              </label>
              <span className="text-[10px] text-slate-400">
                {WORLD_TIMEZONES.length} world zones available
              </span>
            </div>

            <div className="space-y-2">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputCls + ' font-medium text-slate-800 dark:text-slate-200 cursor-pointer'}
              >
                {filteredTimezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>

              {/* Quick filter text */}
              <div className="relative">
                <input
                  type="text"
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                  placeholder="🔍 Search timezone by city, country, or code (e.g. Dubai, London, PST, CST)..."
                  className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                />
                {tzSearch && (
                  <button
                    type="button"
                    onClick={() => setTzSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formatted Date & Time Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Scheduled For: {matchDate} at {formattedDisplayTime}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            UTC ISO: {scheduledAtIso}
          </span>
        </div>
      </div>

      {/* ═══ SECTION 5: MULTI-VOD & MULTI-STREAM MANAGER ═══ */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 flex items-center gap-2">
              <Tv className="w-4 h-4" /> 5. Multi-VODs &amp; Stream Broadcasts
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Add multiple live stream and VOD links (Hindi/English broadcasts, Map Stream, Clean Feed, Watch Parties).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addVod('MAIN')}
              className="px-3 py-1.5 rounded-xl bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Stream / VOD
            </button>
          </div>
        </div>

        {/* Quick add category chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mr-1">+ Quick Add:</span>
          {VOD_TYPES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => addVod(v.value)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* VOD List */}
        {vods.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-center">
            <Radio className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              No live streams or VODs attached yet
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mb-3">
              Add official YouTube/Twitch/Kick streams, multi-language casts, tactical map feeds, or watch party links.
            </p>
            <button
              type="button"
              onClick={() => addVod('MAIN')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Main Broadcast VOD
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vods.map((vod, idx) => {
              const currentPreset = VOD_TYPES.find((v) => v.value === vod.type) || VOD_TYPES[0];

              return (
                <div
                  key={vod.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${currentPreset.color}`}>
                        {currentPreset.label}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        #{idx + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVod(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                      title="Remove Stream"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Stream Type */}
                    <div>
                      <label className={labelCls}>Stream Category</label>
                      <select
                        value={vod.type}
                        onChange={(e) => updateVod(idx, { type: e.target.value as any })}
                        className={inputCls + ' font-bold'}
                      >
                        {VOD_TYPES.map((vt) => (
                          <option key={vt.value} value={vt.value}>
                            {vt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Platform */}
                    <div>
                      <label className={labelCls}>Platform</label>
                      <select
                        value={vod.platform}
                        onChange={(e) => updateVod(idx, { platform: e.target.value as any })}
                        className={inputCls + ' font-bold'}
                      >
                        <option value="YouTube">YouTube</option>
                        <option value="Twitch">Twitch</option>
                        <option value="Kick">Kick</option>
                        <option value="Loco">Loco</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Custom">Custom / Other</option>
                      </select>
                    </div>

                    {/* Language (Fixed: None / Neutral is first, English only once) */}
                    <div>
                      <label className={labelCls}>Language / Audio</label>
                      <select
                        value={vod.language || 'None'}
                        onChange={(e) => updateVod(idx, { language: e.target.value })}
                        className={inputCls}
                      >
                        <option value="None">🌐 None / Neutral (No Commentary / Clean Audio)</option>
                        {LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Title / Streamer Label */}
                    <div>
                      <label className={labelCls}>Label / Streamer Name</label>
                      <input
                        type="text"
                        value={vod.title}
                        onChange={(e) => updateVod(idx, { title: e.target.value })}
                        placeholder="e.g. Official Hindi Cast, Mortal Watch Party"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* URL Row */}
                  <div>
                    <label className={labelCls}>Stream / VOD URL *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={vod.url}
                        onChange={(e) => updateVod(idx, { url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=... or https://twitch.tv/..."
                        className={inputCls + ' font-mono'}
                      />
                      {vod.url && (
                        <a
                          href={vod.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-(--ed-blue) transition-colors"
                          title="Open Stream URL in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
