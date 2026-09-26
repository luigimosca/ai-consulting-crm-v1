/**
 * Exact Decimal and Currency Math Utility
 * All monetary amounts are stored in cents (integer) in SQLite to eliminate float rounding errors.
 */

export function calcLineTotal(
  quantity: number,
  unitPriceCents: number,
  discountPercent: number = 0
): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safePrice = Math.max(0, Math.round(Number(unitPriceCents) || 0));
  const safeDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0));

  const grossTotal = safeQty * safePrice;
  const netTotal = grossTotal * (1 - safeDiscount / 100);
  return Math.round(netTotal);
}

export function calcQuoteTotals(
  items: Array<{
    quantity: number;
    unitPrice?: number;
    unitPriceCents?: number;
    discountPercent?: number;
    taxRate?: number;
    taxRatePercent?: number;
  }>,
  overallDiscountCents: number = 0
): {
  subtotal: number;
  subtotalCents: number;
  discountTotal: number;
  discountTotalCents: number;
  taxableCents: number;
  taxTotal: number;
  taxAmountCents: number;
  totalAmount: number;
  totalAmountCents: number;
} {
  let subtotal = 0;
  let taxTotal = 0;
  let lineDiscountsTotal = 0;

  for (const item of items) {
    const price = item.unitPriceCents !== undefined ? item.unitPriceCents : (item.unitPrice || 0);
    const qty = item.quantity || 0;
    const disc = item.discountPercent || 0;
    const gross = qty * price;
    const lineNet = calcLineTotal(qty, price, disc);
    
    subtotal += lineNet;
    lineDiscountsTotal += (gross - lineNet);

    const rate = item.taxRatePercent !== undefined ? item.taxRatePercent : (typeof item.taxRate === 'number' ? item.taxRate : 22.0);
    const itemTax = Math.round(lineNet * (rate / 100));
    taxTotal += itemTax;
  }

  const safeOverallDiscount = Math.max(0, Math.min(subtotal, Math.round(overallDiscountCents || 0)));
  const taxableCents = subtotal - safeOverallDiscount;
  const totalAmount = taxableCents + taxTotal;

  return {
    subtotal,
    subtotalCents: subtotal,
    discountTotal: safeOverallDiscount + lineDiscountsTotal,
    discountTotalCents: safeOverallDiscount + lineDiscountsTotal,
    taxableCents,
    taxTotal,
    taxAmountCents: taxTotal,
    totalAmount,
    totalAmountCents: totalAmount,
  };
}

export function formatCentsToCurrency(
  cents: number | null | undefined,
  currency: string = 'EUR'
): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    cents = 0;
  }
  const euros = cents / 100;
  return euros.toLocaleString('it-IT', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseInputToCents(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return Math.round(val * 100);
  }
  // Clean italian formatted string like "1.500,50" -> 1500.50 -> 150050 cents
  const clean = val
    .toString()
    .replace(/[^\d.,-]/g, '')
    .replace(/\.(?=\d{3}(,|$))/g, '') // remove thousands dot
    .replace(',', '.'); // convert decimal comma to dot

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatDiscountDisplay(
  cents: number | null | undefined,
  currency: string = 'EUR'
): string {
  const safe = Math.max(0, cents || 0);
  if (safe === 0) {
    return formatCentsToCurrency(0, currency);
  }
  return `- ${formatCentsToCurrency(safe, currency)}`;
}

export function formatCentsToInput(cents: number | null | undefined): string {
  if (!cents || isNaN(cents)) return '0';
  const val = cents / 100;
  return Number.isInteger(val) ? val.toString() : val.toFixed(2);
}


