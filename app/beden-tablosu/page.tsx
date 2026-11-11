import { createClient } from "@/lib/supabase/server";

type ChartRow = { size: string; cells?: string[]; a?: number; b?: number; c?: number };
type Chart = { note?: string; cols: string[]; rows: ChartRow[]; notes?: string[] };

export const dynamic = "force-dynamic";

function cellsOf(row: ChartRow) {
  if (row.cells?.length) return row.cells;
  return [row.a, row.b, row.c].filter((value) => value != null).map(String);
}

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
      notes: chart.notes ?? [],
      cols: chart.cols,
      rows: chart.rows,
    };
  });
  const apparel = tables[0]?.sizes ?? [];

  return (
    <main className="mx-auto w-[min(96vw,880px)] px-4 py-10">
      <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">
        Santimetre
      </p>
      <h1 className="serif mt-1 text-5xl">Beden Tablosu</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
        Ölçüler, giysi düz bir şekilde serilmiş haldeyken alınır.
      </p>

      {error ? (
        <p className="mt-8 text-sm text-[var(--danger)]">Ölçüler şu an yüklenemedi.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {tables.map((t) => (
            <section key={t.name}>
              <h2 className="serif mb-3 text-3xl">{t.name}</h2>
              <div className="overflow-x-auto border border-[var(--line)]">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="bg-white/3 text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase">
                    <tr>
                      {t.cols.map((c) => (
                        <th key={c} className="px-4 py-3 font-normal whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.size} className="border-t border-[var(--line)]">
                        <td className="px-4 py-3">{r.size}</td>
                        {cellsOf(r).map((cell, index) => (
                          <td key={`${r.size}-${index}`} className="px-4 py-3 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {t.note ? <p className="mt-3 text-[13px] text-[var(--muted)]">{t.note}</p> : null}
              {t.notes.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-[var(--muted)]">
                  {t.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
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
