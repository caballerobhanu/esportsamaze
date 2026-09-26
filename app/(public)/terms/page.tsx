import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { SITE_EMAILS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms & Conditions — eSportsAmaze',
  description:
    'The terms that govern your use of eSportsAmaze — acceptable use, intellectual property, submissions, third-party ads, and limitation of liability.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage kicker="The rules" title="Terms & Conditions" updated="September 2026">
      <p>
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use of{' '}
        <strong>esportsamaze.com</strong> (the &ldquo;Site&rdquo;), operated by the eSportsAmaze team
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By using the Site you agree to
        these Terms, our <Link href="/privacy-policy">Privacy Policy</Link>, and our{' '}
        <Link href="/disclaimer">Disclaimer</Link>, which form part of these Terms. If you do not
        agree, please do not use the Site.
      </p>

      <h2>About the service</h2>
      <p>
        eSportsAmaze is a free, ad-supported platform offering esports news, tournament standings,
        player data, rankings, and statistics, focused on competitive BGMI and the Indian esports
        circuit. There are no public accounts: visitors do not register, log in, or post content on
        the Site.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old to use the Site. If you are between 13 and 18 — or
        otherwise a minor where you live — you may use the Site only with the permission and
        involvement of a parent or guardian. By using the Site you confirm you meet these
        requirements.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Site for any unlawful purpose or in breach of any applicable law;</li>
        <li>
          attempt to disrupt, overload, or interfere with the Site, or to bypass any security or
          access control;
        </li>
        <li>
          scrape, harvest, or extract data at volumes that degrade the service for others —
          reasonable personal, non-commercial use, and linking to our pages, are welcome;
        </li>
        <li>
          present the Site&rsquo;s data as your own work, or remove attribution when you quote it;
        </li>
        <li>misrepresent your identity, or your connection to eSportsAmaze or any third party.</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The design, original text, articles, and the compilation of statistics and match data on the
        Site belong to eSportsAmaze unless stated otherwise. You may quote or reference our data
        with clear attribution and a link back to the relevant page. You may not republish our
        content wholesale or sell it as your own.
      </p>
      <p>
        Game titles, in-game images, team logos, and tournament assets belong to their respective
        owners and are used for identification and reporting under fair-use principles. We are not
        affiliated with, endorsed by, or connected to any game publisher or tournament organizer —
        see our <Link href="/disclaimer">Disclaimer</Link>.
      </p>

      <h2>Submissions</h2>
      <p>
        If you send us a tip, file, image, or other material, you confirm that you have the right to
        share it and that doing so does not infringe anyone else&rsquo;s rights. You grant us a
        non-exclusive, worldwide, royalty-free licence to use, edit, publish, and archive that
        material in connection with our coverage. We are not obliged to use, respond to, or return
        anything you send, and we may remove it at any time. Please do not send material you expect
        us to keep confidential unless we have agreed that in advance.
      </p>

      <h2>Third-party services and advertising</h2>
      <p>
        The Site displays advertising served by third parties, including Google AdSense, and links
        to external websites. Those services are governed by their own terms and privacy policies,
        and we are not responsible for their content or practices. See our{' '}
        <Link href="/privacy-policy">Privacy Policy</Link> for how advertising cookies are used.
      </p>

      <h2>Accuracy and availability</h2>
      <p>
        The Site and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis, without warranties of any kind. Esports data may contain delays or
        errors — see the <Link href="/disclaimer">Disclaimer</Link>. We do not guarantee that the
        Site will be uninterrupted, timely, or free of faults.
      </p>

      <h2>No professional advice</h2>
      <p>
        Nothing on the Site is financial, betting, legal, or other professional advice. Stats,
        rankings, and commentary are published for information and interest only, and you should not
        rely on them to make a decision of consequence.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, eSportsAmaze and the people behind it shall not be
        liable for any indirect, incidental, special, or consequential loss — including losses
        arising from betting, financial, or other decisions made using the Site&rsquo;s content or
        data. Where liability cannot be excluded, it is limited to the amount you paid to use the
        Site, which is nothing, because the Site is free.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless eSportsAmaze and its team from any claim or loss
        arising out of your misuse of the Site or your breach of these Terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Disputes arising from your use of the Site
        are subject to the exclusive jurisdiction of the courts of competent jurisdiction in India.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may revise these Terms at any time. Changes are published on this page with an updated
        &ldquo;Last updated&rdquo; date, and continued use of the Site after a change takes effect
        means you accept the revised Terms. If any provision is found unenforceable, the rest stays
        in force.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a> or visit the{' '}
        <Link href="/contact">Contact</Link> page.
      </p>
    </LegalPage>
  );
}
