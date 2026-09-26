import Link from 'next/link';
import { SITE_NAME, SITE_SLOGAN } from '@/lib/seo';
import {
  InstagramIcon,
  TwitterXIcon,
  FacebookIcon,
  YoutubeIcon,
} from '@/components/social-icons';
import { VerticalBrandMark } from '@/components/brand-mark';
import { CookieSettingsLink } from '@/components/cookie-settings-link';

/**
 * The footer as a stack of soft slabs: a call-to-action bar, a cobalt brand card
 * beside an index panel, then a row of follow tiles. It replaces the old dense
 * three-column link list — the surfaces carry the structure, so nothing needs a
 * divider. Depth stays flat: the slabs are separate tones of paper, no shadows.
 */
const FOOTER_LINKS: { label: string; href: string; file?: boolean }[] = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Saved Stories', href: '/news/saved' },
  { label: 'RSS Feed', href: '/rss.xml', file: true },
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/esportsamaze', Icon: InstagramIcon },
  { label: 'X', href: 'https://x.com/esportsamaze', Icon: TwitterXIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/esportsamaze', Icon: FacebookIcon },
  { label: 'YouTube', href: 'https://youtube.com/@esportsamaze', Icon: YoutubeIcon },
];

const LINK_CLASS =
  'text-[13px] font-bold tracking-[0.12em] uppercase transition-colors hover:text-[var(--ed-blue)]';

export function Footer() {
  return (
    <footer className="bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <div className="mx-auto w-full max-w-[var(--page-max-width)] px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14 lg:px-8">
        {/* Brand card + index */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl bg-[var(--ed-blue)] px-8 py-12 sm:min-h-[260px] dark:bg-[#041129]">
            <VerticalBrandMark className="h-28 w-auto max-w-full object-contain brightness-0 invert sm:h-36" />
          </div>

          <div className="flex flex-col rounded-3xl bg-[var(--ed-sand)] px-6 py-7 sm:px-9 sm:py-8">
            <p className="font-display text-2xl leading-[1.05] font-black tracking-tight uppercase sm:text-3xl">
              {SITE_SLOGAN}
            </p>

            <div className="mt-auto pt-12">
              <nav aria-label="Footer" className="flex flex-wrap gap-x-9 gap-y-3.5">
                {FOOTER_LINKS.map(({ label, href, file }) =>
                  file ? (
                    <a key={label} href={href} className={LINK_CLASS} title="RSS feed — latest esports news">
                      {label}
                    </a>
                  ) : (
                    <Link key={label} href={href} className={LINK_CLASS}>
                      {label}
                    </Link>
                  )
                )}
              </nav>

              <div className="mt-8 flex flex-col gap-2 text-[11px] text-[var(--ed-stone)] sm:flex-row sm:items-center sm:justify-between">
                <p suppressHydrationWarning>
                  © {new Date().getFullYear()} {SITE_NAME} · An eSports Project by Bhanu Pratap
                </p>
                <div className="flex items-center gap-4">
                  <CookieSettingsLink className="font-semibold tracking-wider uppercase transition-colors hover:text-[var(--ed-blue)]" />
                  <span className="font-semibold tracking-wider uppercase">Beta Phase</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Follow */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-4">
          {SOCIALS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              aria-label={label}
              className="flex aspect-[16/9] items-center justify-center rounded-3xl bg-[var(--ed-sand)] text-[var(--ed-blue)] transition-colors hover:bg-[var(--ed-blue)] hover:text-white"
            >
              <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
