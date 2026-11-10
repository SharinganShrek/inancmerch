"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { CatalogProduct } from "@/lib/types";

export function HomeClient({
  initialProducts,
  deadlineLabel: initialDeadline,
}: {
  initialProducts: CatalogProduct[];
  deadlineLabel: string;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [deadlineLabel, setDeadlineLabel] = useState(initialDeadline);

  const load = useCallback(async () => {
    const res = await fetch("/api/catalog", { cache: "no-store" });
    const data = await res.json();
    setProducts(data.products);
    if (data.deadlineLabel) setDeadlineLabel(data.deadlineLabel);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 1000);
    return () => window.clearInterval(id);
  }, [load]);

  const alert = useMemo(() => {
    const confirmable = products.filter(
      (p) =>
        p.status !== "pending" &&
        p.status !== "failed" &&
        p.mine.some((m) => m.status === "waitlist"),
    );
    if (confirmable.length) {
      return {
        href: "/sepet",
        text: `${confirmable.map((p) => p.name).join(", ")} üretime girebilir. Sepetten siparişini kesinleştir.`,
      };
    }
    const unpaid = products.filter((p) =>
      p.mine.some((m) => m.status === "committed" && !m.paidAt),
    );
    if (unpaid.some((p) => p.paymentOpen)) {
      return {
        href: "/sepet",
        text: "Ödeme penceresi açık. 48 saat içinde ödenmeyen yer yedek listeye geçer.",
      };
    }
    return null;
  }, [products]);

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <p className="shrink-0 px-3 py-1.5 text-center text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase md:text-[11px]">
        Sipariş anındaki fiyat = ödeyeceğin maksimum tutar. Talep arttıkça fiyat
        yalnızca düşer.
      </p>
      {alert ? (
        <Link
          href={alert.href}
          className="shrink-0 bg-[var(--copper)]/20 px-3 py-2 text-center text-[12px] text-[var(--copper-soft)]"
        >
          {alert.text}
        </Link>
      ) : null}
      <section className="grid min-h-0 flex-1 grid-cols-4 gap-2 p-2 pt-0">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            deadlineLabel={deadlineLabel}
            onChanged={() => void load()}
          />
        ))}
      </section>
    </main>
  );
}
