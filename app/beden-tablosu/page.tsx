import { createClient } from "@/lib/supabase/server";

type ChartRow = { size: string; a: number; b: number; c: number };
type Chart = { note: string; cols: string[]; rows: ChartRow[] };

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("name, sizes, size_chart")
    .order("sort_order");

  const tables = (data ?? []).map((product) => {
    const chart = product.size_chart as Chart;
    return {
      name: product.name as string,
      sizes: (product.sizes as string[]) ?? [],
      note: chart.note,
      cols: chart.cols,
      rows: chart.rows,
    };
  });
  const apparel = tables[0]?.sizes ?? [];

  return (
    <main className="mx-auto w-[min(96vw,880px)] px-4 py-10">
      <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">
        Ölçüler cm
      </p>
      <h1 className="serif mt-1 text-5xl">Beden Tablosu</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
        TEVİT Drop giysileri ağır kumaş ve rahat kalıpla basılacak. Emin değilsen
        bir beden büyük al.
      </p>

      {error ? (
        <p className="mt-8 text-sm text-[var(--danger)]">Ölçüler şu an yüklenemedi.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {tables.map((t) => (
            <section key={t.name}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 className="serif text-3xl">{t.name}</h2>
                <p className="text-[12px] text-[var(--muted)]">{t.note}</p>
              </div>
              <div className="overflow-x-auto border border-[var(--line)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/3 text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                    <tr>
                      {t.cols.map((c) => (
                        <th key={c} className="px-4 py-3 font-normal">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.size} className="border-t border-[var(--line)]">
                        <td className="px-4 py-3">{r.size}</td>
                        <td className="px-4 py-3">{r.a}</td>
                        <td className="px-4 py-3">{r.b}</td>
                        <td className="px-4 py-3">{r.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <p className="text-[12px] tracking-[0.14em] text-[var(--copper-soft)] uppercase">
            Bedenler: {apparel.join(" · ")}
          </p>
        </div>
      )}
    </main>
  );
}
