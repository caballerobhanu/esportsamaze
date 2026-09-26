import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { LegalPage } from '@/components/legal-page';
import {
  InstagramIcon,
  TwitterXIcon,
  FacebookIcon,
  YoutubeIcon,
} from '@/components/social-icons';
import { SITE_EMAILS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact — eSportsAmaze',
  description:
    'Reach the eSportsAmaze desk — tips, news, partnerships, sponsorships, data corrections, coverage, and interviews. Email connect@esportsamaze.com.',
  alternates: { canonical: '/contact' },
};

/** The reasons people actually write in, each with its own inbox. */
const DESK = [
  {
    label: 'Tips & story leads',
    email: SITE_EMAILS.tips,
    hint: 'Something we should be covering, or a lead you want looked into.',
  },
  {
    label: 'Partnerships & sponsorships',
    email: SITE_EMAILS.partnerships,
    hint: 'Working with us, sponsoring coverage, or advertising on the site.',
  },
  {
    label: 'Press & interviews',
    email: SITE_EMAILS.press,
    hint: 'Quotes and data for your story, or arranging an interview.',
  },
  {
    label: 'Data corrections',
    email: SITE_EMAILS.corrections,
    hint: 'A score, standing, or stat that is wrong — with a source we can check.',
  },
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/esportsamaze', Icon: InstagramIcon },
  { label: 'X', href: 'https://x.com/esportsamaze', Icon: TwitterXIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/esportsamaze', Icon: FacebookIcon },
  { label: 'YouTube', href: 'https://youtube.com/@esportsamaze', Icon: YoutubeIcon },
];

export default function ContactPage() {
  return (
    <LegalPage kicker="Say hello" title="Contact eSportsAmaze" updated="September 2026">
      <p>
        We read everything that reaches the desk. Whether it is a story lead, a sponsorship, a
        request for data, or a score we got wrong, there is an address for it — and if you are not
        sure which one, the general inbox will route it.
      </p>

      <a
        href={`mailto:${SITE_EMAILS.general}`}
        className="ed-card group mb-8 flex items-center gap-4 p-5 transition-colors hover:border-[var(--ed-blue)]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ed-blue)]/10 text-[var(--ed-blue)]">
          <Mail className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="ed-label block">General — start here</span>
          <span className="block text-base font-bold transition-colors group-hover:text-[var(--ed-blue)]">
            {SITE_EMAILS.general}
          </span>
          <span className="mt-0.5 block text-[11px] text-[var(--ed-stone)]">
            Anything that does not fit a desk below — including privacy and legal notices.
          </span>
        </span>
      </a>

      <h2>Reach the right desk</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {DESK.map((desk) => (
          <a
            key={desk.email}
            href={`mailto:${desk.email}`}
            className="ed-card group block p-4 transition-colors hover:border-[var(--ed-blue)]"
          >
            <span className="ed-label block">{desk.label}</span>
            <span className="mt-1.5 block text-sm font-bold transition-colors group-hover:text-[var(--ed-blue)]">
              {desk.email}
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-[var(--ed-stone)]">
              {desk.hint}
            </span>
          </a>
        ))}
      </div>

      <h2>Reporting a data correction</h2>
      <p>
        Spotted a wrong score, standing, or player stat? Email{' '}
        <a href={`mailto:${SITE_EMAILS.corrections}`}>{SITE_EMAILS.corrections}</a> with:
      </p>
      <ul>
        <li>the tournament name and a link to the match or standings page on eSportsAmaze;</li>
        <li>the figure you believe is wrong;</li>
        <li>a source we can verify against (broadcast VOD, official sheet, or organizer post).</li>
      </ul>
      <p>
        Corrections that check out are usually fixed within a day or two. Email reaches the data
        team directly, so please use it rather than the socials for anything time-sensitive.
      </p>

      <h2>Follow us</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SOCIALS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            className="ed-card flex items-center justify-center gap-2 p-4 text-[var(--ed-blue)] transition-colors hover:border-[var(--ed-blue)]"
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
          </a>
        ))}
      </div>

      <h2>Privacy &amp; legal</h2>
      <p>
        For how we handle data, see the <Link href="/privacy-policy">Privacy Policy</Link> (which
        includes the grievance-officer contact). The rules for using the site are in the{' '}
        <Link href="/terms">Terms &amp; Conditions</Link>, and the limits on our content and data
        are set out in the <Link href="/disclaimer">Disclaimer</Link>.
      </p>
    </LegalPage>
  );
}
