import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { SITE_EMAILS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Disclaimer — eSportsAmaze',
  description:
    'General disclaimer for eSportsAmaze content and data: no affiliation with game publishers or organizers, accuracy and live-score delays, external links, and copyright notes.',
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return (
    <LegalPage kicker="The fine print" title="General Disclaimer" updated="September 2026">
      <p>
        The content on eSportsAmaze is published for information and interest only. While we work to
        keep everything accurate and current, we make no warranties of any kind — express or implied
        — about the completeness, accuracy, reliability, or availability of the Site or its content.
        Any reliance you place on it is at your own risk.
      </p>

      <h2>No affiliation with publishers or organizers</h2>
      <p>
        eSportsAmaze is an independent publication. We are{' '}
        <strong>
          not affiliated with, associated with, authorized by, endorsed by, sponsored by, or in any
          way officially connected to
        </strong>{' '}
        any game publisher, developer, distributor, or tournament organizer. This includes, without
        limitation, <strong>KRAFTON, Tencent, Garena, Riot Games, Activision Blizzard, Epic Games,
        Valve, Electronic Arts, Microsoft, Sony, Ubisoft, and Supercell</strong> — and any other
        publisher or organizer whose titles, teams, or events we cover or name.
      </p>
      <p>
        Any such names, logos, or assets are used solely to identify the games, teams, and events
        being reported on. Their appearance on this Site does not suggest any partnership,
        sponsorship, endorsement, or approval in either direction.
      </p>

      <h2>Trademarks and copyright</h2>
      <p>
        Game titles — including Battlegrounds Mobile India (BGMI) — team logos, in-game images, and
        tournament assets are the property of their respective owners. We use them for the purposes
        of news reporting, criticism, commentary, and database compilation, on a fair-use basis. All
        trademarks remain the property of their owners and are used here for identification only.
      </p>
      <p>
        Rights holders who believe an asset or extract is used improperly can contact us at{' '}
        <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a>. We review takedown
        requests promptly and will act on valid ones.
      </p>

      <h2>Esports data and live scores</h2>
      <p>
        We compile tournament data from official broadcasts, organizer sheets, and public sources.
        Because live events move quickly, scores and statistics can be delayed or later corrected by
        official organizers, and figures published here may change as a result. Where we get
        something wrong, we correct it — see the <Link href="/contact">Contact</Link> page to report
        an error.
      </p>

      <h2>No professional advice</h2>
      <p>
        Nothing on this Site is financial, betting, legal, or professional advice. In particular, we
        publish no betting tips and take no responsibility for any betting or financial decision
        made using our content or data.
      </p>

      <h2>External links</h2>
      <p>
        The Site links to websites we do not control. We have no control over their content or
        availability, and a link does not imply that we endorse the site or the views expressed on
        it.
      </p>

      <h2>Views and opinions</h2>
      <p>
        Commentary, analysis, and editorials reflect the views of their authors at the time of
        writing. They are opinions, not statements of fact, and may change as events develop.
      </p>

      <h2>Changes to this disclaimer</h2>
      <p>
        We may update this disclaimer from time to time. Changes are published on this page with an
        updated &ldquo;Last updated&rdquo; date.
      </p>

      <h2>Consent</h2>
      <p>
        By using the Site you accept this disclaimer, together with our{' '}
        <Link href="/terms">Terms &amp; Conditions</Link> and{' '}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
