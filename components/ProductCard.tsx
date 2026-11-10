"use client";

import { formatTL } from "@/lib/pricing";
import type { CatalogProduct } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "./Providers";
import { AnimatedNumber } from "./AnimatedNumber";

export function ProductCard({
  product,
  deadlineLabel,
  onChanged,
}: {
  product: CatalogProduct;
  deadlineLabel: string;
  onChanged: () => void;
}) {
  const { user, toast } = useApp();
  const router = useRouter();
  const [size, setSize] = useState(
    product.sizes.includes("M") ? "M" : (product.sizes[0] ?? ""),
  );
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const progress = useMemo(() => {
    if (product.status === "pending") {
      return Math.min(100, (product.demand / 70) * 100);
    }
    return Math.min(100, (product.demand / 100) * 100);
  }, [product]);

  const cta = useMemo(() => {
    if (product.status === "failed") return "Üretilmeyecek";
    if (product.status === "frozen") return "Kampanya kilitlendi";
    if (product.status === "locked") return "Yedek listeye yazıl";
    if (product.status === "active") return "Sipariş ver";
    return "Ben de istiyorum";
  }, [product.status]);

  async function submit(commit: boolean) {
    if (!user) {
      router.push("/giris?next=/");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          size,
          qty,
          commit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Eklenemedi.");
        return;
      }
      const overflow = (data.created ?? []).some(
        (l: { status: string }) => l.status === "overflow",
      );
      if (overflow) {
        toast("Ana 100 doldu. Yedek listeye alındın — ücretsiz sıradasın.");
      } else if (commit) {
        toast(
          `Kilitlendi. Ödeyeceğin tutar en fazla ${formatTL(product.currentPrice ?? product.priceAt70)}.`,
        );
      } else {
        toast("Talebin alındı. 70 kişiye ulaşınca sepetten kesinleştir.");
      }
      onChanged();
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  function onCta() {
    if (product.status === "failed" || product.status === "frozen") return;
    if (!user) {
      router.push("/giris?next=/");
      return;
    }
    if (product.status === "active" || product.status === "locked") {
      setConfirmOpen(true);
      return;
    }
    void submit(false);
  }

  return (
    <>
      <article className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1.45fr)_auto] overflow-hidden border border-[var(--line)] bg-[var(--card)]">
        <div className="relative min-h-0 overflow-hidden bg-[var(--card)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 z-[1] h-full w-full object-contain object-center"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_42%,transparent_42%,rgba(11,10,8,0.55)_100%)]" />
          <div className="absolute right-2 top-2 z-[3]">
            <StatusChip product={product} />
          </div>
        </div>

        <div className="min-w-0 px-2 pb-2 pt-1.5">
          <h2 className="serif text-[18px] leading-none md:text-[22px]">
            {product.name}
          </h2>

          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="whitespace-nowrap">
              {product.status === "pending" ? (
                <>
                  <span className="serif text-[22px] leading-none md:text-[26px]">
                    <AnimatedNumber value={product.demand} />
                  </span>
                  <span className="text-[var(--muted)]"> / 70</span>
                </>
              ) : (
                <>
                  <span className="serif text-[22px] leading-none md:text-[26px]">
                    <AnimatedNumber value={product.demand} />
                  </span>
                  <span className="text-[var(--muted)]"> / 100</span>
                  {product.overflow > 0 ? (
                    <span className="ml-1 text-[10px] text-[var(--copper-soft)]">
                      +{product.overflow}
                    </span>
                  ) : null}
                </>
              )}
            </p>
            {product.currentPrice != null ? (
              <p className="serif text-[20px] leading-none text-[var(--copper-soft)] md:text-[24px]">
                <AnimatedNumber value={product.currentPrice} /> TL
              </p>
            ) : (
              <p className="text-right text-[10px] text-[var(--muted)]">
                Üretime girmedi
              </p>
            )}
          </div>

          <div className="mt-2 h-1 overflow-hidden bg-white/10">
            <div
              className="bar-fill h-full bg-[var(--copper)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <PriceStory product={product} />

          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`px-1.5 py-0.5 text-[10px] ${
                  size === s
                    ? "bg-[#f3eee4] text-[#0b0a08]"
                    : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {s}
              </button>
            ))}
            <div className="ml-auto flex items-center border border-[var(--line)] text-[11px]">
              <button
                type="button"
                className="px-1.5 py-0.5 text-[var(--muted)]"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-4 text-center">{qty}</span>
              <button
                type="button"
                className="px-1.5 py-0.5 text-[var(--muted)]"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={
              busy || product.status === "failed" || product.status === "frozen"
            }
            onClick={onCta}
            className="mt-1.5 w-full bg-[#f3eee4] py-1.5 text-[10px] tracking-[0.16em] text-[#0b0a08] uppercase disabled:opacity-40"
          >
            {busy ? "İşleniyor…" : cta}
          </button>
        </div>
      </article>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
          <div className="w-[min(92vw,440px)] border border-[var(--line)] bg-[var(--card-2)] p-5">
            <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">
              Fiyat tavanı
            </p>
            <h3 className="serif mt-2 text-3xl">{product.name}</h3>
            <p className="mt-3 text-[14px] leading-relaxed">
              {product.status === "locked" ? (
                <>
                  100/100 — minimum fiyat açıldı:{" "}
                  <b>{formatTL(product.priceAt100)}</b>. Ana sipariş dolduğu için
                  yedek listeye yazılacaksın. Birisi ödeme yapmazsa sıran gelir.
                </>
              ) : (
                <>
                  Ödeyeceğin nihai tutar en fazla{" "}
                  <b>{formatTL(product.currentPrice ?? product.priceAt70)}</b>{" "}
                  olacaktır. Daha fazla sipariş geldikçe fiyat düşebilir. Artamaz.
                </>
              )}
            </p>
            <p className="mt-2 text-[12px] text-[var(--muted)]">
              {qty} adet · {size} · Deadline {deadlineLabel}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 border border-[var(--line)] py-2.5 text-[12px] tracking-[0.16em] uppercase"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit(true)}
                className="flex-1 bg-[#f3eee4] py-2.5 text-[12px] tracking-[0.16em] text-[#0b0a08] uppercase"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StatusChip({ product }: { product: CatalogProduct }) {
  if (product.status === "pending") {
    return (
      <span className="bg-black/45 px-2 py-1 text-[10px] tracking-[0.14em] text-white/70 uppercase backdrop-blur-sm">
        Talep
      </span>
    );
  }
  if (product.status === "locked") {
    return (
      <span className="bg-black/45 px-2 py-1 text-[10px] tracking-[0.14em] text-[var(--copper-soft)] uppercase backdrop-blur-sm">
        Min. fiyat
      </span>
    );
  }
  if (product.status === "failed") {
    return (
      <span className="bg-black/45 px-2 py-1 text-[10px] tracking-[0.14em] text-[var(--danger)] uppercase backdrop-blur-sm">
        Üretilmedi
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 bg-black/45 px-2 py-1 text-[10px] tracking-[0.14em] text-[var(--good)] uppercase backdrop-blur-sm">
      <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--good)]" />
      Aktif
    </span>
  );
}

function PriceStory({ product }: { product: CatalogProduct }) {
  if (product.status === "pending") {
    return (
      <p className="mt-1 text-[10px] leading-snug text-[var(--muted)]">
        {product.neededForActivation} kişi kaldı · 70&apos;te{" "}
        {formatTL(product.priceAt70)} · 100&apos;de {formatTL(product.priceAt100)}
      </p>
    );
  }

  if (product.status === "locked") {
    return (
      <p className="mt-1.5 text-[11px] text-[var(--copper-soft)]">
        100/100 — Minimum {formatTL(product.priceAt100)}. Yeni talepler yedek
        listeye. 48 sa. ödeme.
      </p>
    );
  }

  if (product.status === "failed") {
    return (
      <p className="mt-1.5 text-[11px] text-[var(--muted)]">
        70 kişiye ulaşmayan ürün üretilmez; kimse ödeme yapmaz.
      </p>
    );
  }

  return (
      <p className="mt-1 text-[10px] text-[var(--muted)]">
        <span className="line-through">{formatTL(product.priceAt70)}</span>
        <span className="mx-1">→</span>
        <span className="text-[var(--ink)]">{formatTL(product.priceAt100)}</span>
        {product.neededForMin > 0 ? ` · ${product.neededForMin} kaldı` : null}
      </p>
  );
}
