export function formatTL(n: number) {
  return `${new Intl.NumberFormat("tr-TR").format(n)} TL`;
}
