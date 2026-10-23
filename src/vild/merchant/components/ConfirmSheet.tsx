import { Button, Sheet } from '../../components/kit';

/** "Are you sure?" as a small sheet: title, one line, cancel + a destructive or primary action. */
export function ConfirmSheet({ open, onClose, onConfirm, title, body, confirmLabel = 'Staðfesta', destructive = false, loading = false }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: string; confirmLabel?: string; destructive?: boolean; loading?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} className="md:max-w-[420px]">
      <div className="pb-2">
        {body && <p className="text-[15px] text-muted-foreground">{body}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hætta við
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
