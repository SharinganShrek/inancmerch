"use client";

import { FormEvent, useEffect, useState } from "react";
import { nameLabel, ROLES, type RoleId } from "@/lib/roles";
import { useApp } from "./Providers";

export function ProfileGate() {
  const { user, ready, toast } = useApp();
  const [needed, setNeeded] = useState(false);
  const [role, setRole] = useState<RoleId | null>(null);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setNeeded(false);
      return;
    }
    let alive = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (alive) setNeeded(!data.profile);
      })
      .catch(() => {
        if (alive) setNeeded(false);
      });
    return () => {
      alive = false;
    };
  }, [ready, user]);

  if (!needed) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!role || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, fullName }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast(data.error ?? "Kayıt tamamlanamadı.");
        return;
      }
      setNeeded(false);
    } catch {
      toast("Bağlantı hatası. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={save} className="w-[min(92vw,440px)] border border-[var(--line)] bg-[var(--card)] p-5">
        <p className="text-[11px] tracking-[0.2em] text-[var(--copper-soft)] uppercase">TEV İnanç</p>
        <h2 className="serif mt-2 text-4xl">Kim olduğunu seç</h2>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {ROLES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id)}
              className={`px-3 py-4 text-[13px] tracking-[0.12em] uppercase ${
                role === item.id
                  ? "bg-[var(--btn)] text-[var(--btn-ink)]"
                  : "border border-[var(--line)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {role ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
              {nameLabel(role)}
            </span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:border-[var(--copper)]"
            />
          </label>
        ) : null}
        <button disabled={!role || busy} className="btn mt-4 w-full py-3 text-[12px] tracking-[0.16em]">
          {busy ? "…" : "Kaydet"}
        </button>
      </form>
    </div>
  );
}
