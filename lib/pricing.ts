export function formatTL(n: number) {
  return `${new Intl.NumberFormat("tr-TR").format(n)} TL`;
}

const ACTIVATION = 70;
const GROUP = 100;

export function spotPrice(product: {
  demand: number;
  batch2: number;
  priceAt100: number;
}) {
  if (product.demand < ACTIVATION) return null;
  const count =
    product.demand <= GROUP
      ? product.demand
      : product.batch2 >= ACTIVATION
        ? product.batch2
        : GROUP;
  return Math.round((product.priceAt100 * GROUP) / count);
}
