"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type User = { id: string; email: string } | null;
export type CartItem = { productId: string; size: string; qty: number };
type Theme = "dark" | "light";

type Ctx = {
  user: User;
  ready: boolean;
  refreshUser: () => Promise<void>;
  toast: (msg: string) => void;
  cart: CartItem[];
  cartCount: number;
  cartNotice: string | null;
  addToCart: (item: CartItem) => void;
  setCartQty: (productId: string, size: string, qty: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  theme: Theme;
  toggleTheme: () => void;
};

const CART_KEY = "lawina-cart";
const THEME_KEY = "lawina-theme";
const AppCtx = createContext<Ctx | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<CartItem>;
      if (typeof row.productId !== "string" || typeof row.size !== "string") return [];
      const qty = Math.floor(Number(row.qty));
      if (!Number.isFinite(qty) || qty < 1) return [];
      return [{ productId: row.productId, size: row.size, qty: Math.min(10, qty) }];
    });
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("Providers missing");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const noticeTimer = useRef<number | null>(null);

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
    setCart(loadCart());
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, [refreshUser]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, msg }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3400);
  }, []);

  const flashAdded = useCallback(() => {
    setCartNotice("Sepete eklendi.");
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setCartNotice(null), 4000);
  }, []);

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const next = prev.map((row) => ({ ...row }));
        const index = next.findIndex(
          (row) => row.productId === item.productId && row.size === item.size,
        );
        const qty = Math.min(10, Math.max(1, Math.floor(item.qty)));
        if (index >= 0) next[index].qty = Math.min(10, next[index].qty + qty);
        else next.push({ productId: item.productId, size: item.size, qty });
        saveCart(next);
        return next;
      });
      flashAdded();
    },
    [flashAdded],
  );

  const setCartQty = useCallback((productId: string, size: string, qty: number) => {
    setCart((prev) => {
      const next =
        qty < 1
          ? prev.filter((row) => !(row.productId === productId && row.size === size))
          : prev.map((row) =>
              row.productId === productId && row.size === size
                ? { ...row, qty: Math.min(10, qty) }
                : row,
            );
      saveCart(next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: string, size: string) => {
    setCart((prev) => {
      const next = prev.filter(
        (row) => !(row.productId === productId && row.size === size),
      );
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    saveCart([]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      if (next === "light") document.documentElement.dataset.theme = "light";
      else delete document.documentElement.dataset.theme;
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const value = useMemo(
    () => ({
      user,
      ready,
      refreshUser,
      toast,
      cart,
      cartCount,
      cartNotice,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      theme,
      toggleTheme,
    }),
    [
      user,
      ready,
      refreshUser,
      toast,
      cart,
      cartCount,
      cartNotice,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      theme,
      toggleTheme,
    ],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto bg-[var(--btn)] px-4 py-3 text-center text-[13px] leading-snug text-[var(--btn-ink)]"
          >
            {item.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
