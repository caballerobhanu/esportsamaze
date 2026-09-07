import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy — eSportsAmaze',
  description:
    'How eSportsAmaze collects, uses, and protects information — server logs, local storage, cookies, Google AdSense advertising, and your privacy rights.',
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage kicker="Your privacy" title="Privacy Policy" updated="September 2026">
      <p>
        At eSportsAmaze, accessible from{' '}
        <a href="https://esportsamaze.com" target="_blank" rel="noopener noreferrer">
          https://esportsamaze.com
        </a>
        , one of our main priorities is the privacy of our visitors. This Privacy Policy describes
        the types of information that are collected and recorded by eSportsAmaze and how we use
        them. It applies to this website only; our community wiki at esportsamaze.in is a separate
        MediaWiki service with its own policies.
      </p>
      <p>
        If you have additional questions or require more information about our Privacy Policy, do
        not hesitate to contact us at{' '}
        <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a>.
      </p>

      <h2>Information we collect</h2>
      <p>
        The Site has no public registration or login, so we never ask visitors for names, email
        addresses, or passwords. The information we handle falls into three categories:
      </p>
      <ul>
        <li>
          <strong>Server logs.</strong> Like most websites, our hosting provider automatically logs
          requests. These logs may include internet protocol (IP) addresses, browser type, Internet
          Service Provider (ISP), date and time stamps, referring/exit pages, and the number of
          clicks. This information is not linked to anything personally identifiable. We use it to
          analyze trends, administer the site, track users&rsquo; movement across the website, and
          gather aggregate demographic information.
        </li>
        <li>
          <strong>Local storage in your browser.</strong> We store your light/dark theme preference
          and your cookie-consent choice in your browser&rsquo;s local storage. These values stay
          on your device and are not transmitted to us.
        </li>
        <li>
          <strong>Aggregate view counts.</strong> Article pages record anonymous view counts so our
          editors can see which stories are read. Views are counted without identifying you.
        </li>
      </ul>
      <p>
        If you contact us by email, we receive your email address and whatever you choose to
        include. We use it only to respond to your message.
      </p>

      <h2>Cookies and web beacons</h2>
      <p>
        Like any other website, eSportsAmaze uses cookies. These cookies are used to store
        information including visitors&rsquo; preferences and the pages of the website that the
        visitor accessed or visited. The information is used to optimize the user experience by
        customizing our web page content based on visitors&rsquo; browser type and/or other
        information.
      </p>

      <h2>Google AdSense and the DART cookie</h2>
      <p>
        We display advertising on the Site served through Google AdSense. Google is one of several
        third-party vendors on our site. Third-party vendors, including Google, use cookies — known
        as DART cookies — to serve ads to our site visitors based upon their visits to
        esportsamaze.com and other sites on the internet.
      </p>
      <p>
        However, visitors may choose to decline the use of DART cookies by visiting the Google ad
        and content network Privacy Policy at the following URL:{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          https://policies.google.com/technologies/ads
        </a>
        .
      </p>

      <h2>Consent and managing cookies</h2>
      <p>
        By using our website, you consent to this Privacy Policy and agree to our{' '}
        <Link href="/terms">Terms &amp; Conditions</Link>. Where required, we ask for your consent
        to non-essential cookies through a consent banner; your choice is stored in your
        browser&rsquo;s local storage, and you can change it at any time by clearing your browser
        storage for this site.
      </p>
      <p>
        You can also choose to disable cookies through your individual browser options. For more
        detailed information about cookie management with specific web browsers, please refer to
        the browsers&rsquo; respective websites.
      </p>

      <h2>Third-party privacy policies</h2>
      <p>
        eSportsAmaze&rsquo;s Privacy Policy does not apply to other advertisers or websites. Thus,
        we advise you to consult the respective Privacy Policies of these third-party ad servers
        for more detailed information. Those policies may include their practices and instructions
        on how to opt out of certain options.
      </p>
      <p>
        Note that eSportsAmaze has no access to or control over cookies that are used by
        third-party advertisers.
      </p>

      <h2>Data retention</h2>
      <p>
        Server logs are retained by our hosting provider for a limited period and are then
        automatically deleted. Email correspondence is kept only as long as needed to handle your
        request. Local storage values remain on your device until you clear them.
      </p>

      <h2>Your privacy rights</h2>
      <p>
        Depending on where you live — for example under India&rsquo;s Digital Personal Data
        Protection Act, 2023, or the EU/UK GDPR — you may have the right to access, correct, or
        delete personal data, withdraw consent, or object to processing. Because we do not build
        visitor profiles, the only personal data we are likely to hold is email you have sent us.
        To exercise any of these rights, email{' '}
        <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a> and we will respond
        as required by applicable law.
      </p>

      <h2>Children&rsquo;s information</h2>
      <p>
        eSportsAmaze does not knowingly collect any personally identifiable information from
        children under the age of 13. If you believe your child provided such information on our
        website, please contact us and we will promptly remove it from our records.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect the Site. However, no
        method of transmission over the internet is 100% secure, and we cannot guarantee absolute
        security.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes are published on this page
        with an updated &ldquo;Last updated&rdquo; date, and continued use of the Site after
        changes take effect constitutes acceptance of the revised policy.
      </p>

      <h2>Grievance officer</h2>
      <p>
        Under India&rsquo;s Digital Personal Data Protection Act, 2023, our grievance officer is
        the point of contact for privacy complaints and data requests:
      </p>
      <address>
        Grievance Officer: Bhanu Pratap
        <br />
        Email: <a href="mailto:connect@esportsamaze.com">connect@esportsamaze.com</a>
      </address>
      <p>We aim to acknowledge grievances within 72 hours and resolve them promptly.</p>
    </LegalPage>
  );
}
