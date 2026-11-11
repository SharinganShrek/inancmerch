"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DELIVERIES, type DeliveryId } from "@/lib/delivery";
import { clearNewDemand, startNewDemand } from "@/lib/new-demand";
import { formatTL } from "@/lib/pricing";
import type { CatalogProduct } from "@/lib/types";
import { useApp } from "./Providers";

export function CartClient() {
  const { cart, setCartQty, removeFromCart, clearCart, toast, user } = useApp();
  const router = useRouter();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch("/api/catalog", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (alive && Array.isArray(data.products)) setProducts(data.products);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const lines = cart.map((item) => ({
    ...item,
    product: products.find((product) => product.id === item.productId),
  }));

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    let alive = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (alive) setRole(typeof data.profile?.role === "string" ? data.profile.role : null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user]);

  async function beginSubmit() {
    if (!cart.length || busy) return;
    if (!user) {
      router.push("/giris?next=/sepet");
      return;
    }
    let current = role;
    if (!current) {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        profile?: { role?: string };
      };
      current = typeof data.profile?.role === "string" ? data.profile.role : null;
      setRole(current);
    }
    if (current === "mezun") {
      setDeliveryOpen(true);
      return;
    }
    void submit(null);
  }

  async function submit(choice: DeliveryId | null) {
    if (!cart.length || busy) return;
    if (!user) {
      router.push("/giris?next=/sepet");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            size: item.size,
            qty: item.qty,
          })),
          delivery: choice,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast(data.error ?? "Talep gönderilemedi.");
        return;
      }
      clearCart();
      clearNewDemand();
      setDeliveryOpen(false);
      toast("Talebin kayda geçti.");
      router.push("/talepler");
      router.refresh();
    } catch {
      toast("Bağlantı hatası. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-[min(96vw,760px)] px-4 py-10">
      <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">
        Sepet
      </p>
      <h1 className="serif mt-1 text-5xl">Sipariş özeti</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
        Gönderince talep kayda geçer ve ürün sayaçları güncellenir. Ödeme bu
        adımda alınmaz.
      </p>

      {lines.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-[var(--muted)]">Sepetin boş.</p>
          <button
            type="button"
            onClick={() => {
              startNewDemand();
              router.push("/");
            }}
            className="btn mt-5 px-5 py-3 text-[12px] tracking-[0.16em] uppercase"
          >
            Ürünlere dön
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {lines.map((line) => (
              <li key={`${line.productId}-${line.size}`} className="flex gap-4 py-4">
                <div className="h-24 w-20 shrink-0">
                  {line.product ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.product.image}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="serif text-2xl leading-none">
                        {line.product?.name ?? "Ürün"}
                      </h2>
                      <p className="mt-1 text-[12px] tracking-[0.14em] text-[var(--muted)] uppercase">
                        {line.size}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(line.productId, line.size)}
                      className="text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase"
                    >
                      Çıkar
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center border border-[var(--line)] text-sm">
                      <button
                        type="button"
                        className="px-2 py-1 text-[var(--muted)]"
                        onClick={() =>
                          setCartQty(line.productId, line.size, line.qty - 1)
                        }
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{line.qty}</span>
                      <button
                        type="button"
                        className="px-2 py-1 text-[var(--muted)]"
                        onClick={() =>
                          setCartQty(line.productId, line.size, line.qty + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <p className="text-right text-[13px] text-[var(--copper-soft)]">
                      {line.product
                        ? `Tahmini ${formatTL(line.product.priceAt100)} – ${formatTL(line.product.priceAt70)}`
                        : "Tahmini fiyat"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => void beginSubmit()}
            className="btn mt-6 w-full py-3 text-[12px] tracking-[0.2em]"
          >
            {busy ? "Gönderiliyor…" : "TALEP GÖNDER"}
          </button>
          {deliveryOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
              onClick={() => {
                if (!busy) setDeliveryOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delivery-title"
                className="w-full max-w-md border border-[var(--line)] bg-[var(--card)] p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="delivery-title" className="serif text-3xl">
                  Teslim
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Talebi göndermeden önce ürünleri nasıl alacağını seç.
                </p>
                <div className="mt-4 space-y-2">
                  {DELIVERIES.map((option) => {
                    const selected = delivery === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDelivery(option.id)}
                        className={`w-full border px-3 py-3 text-left text-[13px] leading-snug ${
                          selected
                            ? "border-[var(--copper)] bg-[var(--card-2)] text-[var(--ink)]"
                            : "border-[var(--line)] text-[var(--muted)]"
                        }`}
                      >
                        {option.label}
                        {"note" in option ? (
                          <span className="mt-1 block text-[12px]">({option.note})</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={!delivery || busy}
                  onClick={() => void submit(delivery)}
                  className="btn mt-5 w-full py-3 text-[12px] tracking-[0.2em] disabled:opacity-40"
                >
                  {busy ? "Gönderiliyor…" : "TALEP GÖNDER"}
                </button>
              </div>
            </div>
          ) : null}
          {!user ? (
            <p className="mt-3 text-center text-[12px] text-[var(--muted)]">
              Göndermek için{" "}
              <Link href="/giris?next=/sepet" className="underline">
                giriş yap
              </Link>
              .
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
