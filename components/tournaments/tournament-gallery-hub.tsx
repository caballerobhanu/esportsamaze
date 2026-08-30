'use client';

import React from 'react';
import {
  Camera,
  Image as ImageIcon,
  Maximize2,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface GalleryPhoto {
  id: string;
  title: string;
  category: 'Arena & Stage' | 'Trophy & Awards' | 'Teams & Players' | 'Highlights';
  url: string;
  caption?: string;
}

interface TournamentGalleryHubProps {
  tournamentName: string;
  bannerUrl?: string | null;
  imageUrl?: string | null;
  customPhotos?: GalleryPhoto[];
}

export function TournamentGalleryHub({
  tournamentName,
  bannerUrl,
  imageUrl,
  customPhotos,
}: TournamentGalleryHubProps) {
  // Curated fallback esports tournament gallery images if no custom photos provided
  const photos: GalleryPhoto[] = React.useMemo(() => {
    if (customPhotos && customPhotos.length > 0) return customPhotos;

    const list: GalleryPhoto[] = [];

    if (bannerUrl) {
      list.push({
        id: 'hero-banner',
        title: `${tournamentName} Official Banner & Key Art`,
        category: 'Arena & Stage',
        url: bannerUrl,
        caption: 'Official tournament key visual and broadcast branding.',
      });
    }

    list.push(
      {
        id: 'lan-stage-1',
        title: 'LAN Championship Stage & Grand Arena',
        category: 'Arena & Stage',
        url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80',
        caption: '16-team soundproof battle pods on the main stage under dynamic arena lighting.',
      },
      {
        id: 'trophy-reveal',
        title: 'Championship Trophy & Winners Podium',
        category: 'Trophy & Awards',
        url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=80',
        caption: 'Custom championship trophy awaiting the Grand Finals champions.',
      },
      {
        id: 'crowd-arena',
        title: 'Packed Stadium & Fan Atmosphere',
        category: 'Arena & Stage',
        url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=80',
        caption: 'Thousands of passionate esports fans cheering for their favorite squads.',
      },
      {
        id: 'player-focus',
        title: 'High-Stakes Clutch Focus',
        category: 'Teams & Players',
        url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1400&q=80',
        caption: 'Fraggers locked in during the crucial final circle zone rotation.',
      },
      {
        id: 'caster-desk',
        title: 'Official Broadcast & Caster Desk',
        category: 'Highlights',
        url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1400&q=80',
        caption: 'Official casters and analysts breaking down every circle shift live.',
      },
      {
        id: 'champions-stage',
        title: 'Victory Confetti & Champions Celebration',
        category: 'Trophy & Awards',
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
        caption: 'Gold confetti showers the champions after lifting the trophy on the grand stage.',
      }
    );

    return list;
  }, [tournamentName, bannerUrl, customPhotos]);

  const [activeCategory, setActiveCategory] = React.useState<string>('ALL');
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const categories = ['ALL', 'Arena & Stage', 'Trophy & Awards', 'Teams & Players', 'Highlights'];

  const filteredPhotos = React.useMemo(() => {
    if (activeCategory === 'ALL') return photos;
    return photos.filter((p) => p.category === activeCategory);
  }, [photos, activeCategory]);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredPhotos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category Pills Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] shadow-2xs">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#0A5FC4]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Tournament Media &amp; Gallery
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#0A5FC4] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Photos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPhotos.map((photo, idx) => (
          <div
            key={photo.id || idx}
            onClick={() => openLightbox(idx)}
            className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-16/10 cursor-pointer shadow-2xs hover:shadow-lg transition-all"
          >
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

            {/* Top Category Badge */}
            <div className="absolute top-3 left-3">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
                {photo.category}
              </span>
            </div>

            {/* Bottom Caption Info */}
            <div className="absolute bottom-3 left-3 right-3">
              <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-blue-300 transition-colors">
                {photo.title}
              </h4>
              {photo.caption && (
                <p className="text-[10px] text-white/70 line-clamp-1 mt-0.5">
                  {photo.caption}
                </p>
              )}
            </div>

            {/* Hover Expand Icon */}
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>

      {/* ═══ LIGHTBOX MODAL ═══ */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main Lightbox Image */}
            <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filteredPhotos[lightboxIndex].url}
                alt={filteredPhotos[lightboxIndex].title}
                className="max-h-[75vh] max-w-full object-contain"
              />

              {/* Prev / Next Arrows */}
              {filteredPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Photo Info Bar Below */}
            <div className="w-full mt-3 flex items-center justify-between text-white px-2">
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {filteredPhotos[lightboxIndex].title}
                </h4>
                <p className="text-xs text-white/70">
                  {filteredPhotos[lightboxIndex].caption}
                </p>
              </div>
              <span className="text-xs font-mono text-white/50">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
