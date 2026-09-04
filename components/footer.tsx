import Link from 'next/link';

// Universal grey footer — identical in light & dark mode.
export function Footer() {
  return (
    <footer className="bg-slate-700 text-slate-200">
      <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="esportsamaze"
                className="h-8 w-auto object-contain brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-xs text-slate-300 leading-relaxed">
              An eSports Project by{' '}
              <span className="font-bold text-white">Bhanu Pratap</span>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
              Comprehensive esports data, statistics and tournament coverage — built
              for the Indian and global esports ecosystem.
            </p>
          </div>

          {/* Pages */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-white text-[11px]">
              Pages
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-white transition-colors">
                  Head-to-Head Compare
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-white transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-white text-[11px]">
              Explore
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              <li>
                <Link href="/#news" className="hover:text-white transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link
                  href="/rankings"
                  className="hover:text-white transition-colors"
                >
                  KRAFTON Rankings
                </Link>
              </li>
              <li>
                <a
                  href="https://esportsamaze.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  esportsamaze.com
                </a>
              </li>
              <li>
                <a
                  href="https://esportsamaze.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Community Wiki
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Esports Amaze · An eSports Project by Bhanu
            Pratap
          </p>
          <span>Beta Phase</span>
        </div>
      </div>
    </footer>
  );
}
