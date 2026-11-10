"use client";

import { formatRemaining, formatTL, payableForLine } from "@/lib/pricing";
import type { CatalogProduct, Line } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/components/Providers";

type CartLine = Line & { product?: CatalogProduct };

export function CartClient() {
  const { user, ready, toast } = useApp();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const res = await fetch("/api/cart", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  async function remove(id: string) {
    const res = await fetch(`/api/cart?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Silinemedi.");
      return;
    }
    toast("Talebin geri çekildi. Stok yeniden açıldı.");
    void load();
  }

  async function commit(ids?: string[]) {
    const res = await fetch("/api/cart/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Kesinleştirilemedi.");
      return;
    }
    toast("Siparişin kilitlendi. Fiyatın artık artamaz, yalnızca düşebilir.");
    void load();
  }

  async function pay(id: string) {
    const res = await fetch("/api/cart/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Ödeme alınamadı.");
      return;
    }
    toast(`Ödeme alındı: ${formatTL(data.amount)}. Üretim, herkes ödeyince başlar.`);
    void load();
  }

  if (!ready || loading) {
    return (
      <main className="px-5 py-16 text-center text-[var(--muted)]">Yükleniyor…</main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-[min(92vw,560px)] py-16 text-center">
        <h1 className="serif text-5xl">Sepet</h1>
        <p className="mt-4 text-[var(--muted)]">
          Sepeti görmek için e-posta ve şifrenle gir.
        </p>
        <Link
          href="/giris?next=/sepet"
          className="mt-6 inline-block bg-[#f3eee4] px-6 py-3 text-[12px] tracking-[0.2em] text-[#0b0a08] uppercase"
        >
          Giriş yap
        </Link>
      </main>
    );
  }

  const waitlist = items.filter((i) => i.status === "waitlist");
  const committed = items.filter((i) => i.status === "committed");
  const overflow = items.filter((i) => i.status === "overflow");
  const forfeited = items.filter((i) => i.status === "forfeited");
  const payable = committed
    .filter((i) => !i.paidAt)
    .reduce((s, i) => {
      const unit = payableForLine(i.maxPrice, i.product?.currentPrice ?? i.maxPrice);
      return s + (unit ?? 0) * i.qty;
    }, 0);
  const paidSum = committed
    .filter((i) => i.paidAt)
    .reduce((s, i) => {
      const unit = payableForLine(i.maxPrice, i.product?.currentPrice ?? i.maxPrice);
      return s + (unit ?? 0) * i.qty;
    }, 0);

  return (
    <main className="mx-auto w-[min(96vw,920px)] px-4 py-8">
      <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">
        Kalabalık aldıkça ucuzlar
      </p>
      <h1 className="serif mt-1 text-5xl">Sepet</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Kesinleşen siparişler silinemez — fiyatın sonradan artmasın diye. 70 kişiye
        ulaşmayan ürün üretilmez. Kampanya 100&apos;e veya 8 Ekim&apos;e kilitlenince
        48 saat ödeme penceresi açılır; ödemeyenlerin yeri yedek listeye geçer.
      </p>

      {items.length === 0 ? (
        <div className="mt-12 border border-[var(--line)] p-10 text-center">
          <p className="text-[var(--muted)]">Sepetin boş.</p>
          <Link href="/" className="mt-4 inline-block underline">
            Dört ürüne bak
          </Link>
        </div>
      ) : null}

      {committed.length > 0 ? (
        <Section title="Kesinleşen siparişler" hint="Silinemez. Tavan fiyat kilitli. Kapora yok; tutar güncel fiyattan çekilir.">
          {committed.map((i) => (
            <LineRow key={i.id} line={i} onPay={() => void pay(i.id)} />
          ))}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--line)] pt-4">
            <p className="text-sm text-[var(--muted)]">
              {paidSum > 0 ? `Ödenen ${formatTL(paidSum)} · ` : null}
              Kalan üst sınır
            </p>
            <p className="serif text-3xl">{formatTL(payable)}</p>
          </div>
        </Section>
      ) : null}

      {waitlist.length > 0 ? (
        <Section
          title="Talep / waitlist"
          hint="70 eşiği henüz yoksa geri çekebilirsin. Eşiğe ulaşanlar kesinleştirilir."
        >
          {waitlist.map((i) => (
            <LineRow
              key={i.id}
              line={i}
              onRemove={() => void remove(i.id)}
              onCommit={
                i.product && i.product.status !== "pending"
                  ? () => void commit([i.id])
                  : undefined
              }
            />
          ))}
        </Section>
      ) : null}

      {overflow.length > 0 ? (
        <Section
          title="Yedek liste"
          hint="Ana 100 kişi doldu. Ödeme yapmayan olursa sıran gelir — kapora yok."
        >
          {overflow.map((i) => (
            <LineRow key={i.id} line={i} onRemove={() => void remove(i.id)} />
          ))}
        </Section>
      ) : null}

      {forfeited.length > 0 ? (
        <Section
          title="Ödenmedi, yer kaybedildi"
          hint="48 saat içinde ödenmeyen sipariş yedek listeye geçti."
        >
          {forfeited.map((i) => (
            <LineRow key={i.id} line={i} />
          ))}
        </Section>
      ) : null}
    </main>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="serif text-2xl">{title}</h2>
      <p className="mt-1 text-[12px] text-[var(--muted)]">{hint}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function LineRow({
  line,
  onRemove,
  onCommit,
  onPay,
}: {
  line: CartLine;
  onRemove?: () => void;
  onCommit?: () => void;
  onPay?: () => void;
}) {
  const p = line.product;
  const unit = payableForLine(line.maxPrice, p?.currentPrice ?? line.maxPrice);
  const canPay =
    Boolean(onPay) &&
    line.status === "committed" &&
    !line.paidAt &&
    unit != null;
  return (
    <div className="grid grid-cols-[72px_1fr_auto] gap-3 border border-[var(--line)] bg-[var(--card)] p-3 md:grid-cols-[88px_1fr_auto]">
      <div className="overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p?.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div>
        <p className="serif text-xl leading-none">{p?.name ?? "Ürün"}</p>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          {line.size} · {line.qty} adet
        </p>
        {line.status === "committed" && unit != null ? (
          <p className="mt-2 text-[13px]">
            Tavanın: {formatTL(line.maxPrice ?? unit)}{" "}
            {p?.currentPrice != null &&
            line.maxPrice != null &&
            p.currentPrice < line.maxPrice ? (
              <span className="text-[var(--good)]">
                · şu an {formatTL(p.currentPrice)}
              </span>
            ) : null}
          </p>
        ) : p?.status === "pending" ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            {p.demand}/70 · üretime girerse maks {formatTL(p.priceAt70)}
          </p>
        ) : p?.currentPrice != null ? (
          <p className="mt-2 text-[13px]">Güncel {formatTL(p.currentPrice)}</p>
        ) : null}
        {line.paidAt ? (
          <p className="mt-1 text-[12px] text-[var(--good)]">Ödendi</p>
        ) : line.payBy && line.status === "committed" ? (
          <p className="mt-1 text-[12px] text-[var(--copper-soft)]">
            Ödeme penceresi: {formatRemaining(line.payBy)}
          </p>
        ) : line.status === "committed" && p && !p.paymentOpen ? (
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            Zorunlu ödeme, fiyat kilitlenince 48 saat açılır. Şimdi de
            ödeyebilirsin — çekilecek tutar yalnızca düşer.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        {canPay ? (
          <button
            onClick={onPay}
            className="bg-[#f3eee4] px-3 py-1.5 text-[10px] tracking-[0.14em] text-[#0b0a08] uppercase"
          >
            {formatTL(unit! * line.qty)} öde
          </button>
        ) : null}
        {onCommit ? (
          <button
            onClick={onCommit}
            className="bg-[#f3eee4] px-3 py-1.5 text-[10px] tracking-[0.14em] text-[#0b0a08] uppercase"
          >
            Kesinleştir
          </button>
        ) : null}
        {onRemove ? (
          <button
            onClick={onRemove}
            className="text-[11px] text-[var(--muted)] underline"
          >
            Çıkar
          </button>
        ) : line.status === "committed" && !canPay ? (
          <span className="text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase">
            {line.paidAt ? "Ödendi" : "Kilitli"}
          </span>
        ) : line.status === "forfeited" ? (
          <span className="text-[10px] tracking-[0.12em] text-[var(--danger)] uppercase">
            Kaçırıldı
          </span>
        ) : null}
      </div>
    </div>
  );
}
