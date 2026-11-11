export const NEW_DEMAND_COOKIE = "lawina-new-demand";

export function startNewDemand() {
  document.cookie = `${NEW_DEMAND_COOKIE}=1; path=/; samesite=lax`;
}

export function clearNewDemand() {
  document.cookie = `${NEW_DEMAND_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
