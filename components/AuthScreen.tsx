"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { nameLabel, ROLES, type RoleId } from "@/lib/roles";
import { safeNext } from "@/lib/safe-next";

function AuthInner({ mode }: { mode: "giris" | "kayit" }) {
  const { refreshUser, toast } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const confirmError = params.get("hata");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleId | null>(null);
  const [step, setStep] = useState<"role" | "form">(mode === "kayit" ? "role" : "form");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (confirmError === "dogrulama") {
      toast("Doğrulama bağlantısı geçersiz. Tekrar dene.");
    }
  }, [confirmError, toast]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(
        mode === "giris" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            role,
            fullName: fullName.trim(),
          }),
        },
      );
      const text = await res.text();
      let data: { error?: string; confirmEmail?: boolean } = {};
      try {
        data = text ? (JSON.parse(text) as { error?: string; confirmEmail?: boolean }) : {};
      } catch {
        data = { error: "Sunucu yanıtı okunamadı." };
      }
      if (!res.ok) {
        toast(data.error ?? "İşlem başarısız.");
        return;
      }
      if (data.confirmEmail) {
        toast("Hesap açıldı. Giriş için e-postandaki bağlantıya tıkla.");
        return;
      }
      await refreshUser();
      router.push(next);
      router.refresh();
    } catch {
      toast("Bağlantı hatası. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-56px)] w-[min(92vw,440px)] flex-col justify-center py-10">
      <p className="text-[11px] tracking-[0.22em] text-[var(--copper-soft)] uppercase">
        TEV İnanç
      </p>
      <h1 className="serif mt-2 text-5xl">{mode === "giris" ? "Giriş" : "Kayıt"}</h1>

      {mode === "kayit" && step === "role" ? (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">Önce kim olduğunu seç.</p>
          <div className="mt-8 grid grid-cols-2 gap-2">
            {ROLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRole(item.id);
                  setStep("form");
                }}
                className="border border-[var(--line)] px-3 py-5 text-[13px] tracking-[0.14em] uppercase hover:border-[var(--copper)]"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {mode === "giris"
              ? "E-posta ve şifrenle devam et."
              : `${ROLES.find((item) => item.id === role)?.label ?? ""} olarak kayıt oluyorsun.`}
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            {mode === "kayit" ? (
              <label className="block">
                <span className="mb-1 block text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                  {nameLabel(role ?? "ogrenci")}
                </span>
                <input
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--copper)]"
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                E-posta
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--copper)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                Şifre
              </span>
              <input
                type="password"
                autoComplete={mode === "giris" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--copper)]"
              />
            </label>
            <button disabled={busy} className="btn w-full py-3 text-[12px] tracking-[0.22em] uppercase">
              {busy ? "…" : mode === "giris" ? "Giriş yap" : "Hesap oluştur"}
            </button>
          </form>
          {mode === "kayit" ? (
            <button
              type="button"
              onClick={() => setStep("role")}
              className="mt-4 text-left text-sm text-[var(--muted)] underline"
            >
              Seçimi değiştir
            </button>
          ) : null}
        </>
      )}

      <p className="mt-5 text-sm text-[var(--muted)]">
        {mode === "giris" ? (
          <>
            Hesabın yok mu?{" "}
            <Link href={`/kayit?next=${encodeURIComponent(next)}`} className="text-[var(--ink)] underline">
              Kayıt ol
            </Link>
          </>
        ) : (
          <>
            Zaten hesabın var mı?{" "}
            <Link href={`/giris?next=${encodeURIComponent(next)}`} className="text-[var(--ink)] underline">
              Giriş yap
            </Link>
          </>
        )}
      </p>
    </main>
  );
}

export function AuthScreen({ mode }: { mode: "giris" | "kayit" }) {
  return (
    <Suspense>
      <AuthInner mode={mode} />
    </Suspense>
  );
}
