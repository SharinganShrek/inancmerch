"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { startNewDemand } from "@/lib/new-demand";
import { formatTL } from "@/lib/pricing";
import { roleLabel } from "@/lib/roles";
import type { Demand } from "@/lib/types";
import { useApp } from "./Providers";

export function TaleplerClient() {
  const { user, ready } = useApp();
  const router = useRouter();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/demands", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setDemands(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 3000);
    return () => window.clearInterval(id);
  }, [ready, user, load]);

  function createNew() {
    startNewDemand();
    router.push("/");
  }

  return (
    <main className="mx-auto w-[min(96vw,760px)] px-4 py-10">
      <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">
        Talepler
      </p>
      <h1 className="serif mt-1 text-5xl">Talep özeti</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
        70 kişi dolmadan fiyat aralık olarak görünür. Grup 70 kişiye ulaşınca
        güncel fiyat yazılır ve talep arttıkça düşer.
      </p>

      {ready && !user ? (
        <p className="mt-8 text-sm text-[var(--muted)]">
          Taleplerini görmek için{" "}
          <Link href="/giris?next=/talepler" className="underline">
            giriş yap
          </Link>
          .
        </p>
      ) : null}

      {user && loaded && demands.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Henüz talebin yok.</p>
      ) : null}

      <div className="mt-8 space-y-4">
        {demands.map((demand, index) => (
          <section key={demand.id} className="border border-[var(--line)] bg-[var(--card)] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="serif text-3xl">Talep {demands.length - index}</h2>
              <p className="text-[12px] text-[var(--muted)]">
                {demand.requesterName} · {roleLabel(demand.role)}
              </p>
            </div>
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {demand.items.map((item, itemIndex) => (
                <li key={`${item.productId}-${item.size}-${item.batch}-${itemIndex}`} className="flex gap-3 py-3">
                  <div className="h-16 w-14 shrink-0 bg-[var(--well)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="serif text-xl leading-none">{item.productName}</p>
                    <p className="mt-1 text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase">
                      {item.size} · {item.qty} adet ·{" "}
                      {item.batch === 1 ? "İlk 100" : "Sonraki grup"}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--copper-soft)]">
                      {item.unitPrice == null
                        ? `Tahmini ${formatTL(item.priceAt100)} – ${formatTL(item.priceAt70)}`
                        : `Güncel ${formatTL(item.unitPrice)} · toplam ${formatTL(item.unitPrice * item.qty)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={createNew}
        className="btn mt-8 w-full py-3 text-[12px] tracking-[0.2em]"
      >
        YENİ TALEP OLUŞTUR
      </button>
    </main>
  );
}
