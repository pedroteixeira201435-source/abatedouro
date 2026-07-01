/**
 * Converts the program's own data (sales, purchases, customer payments) plus the manual
 * finance inputs into double-entry journal lines — the single source every statement derives from.
 * Same idea as the spreadsheet's "Journal" sheet, but auto-fed from POS activity.
 */
import { Sale, Purchase, Customer } from '../types';
import { FinanceConfig, FinanceSettings, JournalLine, PriorYear } from './types';

export interface PosData {
  sales: Sale[];
  purchases: Purchase[];
  customers: Customer[];
}

const vatPortion = (grossInclusive: number, rate: number) => (grossInclusive * rate) / (1 + rate);

/** Build a predicate that keeps a date within the configured report period (empty bounds = no limit). */
export function makeInPeriod(settings: FinanceSettings): (d: Date | string) => boolean {
  const start = settings.periodStart ? new Date(settings.periodStart + 'T00:00:00').getTime() : null;
  const end = settings.periodEnd ? new Date(settings.periodEnd + 'T23:59:59').getTime() : null;
  return (d) => {
    const t = new Date(d).getTime();
    if (start !== null && t < start) return false;
    if (end !== null && t > end) return false;
    return true;
  };
}

/** Opening balances from Prior Year, journalised so the Balance Sheet ties from the journal alone. */
function openingEntries(py: PriorYear): JournalLine[] {
  const d = (account: string, amount: number): JournalLine => ({ account, debit: amount, credit: 0 });
  const c = (account: string, amount: number): JournalLine => ({ account, debit: 0, credit: amount });
  return [
    d('Cash & Cash Equivalents', py.cash),
    d('Accounts Receivable', py.accountsReceivable),
    d('Inventory', py.inventory),
    d('Prepaid Expenses', py.prepaidExpenses),
    d('Property, Plant & Equipment', py.ppeCost),
    c('Accumulated Depreciation', py.accumulatedDepreciation),
    c('Accounts Payable', py.accountsPayable),
    c('VAT Payable', py.vatPayable),
    c('Income Tax Payable', py.incomeTaxPayable),
    c('Accrued Liabilities', py.accruedLiabilities),
    c('Loans Payable', py.loansPayable),
    c('Share Capital', py.shareCapital),
    c('Retained Earnings', py.retainedEarnings),
  ].filter((l) => l.debit !== 0 || l.credit !== 0);
}

export function buildJournal(pos: PosData, config: FinanceConfig): JournalLine[] {
  const rate = config.settings.vatRate;
  const inPeriod = makeInPeriod(config.settings);
  const lines: JournalLine[] = [...openingEntries(config.priorYear)];

  // --- Sales (retail prices are VAT-inclusive) ---
  for (const sale of pos.sales) {
    if (sale.status !== 'Completed' || !inPeriod(sale.date)) continue; // voided/refunded or out-of-period excluded
    const vat = vatPortion(sale.total, rate);
    const net = sale.total - vat;
    const cashOrAr = sale.paymentType === 'Credit' ? 'Accounts Receivable' : 'Cash & Cash Equivalents';
    lines.push({ account: cashOrAr, debit: sale.total, credit: 0, vat: true });
    lines.push({ account: 'Sales Revenue', debit: 0, credit: net });
    lines.push({ account: 'VAT Payable', debit: 0, credit: vat });
    // Cost of goods sold relieves inventory at cost.
    if (sale.costTotal > 0) {
      lines.push({ account: 'Cost of Goods Sold', debit: sale.costTotal, credit: 0 });
      lines.push({ account: 'Inventory', debit: 0, credit: sale.costTotal });
    }
  }

  // --- Customer payments collected against credit accounts ---
  for (const cust of pos.customers) {
    for (const p of cust.payments ?? []) {
      if (!inPeriod(p.date)) continue;
      lines.push({ account: 'Cash & Cash Equivalents', debit: p.amount, credit: 0 });
      lines.push({ account: 'Accounts Receivable', debit: 0, credit: p.amount });
    }
  }

  // --- Purchases / intake (assumed paid in cash). Resale & ingredients carry input VAT. ---
  for (const purchase of pos.purchases) {
    if (!inPeriod(purchase.date)) continue;
    const hasVat = purchase.type !== 'Live Cattle'; // livestock treated as zero-rated
    const vat = hasVat ? vatPortion(purchase.totalCost, rate) : 0;
    const net = purchase.totalCost - vat;
    lines.push({ account: 'Inventory', debit: net, credit: 0, vat: hasVat });
    if (vat > 0) lines.push({ account: 'VAT Payable', debit: vat, credit: 0 }); // input VAT reduces the payable
    lines.push({ account: 'Cash & Cash Equivalents', debit: 0, credit: purchase.totalCost });
  }

  // --- Manual entries (expenses, capital, loans, depreciation, …) ---
  for (const e of config.manualEntries) {
    if (!inPeriod(e.date)) continue;
    lines.push({ account: e.debitAccount, debit: e.amount, credit: 0, vat: e.vat });
    lines.push({ account: e.creditAccount, debit: 0, credit: e.amount, vat: e.vat });
  }

  return lines;
}
