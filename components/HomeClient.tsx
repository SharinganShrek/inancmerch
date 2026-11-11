"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import type { CatalogProduct } from "@/lib/types";

export function HomeClient({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);

  const load = useCallback(async () => {
    const res = await fetch("/api/catalog", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.products)) setProducts(data.products);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 2000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <p className="shrink-0 px-3 py-1.5 text-center text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase md:text-[11px]">
        Aralık, 100 kişi alırsa oluşacak fiyat ile 70 kişi alırsa oluşacak fiyat
        arasındadır. Talep arttıkça birim fiyat düşer.
      </p>
      <section className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2 pt-0 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  );
}
