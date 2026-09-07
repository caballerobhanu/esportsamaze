import type { Metadata } from 'next';
import Link from 'next/link';
import { AtSign, Camera, Mail } from 'lucide-react';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Contact — eSportsAmaze',
  description:
    'Get in touch with eSportsAmaze — business inquiries, data partnerships, feedback, and data corrections. Email connect@esportsamaze.com.',
  alternates: { canonical: '/contact' },
};

const CHANNELS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'connect@esportsamaze.com',
    href: 'mailto:connect@esportsamaze.com',
    hint: 'Best for business inquiries, partnerships, and legal notices.',
  },
  {
    icon: Camera,
    label: 'Instagram',
    value: '@esportsamaze',
    href: 'https://www.instagram.com/esportsamaze',
    hint: 'Matchday graphics, results, and announcements.',
  },
  {
    icon: AtSign,
    label: 'X (Twitter)',
    value: '@esportsamaze',
    href: 'https://x.com/esportsamaze',
    hint: 'Quick updates and live-tournament chatter.',
  },
];

export default function ContactPage() {
  return (
    <LegalPage kicker="Say hello" title="Contact eSportsAmaze" updated="September 2026">
      <p>
        Questions, feedback, partnership ideas, or a wrong score to report? We read everything and
        usually respond within a few days.
      </p>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {CHANNELS.map((channel) => (
          <a
            key={channel.label}
            href={channel.href}
            target={channel.href.startsWith('mailto:') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="ed-card group block p-4 transition-colors hover:border-[var(--ed-blue)]"
          >
            <div className="flex items-center gap-2 text-[var(--ed-blue)]">
              <channel.icon className="h-4 w-4" aria-hidden />
              <span className="ed-label text-[var(--ed-blue)]">{channel.label}</span>
            </div>
            <p className="mt-2 text-sm font-bold transition-colors group-hover:text-[var(--ed-blue)]">
              {channel.value}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--ed-stone)]">{channel.hint}</p>
          </a>
        ))}
      </div>

      <h2>Reporting a data correction</h2>
      <p>
        Spotted a wrong score, standing, or player stat? Email{' '}
        <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a> with:
      </p>
      <ul>
        <li>the tournament name and a link to the match or standings page on eSportsAmaze;</li>
        <li>the figure you believe is wrong;</li>
        <li>a source we can verify against (broadcast VOD, official sheet, or organizer post).</li>
      </ul>
      <p>
        Corrections that check out are usually fixed within a day or two. Please don&rsquo;t use
        the comments or socials for corrections — email reaches the data team directly.
      </p>

      <h2>Other things</h2>
      <ul>
        <li>
          <strong>Press &amp; content:</strong> we&rsquo;re happy to provide data or commentary for
          esports coverage — email us with your outlet and deadline.
        </li>
        <li>
          <strong>Wiki contributions:</strong> our community wiki lives at{' '}
          <a href="https://esportsamaze.in" target="_blank" rel="noopener noreferrer">
            esportsamaze.in
          </a>
          .
        </li>
        <li>
          <strong>Privacy or legal:</strong> see the <Link href="/privacy-policy">Privacy Policy</Link>{' '}
          (includes the grievance officer contact) and <Link href="/terms">Terms &amp; Conditions</Link>.
        </li>
      </ul>
    </LegalPage>
  );
}
