export function sanitizeNumberInput(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v);
  // Remove anything that's not a digit, minus, or decimal point
  s = s.replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrencySafe(value: unknown): string {
  const n = sanitizeNumberInput(value);
  try {
    // Use Intl when available
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(n);
  } catch (err) {
    // Fallback for environments without Intl support
    return `R${n.toFixed(2)}`;
  }
}

export default { sanitizeNumberInput, formatCurrencySafe };







