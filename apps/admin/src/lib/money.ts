export function formatMoney(amount: number, currency = 'INR'): string {
  const major = amount / 100;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

export function parseMoney(input: string): number {
  const n = Number(input.replace(/[^\d.]/g, ''));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
