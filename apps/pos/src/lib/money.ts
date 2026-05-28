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
