import type { CampaignStatus, CampaignView, Line, Product } from "./types";

export const ACTIVATION = 70;
export const CAP = 100;
export const DEADLINE = new Date("2026-10-08T23:59:00+03:00");
export const PAYMENT_HOURS = 48;

export function roundPrice(cost100: number, demand: number) {
  return Math.round(cost100 / Math.max(1, demand));
}

export function formatTL(n: number) {
  return `${new Intl.NumberFormat("tr-TR").format(n)} TL`;
}

export function formatDeadline(d = DEADLINE) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(d);
}

export function isPastDeadline(now = Date.now()) {
  return now >= DEADLINE.getTime();
}

export function formatRemaining(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "süre doldu";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} gün ${h % 24} sa`;
  }
  if (h > 0) return `${h} sa ${m} dk`;
  return `${Math.max(1, m)} dk`;
}

export function paymentDueAt(status: CampaignStatus, lockedAt: string | null) {
  if (status === "frozen") {
    return new Date(DEADLINE.getTime() + PAYMENT_HOURS * 3_600_000).toISOString();
  }
  if (status === "locked" && lockedAt) {
    return new Date(
      new Date(lockedAt).getTime() + PAYMENT_HOURS * 3_600_000,
    ).toISOString();
  }
  return null;
}

export function viewForProduct(
  product: Product,
  items: Line[],
  lockedAt: string | null = null,
): CampaignView {
  const ofProduct = items.filter((i) => i.productId === product.id);
  const primaryQty = ofProduct
    .filter((i) => i.status === "waitlist" || i.status === "committed")
    .reduce((s, i) => s + i.qty, 0);
  const overflowQty = ofProduct
    .filter((i) => i.status === "overflow")
    .reduce((s, i) => s + i.qty, 0);

  const rawDemand = primaryQty;
  const demand = Math.min(rawDemand, CAP);
  const overflow = overflowQty + Math.max(0, rawDemand - CAP);
  const past = isPastDeadline();

  let status: CampaignStatus;
  if (past && demand < ACTIVATION) status = "failed";
  else if (past) status = "frozen";
  else if (rawDemand >= CAP) status = "locked";
  else if (demand >= ACTIVATION) status = "active";
  else status = "pending";

  const currentPrice =
    demand >= ACTIVATION ? roundPrice(product.cost100, demand) : null;
  const paymentOpen = status === "locked" || status === "frozen";

  return {
    demand,
    overflow,
    status,
    currentPrice,
    priceAt70: roundPrice(product.cost100, ACTIVATION),
    priceAt100: roundPrice(product.cost100, CAP),
    neededForActivation: Math.max(0, ACTIVATION - rawDemand),
    neededForMin: Math.max(0, CAP - rawDemand),
    paymentOpen,
    payBy: paymentDueAt(status, lockedAt),
  };
}

export function payableForLine(
  maxPrice: number | null,
  currentPrice: number | null,
) {
  if (maxPrice == null) return currentPrice;
  if (currentPrice == null) return maxPrice;
  return Math.min(maxPrice, currentPrice);
}
