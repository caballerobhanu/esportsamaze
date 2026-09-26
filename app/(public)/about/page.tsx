import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { SITE_SLOGAN, SITE_EMAILS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About — eSportsAmaze',
  description:
    'eSportsAmaze is an independent esports newsroom and statistics desk covering competitive BGMI and the Indian esports circuit — tournaments, standings, player stats, and news.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <LegalPage kicker={SITE_SLOGAN} title="About eSportsAmaze" updated="September 2026">
      <p>
        <strong>eSportsAmaze</strong> is an independent esports newsroom and statistics desk
        covering competitive <strong>Battlegrounds Mobile India (BGMI)</strong> and the wider Indian
        esports circuit. We report on tournaments and keep the numbers behind them, updating as
        events unfold. The site is in beta while the archive is being built out.
      </p>

      <h2>What we do</h2>
      <p>Two halves, one desk — reporting and data.</p>
      <ul>
        <li>
          <strong>Tournament coverage</strong> — from grassroots scrims to Tier 1 official events,
          with standings, match results, and stage-by-stage progression.
        </li>
        <li>
          <strong>Player statistics</strong> — eliminations, averages, combat metrics, role
          analysis, and career history.
        </li>
        <li>
          <strong>News &amp; analysis</strong> — tournament recaps, roster moves, and editorials
          from our desk.
        </li>
        <li>
          <strong>Rankings</strong> — decay-adjusted rolling points for teams and players.
        </li>
        <li>
          <strong>Head-to-head</strong> — put any two teams or players side by side.
        </li>
      </ul>

      <h2>How the data works</h2>
      <p>
        Match data is compiled from official broadcasts, organizer sheets, and public sources, then
        reviewed before publication. Live events move fast, so scores are sometimes corrected by
        organizers after the fact; when that happens, we update the page. Spotted a wrong figure?{' '}
        <a href={`mailto:${SITE_EMAILS.corrections}`}>{SITE_EMAILS.corrections}</a> reaches the data
        team directly.
      </p>

      <h2>Independence</h2>
      <p>
        eSportsAmaze is an independent publication. We are{' '}
        <strong>
          not affiliated with, associated with, authorized by, endorsed by, or in any way officially
          connected to
        </strong>{' '}
        any game publisher, developer, or tournament organizer — including KRAFTON, Tencent, Garena,
        Riot Games, Activision, Epic Games, and Valve, along with any other publisher whose titles
        or assets appear here. Each is an independent third party, and names or marks are used only
        to identify the games and events we cover. See our{' '}
        <Link href="/disclaimer">Disclaimer</Link> for the full statement.
      </p>

      <h2>Work with us</h2>
      <p>
        Our desk is open the way any newsroom&rsquo;s is. Whatever you are bringing us, there is an
        address for it:
      </p>
      <ul>
        <li>
          <strong>Tips &amp; story leads</strong> —{' '}
          <a href={`mailto:${SITE_EMAILS.tips}`}>{SITE_EMAILS.tips}</a>
        </li>
        <li>
          <strong>Partnerships &amp; sponsorships</strong> —{' '}
          <a href={`mailto:${SITE_EMAILS.partnerships}`}>{SITE_EMAILS.partnerships}</a>
        </li>
        <li>
          <strong>Press, coverage &amp; interviews</strong> —{' '}
          <a href={`mailto:${SITE_EMAILS.press}`}>{SITE_EMAILS.press}</a>
        </li>
        <li>
          <strong>Data corrections</strong> —{' '}
          <a href={`mailto:${SITE_EMAILS.corrections}`}>{SITE_EMAILS.corrections}</a>
        </li>
        <li>
          <strong>Everything else</strong> —{' '}
          <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a>
        </li>
      </ul>
      <p>Not sure which one? Send it to the general address and it will reach the right desk.</p>

      <h2>How we are funded</h2>
      <p>
        The site is free to read and supported by advertising. Ads are served by third parties and
        have no influence on what we report or how the data is compiled. Our{' '}
        <Link href="/privacy-policy">Privacy Policy</Link> explains how advertising cookies work.
      </p>

      <h2>Contact</h2>
      <p>
        General questions, feedback, or a wrong score:{' '}
        <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a>. Every channel is listed
        on the <Link href="/contact">Contact</Link> page.
      </p>
    </LegalPage>
  );
}
