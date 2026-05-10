/** Latin digits for SAR amounts (symbol rendered separately, e.g. `SaudiRiyalIcon`). */
export function formatSaudiRiyalAmountLatin(amount: number): string {
  return String(Math.max(0, Math.round(amount)));
}

/** @deprecated Use `formatSaudiRiyalAmountLatin` + `SaudiRiyalIcon` */
export function formatSaudiRiyalPrice(amount: number): string {
  return formatSaudiRiyalAmountLatin(amount);
}
