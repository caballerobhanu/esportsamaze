import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms & Conditions — eSportsAmaze',
  description:
    'The terms and conditions that govern your use of eSportsAmaze — acceptable use, intellectual property, third-party ads, and limitation of liability.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage kicker="The rules" title="Terms & Conditions" updated="September 2026">
      <p>
        Welcome to eSportsAmaze. These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use
        of the website esportsamaze.com (the &ldquo;Site&rdquo;). By accessing or using the Site,
        you agree to be bound by these Terms, our <Link href="/privacy-policy">Privacy Policy</Link>
        , and our <Link href="/disclaimer">Disclaimer</Link>. If you do not agree with any part of
        these Terms, please do not use the Site.
      </p>

      <h2>About the service</h2>
      <p>
        eSportsAmaze is a free, ad-supported platform offering esports statistics, tournament
        standings, player data, rankings, and news coverage, focused on competitive BGMI and the
        Indian esports circuit. The Site does not offer public accounts: visitors do not register,
        log in, or post content directly on the Site.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old — or the minimum digital-consent age in your country — to
        use the Site. If you are a minor under the laws of your jurisdiction, please use the Site
        only with the permission of a parent or guardian.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Site for any unlawful purpose or in violation of any applicable law;</li>
        <li>
          attempt to disrupt, overload, or interfere with the operation of the Site, or circumvent
          any security or access controls;
        </li>
        <li>
          scrape, harvest, or extract data at volumes that degrade the service for others —
          reasonable personal, non-commercial use and linking to our pages are always welcome;
        </li>
        <li>
          misrepresent the Site&rsquo;s data as your own work, or remove attribution when quoting
          it.
        </li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The design, text, news articles, and the compilation of statistics and match data on the
        Site are the property of eSportsAmaze unless stated otherwise. You may quote or reference
        our data with a clear attribution and a link back to the relevant page.
      </p>
      <p>
        Game titles, in-game images, team logos, and tournament assets are the property of their
        respective owners (such as KRAFTON and Tencent) and are used under fair-use principles for
        identification and reporting — see our <Link href="/disclaimer">Disclaimer</Link>.
        Community-maintained articles hosted on our wiki at esportsamaze.in are governed by the
        terms published there.
      </p>

      <h2>Third-party services and advertising</h2>
      <p>
        The Site displays advertising served by third parties, including Google AdSense, and may
        contain links to external websites. Those services are governed by their own terms and
        privacy policies, and we are not responsible for their content or practices. See our{' '}
        <Link href="/privacy-policy">Privacy Policy</Link> for details on advertising cookies.
      </p>

      <h2>Accuracy and availability</h2>
      <p>
        The Site and its content are provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis without warranties of any kind. Esports data may contain delays or
        errors — see the <Link href="/disclaimer">Disclaimer</Link>, which forms part of these
        Terms.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, eSportsAmaze and its operator shall not be liable
        for any indirect, incidental, or consequential damages — including losses arising from
        betting, financial, or other decisions made based on the data or content available on the
        Site.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Any disputes arising from your use of the
        Site shall be subject to the exclusive jurisdiction of the courts of competent jurisdiction
        in India.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may revise these Terms at any time. Changes are published on this page with an updated
        &ldquo;Last updated&rdquo; date, and continued use of the Site after changes take effect
        constitutes acceptance of the revised Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a> or visit our{' '}
        <Link href="/contact">Contact</Link> page.
      </p>
    </LegalPage>
  );
}
