"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type User = { id: string; email: string } | null;

type Ctx = {
  user: User;
  ready: boolean;
  refreshUser: () => Promise<void>;
  toast: (msg: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("Providers missing");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : { user: null };
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, msg }]);
    window.setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const value = useMemo(
    () => ({ user, ready, refreshUser, toast }),
    [user, ready, refreshUser, toast],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#f3eee4] px-4 py-3 text-center text-[13px] leading-snug text-[#0b0a08]"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
