"use client";

import type { CatalogProduct } from "@/lib/types";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { useApp } from "./Providers";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { addToCart } = useApp();
  const [size, setSize] = useState(
    product.sizes.includes("M") ? "M" : (product.sizes[0] ?? ""),
  );
  const [qty, setQty] = useState(1);
  const closed = product.status !== "open";
  const progress = useMemo(
    () => Math.min(100, (product.demand / Math.max(1, product.stock)) * 100),
    [product.demand, product.stock],
  );

  function add() {
    if (closed || !size) return;
    addToCart({ productId: product.id, size, qty });
  }

  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden border border-[var(--line)] bg-[var(--card)]">
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--well)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 z-[1] h-full w-full object-contain object-center"
        />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_42%,transparent_42%,rgba(11,10,8,0.55)_100%)]" />
        {closed ? (
          <div className="absolute right-2 top-2 z-[3]">
            <span className="bg-black/55 px-2 py-1 text-[10px] tracking-[0.14em] text-white uppercase">
              {product.status === "soldout" ? "Tükendi" : "Kapandı"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 px-2 pb-2 pt-1.5">
        <h2 className="serif truncate text-[18px] leading-none md:text-[22px]">{product.name}</h2>
        <p className="mt-1 text-[10px] text-[var(--muted)]">{product.short}</p>

        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="whitespace-nowrap">
            <span className="serif text-[22px] leading-none md:text-[26px]">
              <AnimatedNumber value={product.demand} />
            </span>
            <span className="text-[var(--muted)]"> / {product.stock}</span>
          </p>
          <p className="text-right leading-none text-[var(--copper-soft)]">
            <span className="serif text-[16px] md:text-[18px]">
              <AnimatedNumber value={product.priceAt100} />
              <span className="mx-0.5">–</span>
              <AnimatedNumber value={product.priceAt70} />
            </span>
            <span className="ml-1 text-[10px]">TL</span>
          </p>
        </div>
        <p className="mt-0.5 text-right text-[10px] text-[var(--muted)]">
          100 kişide – 70 kişide
        </p>

        <div className="mt-1.5 h-1 overflow-hidden bg-[var(--line)]">
          <div className="bar-fill h-full bg-[var(--copper)]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
          {product.sizes.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSize(option)}
              className={`px-1.5 py-0.5 text-[10px] ${
                size === option
                  ? "bg-[var(--btn)] text-[var(--btn-ink)]"
                  : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {option}
            </button>
          ))}
          <div className="ml-auto flex items-center border border-[var(--line)] text-[11px]">
            <button
              type="button"
              className="px-1.5 py-0.5 text-[var(--muted)]"
              onClick={() => setQty((current) => Math.max(1, current - 1))}
            >
              −
            </button>
            <span className="w-4 text-center">{qty}</span>
            <button
              type="button"
              className="px-1.5 py-0.5 text-[var(--muted)]"
              onClick={() => setQty((current) => Math.min(10, current + 1))}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={closed}
          onClick={add}
          className="btn mt-1.5 w-full py-1.5 text-[11px]"
        >
          {product.status === "soldout"
            ? "Tükendi"
            : product.status === "closed"
              ? "Talep kapandı"
              : "Sepete ekle"}
        </button>
      </div>
    </article>
  );
}
