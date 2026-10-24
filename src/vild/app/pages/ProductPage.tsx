import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { creditFor } from '../../data/seed';
import { Button, Chip, CreditTag, EmptyState, ErrorState, ProductImage, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatISK, formatPct, formatSignedISK } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useMerchants, useProduct, useRewardRules } from '../../lib/queries';
import type { RewardRule } from '../../lib/types';
import { BackButton } from '../components/PageHeader';
import { usePageTitle } from '../lib/hooks';

const DAYS = ['mán.', 'þri.', 'mið.', 'fim.', 'fös.', 'lau.', 'sun.'];

/** "virka daga 11–14" / "þri." / "" */
function ruleWindow(rule: RewardRule): string {
  const parts: string[] = [];
  if (rule.weekdays?.length) {
    const d = [...rule.weekdays].sort();
    parts.push(d.join(',') === '1,2,3,4,5' ? 'virka daga' : d.join(',') === '6,7' ? 'um helgar' : d.map((n) => DAYS[n - 1]).join(', '));
  }
  if (rule.hoursFrom && rule.hoursTo) parts.push(`${rule.hoursFrom.replace(':00', '')}–${rule.hoursTo.replace(':00', '')}`);
  return parts.join(' ');
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = useProduct(id);
  const merchants = useMerchants();
  const merchant = merchants.data?.find((m) => m.id === product.data?.merchantId);
  const rules = useRewardRules(product.data?.merchantId ?? null);
  usePageTitle(product.data?.name ?? 'Vara');

  if (product.isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="aspect-[4/5] w-full rounded-none" />
        <div className="px-4 pt-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-3 h-6 w-1/2" />
        </div>
      </div>
    );
  }
  if (product.error) return <ErrorState message={errorMessage(product.error)} retry={() => void product.refetch()} className="m-4" />;
  if (!product.data) return <EmptyState title="Varan fannst ekki" action={<Button variant="secondary" onClick={() => navigate(href(paths.appHome))}>Heim</Button>} />;

  const p = product.data;
  const hasCredit = p.creditAmount > 0;
  const applied = rules.data ? creditFor(p, rules.data).rule : null;
  const special = applied && applied.scope !== 'merchant' ? applied : null;
  const window_ = special ? ruleWindow(special) : '';

  return (
    <div className="pb-8">
      <div className="relative">
        <motion.div layoutId={`product-${p.id}`} className="aspect-[4/5] w-full overflow-hidden">
          <ProductImage src={p.image} name={p.name} className="h-full w-full" eager />
        </motion.div>
        <div className="absolute left-4 top-[max(12px,var(--safe-top))]">
          <BackButton overlay />
        </div>
      </div>

      <div className="px-4 pt-4">
        {merchant && <p className="vild-eyebrow">{merchant.name}</p>}
        <h1 className="mt-1 text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{p.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="vild-num text-[22px] font-semibold tracking-[-0.01em]">{formatISK(p.price)}</span>
          {hasCredit ? <CreditTag size="lg">{formatSignedISK(p.creditAmount)} til baka</CreditTag> : <Chip tone="neutral">Engin inneign af þessari vöru</Chip>}
        </div>
        {p.description && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{p.description}</p>}

        {special && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[hsl(var(--mint-50))] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[hsl(var(--green-700))]">
                {special.name}
                {window_ && <span className="font-medium text-[hsl(var(--green-600))]"> · {window_}</span>}
              </p>
              <p className="mt-0.5 text-[13px] text-[hsl(var(--green-600))]">
                {special.fixedAmount != null ? `${formatISK(special.fixedAmount)} til baka í stað grunninneignar` : `${formatPct(special.ratePct)} til baka í stað ${formatPct(merchant?.defaultRatePct ?? 0)}`}
              </p>
            </div>
          </div>
        )}

        <section className="mt-6" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="text-[19px] font-bold tracking-[-0.02em]">
            Svona virkar það
          </h2>
          <ol className="mt-3 space-y-2.5 text-[15px]">
            {[
              <>
                Þú borgar <span className="vild-num font-semibold">{formatISK(p.price)}</span> við kassann og sýnir kortið.
              </>,
              hasCredit ? (
                <>
                  <span className="vild-marker vild-num font-bold">{formatSignedISK(p.creditAmount)}</span> koma strax inn á inneignina þína hjá {merchant?.name ?? 'keðjunni'}.
                </>
              ) : (
                <>Þessi vara gefur ekki inneign, en þú getur nýtt inneign til að borga hana.</>
              ),
              <>Næst nýtirðu inneignina á hvaða stað keðjunnar sem er.</>,
            ].map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="vild-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-bold" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ol>
        </section>

        <Button variant="secondary" size="lg" full className="mt-7" onClick={() => navigate(href(paths.appPlaces))}>
          Finna næsta stað
        </Button>
      </div>
    </div>
  );
}
