"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./Providers";

const links = [
  { href: "/", label: "Anasayfa" },
  { href: "/sepet", label: "Sepet" },
  { href: "/beden-tablosu", label: "Beden Tablosu" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, refreshUser } = useApp();
  const [count, setCount] = useState(0);
  const home = pathname === "/";

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const n = (data.items ?? []).reduce(
        (s: number, i: { qty: number }) => s + i.qty,
        0,
      );
      if (alive) setCount(n);
    };
    void load();
    const id = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [user, pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshUser();
    router.push("/");
  }

  return (
    <header
      className={`relative z-40 shrink-0 border-b border-[var(--line)] ${
        home ? "bg-[var(--bg)]" : "bg-[var(--bg)]/95 backdrop-blur"
      }`}
    >
      <div className="flex h-12 items-center justify-between px-3 md:h-14 md:px-5">
        <Link href="/" className="serif text-[22px] leading-none tracking-[0.28em]">
          LAWINA
        </Link>
        <nav className="flex items-center gap-4 text-[11px] tracking-[0.18em] uppercase md:gap-6 md:text-[12px]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }
            >
              {l.label}
              {l.href === "/sepet" && count > 0 ? (
                <span className="ml-1 text-[var(--copper-soft)]">({count})</span>
              ) : null}
            </Link>
          ))}
          {ready && user ? (
            <button
              onClick={() => void logout()}
              className="text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Çıkış
            </button>
          ) : (
            <Link
              href="/giris"
              className={
                pathname === "/giris" || pathname === "/kayit"
                  ? "text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }
            >
              Giriş
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
