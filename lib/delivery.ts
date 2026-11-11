export const DELIVERIES = [
  {
    id: "okul",
    label: "Uygun bir vaktimde okula gelip ürünleri alabilirim.",
  },
  {
    id: "kargo",
    label: "Adrese kargolanmasını talep ediyorum.",
    note: "Yalnızca yurt içine kargo yapabiliyoruz.",
  },
] as const;

export type DeliveryId = (typeof DELIVERIES)[number]["id"];

export function isDelivery(value: unknown): value is DeliveryId {
  return value === "okul" || value === "kargo";
}

export function deliveryLabel(id: string) {
  const match = DELIVERIES.find((item) => item.id === id);
  if (!match) return id;
  return "note" in match && match.note ? `${match.label} (${match.note})` : match.label;
}
