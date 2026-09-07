import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'About — eSportsAmaze',
  description:
    'eSportsAmaze is an esports statistics platform covering competitive BGMI and the Indian esports circuit — tournaments, standings, player stats, and news, updated as tournaments happen.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <LegalPage kicker="The project" title="About eSportsAmaze" updated="September 2026">
      <p>
        <strong>eSportsAmaze</strong> is a high-performance esports statistics platform covering
        competitive <strong>Battlegrounds Mobile India (BGMI)</strong> and the wider Indian esports
        circuit. We track tournaments, standings, player statistics, roster moves, and news —
        updated as tournaments happen. The site is currently in beta as we scale toward a full
        community project for the Indian esports ecosystem.
      </p>

      <h2>Our mission</h2>
      <p>
        Our mission is to build the largest and most accurate open database for the Indian and
        global esports ecosystems. We focus on real-time updates, detailed player statistics, and
        historical data, serving fans, analysts, and organizers alike.
      </p>

      <h2>What we offer</h2>
      <ul>
        <li>
          <strong>Tournament coverage</strong> — from grassroots scrims to Tier 1 official events,
          with standings, match results, and stage-by-stage progression.
        </li>
        <li>
          <strong>Player statistics</strong> — finishes, K/D, headshots, role analysis, and career
          history.
        </li>
        <li>
          <strong>News &amp; analysis</strong> — tournament recaps, transfer coverage, and
          editorials from our desk.
        </li>
        <li>
          <strong>Head-to-head compare</strong> — put any two teams or players side by side.
        </li>
        <li>
          <strong>KRAFTON Power Rankings</strong> — decay-adjusted rolling points for teams and
          players.
        </li>
      </ul>

      <h2>How the data works</h2>
      <p>
        Match data is compiled from official tournament broadcasts, organizer sheets, and public
        sources, then reviewed before publication. Because live events move fast, scores may
        occasionally be corrected by official organizers — see our{' '}
        <Link href="/disclaimer">Disclaimer</Link> for details.
      </p>
      <p>
        Our companion community wiki at{' '}
        <a href="https://esportsamaze.in" target="_blank" rel="noopener noreferrer">
          esportsamaze.in
        </a>{' '}
        hosts community-maintained articles and historical pages, and is being merged into this
        platform over time.
      </p>

      <h2>Who we are</h2>
      <p>
        eSportsAmaze is an independent project by Bhanu Pratap. We are not affiliated with KRAFTON,
        Tencent, or any tournament organizer — see the <Link href="/disclaimer">Disclaimer</Link>{' '}
        for trademark and copyright notes.
      </p>

      <h2>Contact us</h2>
      <p>For business inquiries, data partnerships, feedback, or data corrections:</p>
      <ul>
        <li>
          Email:{' '}
          <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a>
        </li>
        <li>
          Instagram:{' '}
          <a href="https://www.instagram.com/esportsamaze" target="_blank" rel="noopener noreferrer">
            @esportsamaze
          </a>
        </li>
        <li>
          X (Twitter):{' '}
          <a href="https://x.com/esportsamaze" target="_blank" rel="noopener noreferrer">
            @esportsamaze
          </a>
        </li>
      </ul>
      <p>
        Reporting a wrong score or stat? Include the tournament and match link so we can verify and
        fix it quickly. You can also reach us via the dedicated <Link href="/contact">Contact</Link>{' '}
        page.
      </p>
    </LegalPage>
  );
}
