import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Disclaimer — eSportsAmaze',
  description:
    'General disclaimer for eSportsAmaze content and data: accuracy, live-score delays, external links, and copyright notes for game assets.',
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return (
    <LegalPage kicker="The fine print" title="General Disclaimer" updated="September 2026">
      <p>
        The content provided on eSportsAmaze is for informational and educational purposes only.
        While we strive to keep the information up to date and correct, we make no representations
        or warranties of any kind, express or implied, about the completeness, accuracy,
        reliability, suitability, or availability of the website or the information, products,
        services, or related graphics contained on the website for any purpose. Any reliance you
        place on such information is therefore strictly at your own risk.
      </p>

      <h2>Esports data &amp; live scores</h2>
      <p>
        eSportsAmaze provides real-time and historical data for esports tournaments. Data is
        compiled from official broadcasts, organizer sheets, and public sources. Due to the dynamic
        nature of live events, scores and statistics may be subject to occasional delays or
        corrections by official tournament organizers, and published figures may change as a
        result.
      </p>
      <p>
        We are not responsible for any betting or financial decisions made based on the data
        provided on this site.
      </p>

      <h2>External links</h2>
      <p>
        This website contains links to other websites that are not under the control of
        eSportsAmaze. We have no control over the nature, content, and availability of those sites.
        The inclusion of any links does not necessarily imply a recommendation of, or endorsement
        of, the views expressed within them.
      </p>

      <h2>Copyright &amp; fair use</h2>
      <p>
        All game images, team logos, and tournament assets are the property of their respective
        owners (for example, KRAFTON, Tencent, and Riot Games). eSportsAmaze uses these assets
        under fair-use principles for the purposes of news reporting, criticism, commentary, and
        database compilation. eSportsAmaze is not affiliated with, sponsored by, or endorsed by any
        game publisher or tournament organizer.
      </p>
      <p>
        Game names — including Battlegrounds Mobile India (BGMI) — and related trademarks are the
        property of their respective owners and are used on this site for identification purposes
        only.
      </p>
      <p>
        Rights holders who believe an asset is used improperly can contact us at{' '}
        <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a> and we will review
        takedown requests promptly.
      </p>

      <h2>Changes to this disclaimer</h2>
      <p>
        We may update this disclaimer from time to time. Changes are published on this page with an
        updated &ldquo;Last updated&rdquo; date.
      </p>

      <h2>Consent</h2>
      <p>
        By using our website, you hereby consent to our disclaimer and agree to its terms, together
        with our <Link href="/terms">Terms &amp; Conditions</Link> and{' '}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
