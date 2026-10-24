import { Link } from 'react-router-dom';
import { Wordmark } from '../../components/brand';
import { href, paths } from '../../lib/paths';
import { LinkButton } from './LinkButton';
import { HOW_IT_WORKS_HASH } from './SiteHeader';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'VILD',
    links: [
      { label: 'Um VILD', to: href(paths.siteAbout) },
      { label: 'Fyrir veitingastaði', to: href(paths.siteForRestaurants) },
      { label: 'Spurningar', to: href(paths.siteFaq) },
    ],
  },
  {
    title: 'Appið',
    links: [
      { label: 'Sækja appið', to: href(paths.app) },
      { label: 'Innskráning', to: href(paths.appLogin) },
      { label: 'Rafræn skilríki', to: `${href(paths.siteFaq)}#rafraen-skilriki` },
    ],
  },
  {
    title: 'Lögfræði',
    links: [
      { label: 'Skilmálar', to: href(paths.siteTerms) },
      { label: 'Persónuvernd', to: href(paths.sitePrivacy) },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="vild-dark bg-[hsl(var(--green-900))] text-white">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <Link to={`${href(paths.site)}${HOW_IT_WORKS_HASH}`} className="inline-block text-[hsl(var(--mint-300))]" aria-label="VILD, svona virkar það">
          <Wordmark size="xl" />
        </Link>

        <div className="mt-12 grid gap-10 border-t border-[hsl(var(--border))] pt-10 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr] lg:gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--mint-300))]/80">{col.title}</p>
              {/* Each link is a 44 px row (the touch target); the text keeps its place under the title. */}
              <ul className="mt-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="inline-flex min-h-11 items-center text-[15px] font-medium text-white/85 transition-colors hover:text-[hsl(var(--mint-300))]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="sm:col-span-3 lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--mint-300))]/80">Sækja</p>
            <LinkButton to={href(paths.app)} variant="mint" className="mt-4">
              Sækja appið
            </LinkButton>
            <p className="mt-3 text-[13px] text-white/70">Væntanlegt í App Store og Google Play</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[hsl(var(--border))] pt-6 text-[14px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <a href="mailto:hallo@vild.is" className="-my-[11px] inline-flex min-h-11 items-center self-start font-medium text-white/85 hover:text-[hsl(var(--mint-300))] sm:self-center">
            hallo@vild.is
          </a>
          <p>© 2026 VILD</p>
        </div>
      </div>
    </footer>
  );
}
