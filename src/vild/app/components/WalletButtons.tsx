import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Sheet } from '../../components/kit';
import { tap } from '../../lib/motion';

type Kind = 'apple' | 'google';

/** A plain wallet glyph: a card peeking out of a pocket. Not Apple's badge artwork. */
function WalletGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className={className} aria-hidden="true" fill="none">
      <rect x="4" y="5" width="16" height="4" rx="1.5" fill="#B4FF9B" />
      <rect x="4" y="8" width="16" height="4" rx="1.5" fill="#FFD24D" />
      <path d="M4 12.5A1.5 1.5 0 0 1 5.5 11h13a1.5 1.5 0 0 1 1.5 1.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.5Z" fill="currentColor" />
      <rect x="14" y="14" width="4" height="2" rx="1" fill="#0C5C3B" />
    </svg>
  );
}

function GoogleWalletGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className={className} aria-hidden="true" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="3" fill="currentColor" />
      <path d="M3 10h18" stroke="#B4FF9B" strokeWidth="1.5" />
      <rect x="6" y="13" width="5" height="2" rx="1" fill="#FFD24D" />
    </svg>
  );
}

/**
 * "Bæta í Apple Wallet" / "Google Wallet". On the web these open a sheet that
 * says the pass is issued from the phone app; inside Capacitor they will call
 * the wallet plugins. Black like the real badges, our own glyphs.
 */
export function WalletButton({ kind, className, full = true, long = false }: { kind: Kind; className?: string; full?: boolean; long?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = kind === 'apple' ? 'Bæta í Apple Wallet' : 'Bæta í Google Wallet';
  return (
    <>
      <motion.button
        type="button"
        whileTap={tap}
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-4 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-[#111]',
          full && 'w-full',
          className,
        )}
      >
        {kind === 'apple' ? <WalletGlyph /> : <GoogleWalletGlyph />}
        <span className="truncate">{long ? label : kind === 'apple' ? 'Apple Wallet' : 'Google Wallet'}</span>
        {!long && <span className="sr-only">{label}</span>}
      </motion.button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="pb-2">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[hsl(var(--green-500))]">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">Kortið fer í veskið í símanum þegar appið er komið í App Store.</p>
              <p className="mt-1 text-[14px] text-muted-foreground">Þangað til sýnirðu QR-kóðann hér í appinu við kassann. Hann virkar alveg eins.</p>
            </div>
          </div>
          <Button variant="primary" size="lg" full className="mt-4" onClick={() => setOpen(false)}>
            Skilið
          </Button>
        </div>
      </Sheet>
    </>
  );
}
