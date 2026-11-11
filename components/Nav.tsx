"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./Providers";
import { clearNewDemand } from "@/lib/new-demand";

const links = [
  { href: "/", label: "Anasayfa" },
  { href: "/sepet", label: "Sepet" },
  { href: "/beden-tablosu", label: "Beden Tablosu" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, refreshUser, cartCount, cartNotice, theme, toggleTheme } = useApp();

  async function logout() {
    clearNewDemand();
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshUser();
    router.push("/");
  }

  return (
    <header className="relative z-40 shrink-0 border-b border-[var(--line)] bg-[var(--bg)]">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 md:min-h-14 md:px-5">
        <Link
          href="/"
          onClick={() => clearNewDemand()}
          className="serif text-[18px] leading-none tracking-[0.04em] md:text-[22px]"
        >
          TEV İnanç Merch
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-[0.18em] uppercase md:gap-x-6 md:text-[12px]">
          {links.map((link) =>
            link.href === "/sepet" ? (
              <span key={link.href} className="inline-flex items-center gap-2">
                <Link
                  href={link.href}
                  className={
                    pathname === link.href
                      ? "text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }
                >
                  {link.label}
                  {cartCount > 0 ? (
                    <span className="ml-1 text-[var(--copper-soft)]">({cartCount})</span>
                  ) : null}
                </Link>
                {cartNotice ? (
                  <span
                    role="status"
                    className="text-[10px] tracking-normal text-[var(--good)] normal-case"
                  >
                    {cartNotice}
                  </span>
                ) : null}
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={link.href === "/" ? () => clearNewDemand() : undefined}
                className={
                  pathname === link.href
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }
              >
                {link.label}
              </Link>
            ),
          )}
          {ready && user ? (
            <Link
              href="/talepler"
              className={
                pathname === "/talepler"
                  ? "text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }
            >
              Talepler
            </Link>
          ) : null}
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
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Karanlık tema" : "Açık tema"}
            className="text-[var(--muted)] hover:text-[var(--ink)]"
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </nav>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9.2 1.8A5.6 5.6 0 1 0 14.2 9 4.4 4.4 0 0 1 9.2 1.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
