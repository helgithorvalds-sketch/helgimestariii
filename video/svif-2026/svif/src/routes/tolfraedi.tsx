import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sequence, Reveal } from "@/components/motion/Reveal";
import { DisplayTitle, Eyebrow } from "@/components/SvifBits";

export const Route = createFileRoute("/tolfraedi")({
  head: () => ({
    meta: [
      { title: "Tölfræði · SVIF" },
      { name: "description", content: "Innri tölfræði um heimsóknir." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Tolfraedi,
});

interface ClickRow {
  src: string | null;
  medium: string | null;
  path: string | null;
  created_at: string;
}

interface Agg {
  src: string;
  medium: string;
  count: number;
  last: string;
}

function Tolfraedi() {
  const [rows, setRows] = useState<ClickRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clicks")
        .select("src, medium, path, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) setError(error.message);
      else setRows((data as ClickRow[]) ?? []);
    })();
  }, []);

  const aggregated: Agg[] = (() => {
    if (!rows) return [];
    const map = new Map<string, Agg>();
    for (const r of rows) {
      const key = `${r.src ?? "(engin)"}|${r.medium ?? "(engin)"}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (r.created_at > existing.last) existing.last = r.created_at;
      } else {
        map.set(key, {
          src: r.src ?? "(engin)",
          medium: r.medium ?? "(engin)",
          count: 1,
          last: r.created_at,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  })();

  const th =
    "label-caps px-4 py-4 text-left text-[length:max(10.5px,0.58rem)] font-medium text-[color:var(--ink)]/66 sm:px-5";
  // Icelandic date and time, independent of the browser's locale data: 9.11.2026 kl. 01:56
  const when = (iso: string) => {
    const d = new Date(iso);
    const p2 = (n: number) => String(n).padStart(2, "0");
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} kl. ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  const n = rows?.length ?? 0;
  const countLine = n % 10 === 1 && n % 100 !== 11 ? "heimsókn skráð" : "heimsóknir skráðar";
  const td = "px-4 py-4 sm:px-5";
  return (
    <main className="min-h-screen bg-[color:var(--cream)] px-5 py-20 text-[color:var(--ink)] md:px-10 md:py-28">
      <div className="mx-auto max-w-5xl">
        <Sequence id="efni" tabIndex={-1} data-focus-target="">
          <Eyebrow>Innri síða</Eyebrow>
          <DisplayTitle as="h1" caps="Tölfræði" size="lg" className="mt-5" />
          <Reveal kind="block" role="body">
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[color:var(--ink)]/62">
              Heimsóknir eftir uppruna (<code className="whitespace-nowrap text-[13px]">?src=</code>
              ) og miðli (<code className="whitespace-nowrap text-[13px]">?medium=</code>).
            </p>
          </Reveal>
        </Sequence>

        {error && (
          <div
            role="alert"
            className="mt-10 border-l border-[color:var(--destructive)] pl-4 text-sm text-[color:var(--ink)]/80"
          >
            Villa: {error}
          </div>
        )}
        {!rows && !error && (
          <p className="label-caps mt-12 text-[length:max(10.5px,0.62rem)] text-[color:var(--ink)]/66">
            Sæki gögn
          </p>
        )}

        {rows && (
          <div className="fade-in mt-12">
            <p className="label-caps mb-4 text-[length:max(10.5px,0.6rem)] text-[color:var(--ink)]/66">
              Alls {n} {countLine} (síðustu 1000)
            </p>
            <div className="overflow-x-auto border-t border-[color:var(--ink)]/20">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-[color:var(--ink)]/12">
                    <th className={th}>Uppruni</th>
                    <th className={th}>Miðill</th>
                    <th className={`${th} text-right`}>Fjöldi</th>
                    <th className={th}>Síðasti smellur</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.map((a) => (
                    <tr key={a.src + a.medium} className="border-b border-[color:var(--ink)]/10">
                      <td className={`${td} font-medium text-[color:var(--rose-deep)]`}>{a.src}</td>
                      <td className={`${td} text-[color:var(--ink)]/80`}>{a.medium}</td>
                      <td className={`${td} text-right tabular-nums`}>{a.count}</td>
                      <td className={`${td} tabular-nums text-[color:var(--ink)]/66`}>
                        {when(a.last)}
                      </td>
                    </tr>
                  ))}
                  {aggregated.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[color:var(--ink)]/50">
                        Engar heimsóknir enn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
