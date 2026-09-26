import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { SITE_EMAILS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Privacy Policy — eSportsAmaze',
  description:
    'How eSportsAmaze collects, uses, and protects information — server logs, local storage, cookies, Google AdSense advertising, your privacy rights, and how to contact us.',
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage kicker="Your privacy" title="Privacy Policy" updated="September 2026">
      <p>
        This Privacy Policy explains how <strong>eSportsAmaze</strong> (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;) handles information when you visit{' '}
        <a href="https://esportsamaze.com" target="_blank" rel="noopener noreferrer">
          esportsamaze.com
        </a>{' '}
        (the &ldquo;Site&rdquo;). It covers this Site only. We have no other domains, apps, or
        services that this policy extends to.
      </p>
      <p>
        If anything here is unclear, or you want to exercise a right described below, write to{' '}
        <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a>.
      </p>

      <h2>Information we collect</h2>
      <p>
        The Site has no public accounts, so we never ask you to register, log in, or hand over a
        name, email address, or password to read it. What we handle falls into four categories:
      </p>
      <ul>
        <li>
          <strong>Server logs.</strong> Like most websites, our hosting and content-delivery
          providers automatically record requests. These logs can include IP address, browser type,
          internet service provider, date and time stamps, referring and exit pages, and click
          counts. We use them to keep the Site running, diagnose faults, and understand aggregate
          traffic. They are not used to build a profile of you.
        </li>
        <li>
          <strong>Local storage in your browser.</strong> We store your light/dark theme preference
          and your cookie-consent choice. These values stay on your device and are not sent to us.
        </li>
        <li>
          <strong>Aggregate view counts.</strong> Article pages record anonymous view counts so our
          editors can see which stories are read. Counts are compiled without identifying you.
        </li>
        <li>
          <strong>Messages you send us.</strong> If you email us, we receive your address and
          whatever you include. We use it only to read and answer your message.
        </li>
      </ul>

      <h2>Cookies and similar technologies</h2>
      <p>
        The Site uses cookies and similar technologies. Essential cookies and local storage keep the
        Site working — remembering your theme and your consent choice, for example. Non-essential
        cookies are used for advertising and aggregate measurement, and are set only where we are
        permitted to set them. Where required by law, we ask for your consent first through the
        consent banner, and your choice is stored on your device so we do not ask again.
      </p>
      <p>
        You can clear or block cookies at any time through your browser settings; doing so may reset
        your preferences. Instructions for common browsers are on their respective websites.
      </p>

      <h2>Advertising and Google AdSense</h2>
      <p>
        We display advertising through <strong>Google AdSense</strong> and its partners. Google and
        other third-party vendors use cookies — including the DART cookie — to serve ads based on
        your visits to this and other websites. This is how the Site stays free to read.
      </p>
      <p>
        You can opt out of personalised advertising by visiting{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          Google&rsquo;s Ads Policy
        </a>{' '}
        and the Google Ads Settings page, or by using the opt-out tools at{' '}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
          aboutads.info
        </a>
        . Opting out does not remove ads; it makes them less relevant. We have no access to, and no
        control over, the cookies set by third-party advertisers.
      </p>

      <h2>How we share information</h2>
      <p>
        We do not sell your personal information. We share it only with the service providers that
        run the Site — hosting, content delivery, and advertising — and only as needed for them to
        provide those services. We may also disclose information where we are legally required to,
        or to protect the rights, safety, and security of the Site, our readers, or the public.
      </p>
      <p>
        Some of these providers operate outside your country, so information may be processed in
        other jurisdictions. Where required, we rely on appropriate safeguards for those transfers.
      </p>

      <h2>Legal bases for processing</h2>
      <p>
        If you are in the EEA or the UK, we process information under the following legal bases:
        your <strong>consent</strong> (for non-essential cookies and advertising); our{' '}
        <strong>legitimate interests</strong> (running, securing, and understanding the Site, which
        we balance against your rights); and <strong>legal obligation</strong> where we must retain
        or disclose something by law.
      </p>

      <h2>Data retention</h2>
      <p>
        Server logs are kept by our providers for a limited period and then deleted or aggregated.
        Email correspondence is kept only as long as needed to deal with your request. Local storage
        values remain on your device until you clear them.
      </p>

      <h2>Your privacy rights</h2>
      <p>
        Depending on where you live — for example, under India&rsquo;s Digital Personal Data
        Protection Act, 2023, or the EU/UK GDPR — you may have the right to access, correct, or
        erase personal data, to withdraw consent, to object to or restrict processing, and to
        complain to a supervisory authority. Because we do not build visitor profiles, the only
        personal data we are likely to hold about you is email you have sent us. To exercise any of
        these rights, email{' '}
        <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a> and we will respond as
        required by applicable law.
      </p>

      <h2>Children&rsquo;s privacy</h2>
      <p>
        The Site is not directed at children under 13, and we do not knowingly collect personal
        information from them. If you are between 13 and 18 — or otherwise a minor where you live —
        please use the Site only with the permission and involvement of a parent or guardian. If you
        believe a child has provided us personal information, contact us and we will delete it.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect the Site. No method of
        transmission or storage over the internet is completely secure, so we cannot guarantee
        absolute security.
      </p>

      <h2>Third-party links</h2>
      <p>
        The Site links to other websites. Their privacy practices are their own, and this policy does
        not apply to them. We encourage you to read the privacy policy of any site you visit from
        ours.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes are published on this page with
        an updated &ldquo;Last updated&rdquo; date, and continued use of the Site after a change
        takes effect means you accept the revised policy.
      </p>

      <h2>Grievance officer</h2>
      <p>
        Under India&rsquo;s Digital Personal Data Protection Act, 2023, our Grievance Officer is the
        point of contact for privacy complaints and data requests:
      </p>
      <address>
        Grievance Officer, eSportsAmaze
        <br />
        Email: <a href={`mailto:${SITE_EMAILS.general}`}>{SITE_EMAILS.general}</a>
      </address>
      <p>We aim to acknowledge grievances within 72 hours and resolve them promptly.</p>
    </LegalPage>
  );
}
