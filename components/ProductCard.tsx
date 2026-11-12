"use client";

import type { CatalogProduct } from "@/lib/types";
import { spotPrice } from "@/lib/pricing";
import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { useApp } from "./Providers";

const GROUP = 100;

function RangePrices({
  priceAt100,
  priceAt70,
}: {
  priceAt100: number;
  priceAt70: number;
}) {
  return (
    <div className="flex w-fit items-start gap-1.5 text-center leading-none">
      <div>
        <p className="serif text-[13px] text-[var(--ink)] md:text-[15px]">
          <AnimatedNumber value={priceAt100} />
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[10px] leading-tight text-[var(--muted)]">100 kişide</p>
      </div>
      <span className="pt-0.5 text-[10px] text-[var(--muted)]">–</span>
      <div>
        <p className="serif text-[13px] text-[var(--ink)] md:text-[15px]">
          <AnimatedNumber value={priceAt70} />
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[10px] leading-tight text-[var(--muted)]">70 kişide</p>
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { addToCart } = useApp();
  const [size, setSize] = useState(
    product.sizes.includes("M") ? "M" : (product.sizes[0] ?? ""),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(0);
  const closed = product.status !== "open";
  const queued = product.demand >= GROUP;
  const current = spotPrice(product);
  const progress = useMemo(
    () => Math.min(100, (Math.min(product.demand, GROUP) / GROUP) * 100),
    [product.demand],
  );

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(0), 2200);
    return () => window.clearTimeout(id);
  }, [added]);

  function add() {
    if (closed || !size) return;
    addToCart({ productId: product.id, size, qty });
    setAdded((current) => current + 1);
  }

  return (
    <article className="flex flex-col overflow-hidden border border-[var(--line)] bg-[var(--card)] md:h-full md:min-h-0">
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden md:aspect-auto md:min-h-0 md:flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 z-[1] h-full w-full object-contain object-center"
        />
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

        <div className="mt-1 flex items-start justify-between gap-2">
          <div>
            <p className="whitespace-nowrap">
              <span className="serif text-[22px] leading-none md:text-[26px]">
                <AnimatedNumber value={Math.min(product.demand, GROUP)} />
              </span>
              <span className="text-[var(--muted)]"> / {GROUP}</span>
            </p>
            {queued ? (
              <p className="mt-0.5 text-[11px] text-[var(--copper-soft)]">
                sıra: <AnimatedNumber value={product.batch2} />/{GROUP}
              </p>
            ) : null}
          </div>
          {current != null ? (
            <p className="shrink-0 text-right leading-none text-[var(--copper-soft)]">
              <span className="text-[10px]">Şu an </span>
              <span className="serif text-[16px] md:text-[18px]">
                <AnimatedNumber value={current} />
              </span>
              <span className="ml-1 text-[10px]">TL</span>
            </p>
          ) : null}
        </div>
        <div className="mt-1 flex justify-end">
          <RangePrices priceAt100={product.priceAt100} priceAt70={product.priceAt70} />
        </div>

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
          className={`btn mt-1.5 w-full py-1.5 text-[11px] ${added ? "btn-added" : ""}`}
        >
          {product.status === "soldout"
            ? "Tükendi"
            : product.status === "closed"
              ? "Talep kapandı"
              : added
                ? queued
                  ? "Sıraya girildi"
                  : "Sepete eklendi"
                : queued
                  ? "Sıraya gir"
                  : "Sepete ekle"}
        </button>
      </div>
    </article>
  );
}
