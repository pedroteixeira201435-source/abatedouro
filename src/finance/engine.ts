/**
 * Reporting engine — mirrors the calculation logic of Namibia_Financial_Model_v8.xlsx.
 * Pure functions: given the unified journal + config + POS data, it derives every statement.
 */
import { ACCOUNT_BY_NAME, CHART_OF_ACCOUNTS, NAMRA_WEAR_AND_TEAR, OPEX_ACCOUNTS } from './chartOfAccounts';
import { FinanceConfig, JournalLine } from './types';
import { buildJournal, makeInPeriod, PosData } from './journalAdapter';

const vatPortion = (grossInclusive: number, rate: number) => (grossInclusive * rate) / (1 + rate);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per-account debit/credit totals from the journal. */
export function aggregate(journal: JournalLine[]) {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const l of journal) {
    const cur = map.get(l.account) ?? { debit: 0, credit: 0 };
    cur.debit += l.debit;
    cur.credit += l.credit;
    map.set(l.account, cur);
  }
  return map;
}

export interface Line {
  label: string;
  value: number;
}

export function buildReports(pos: PosData, config: FinanceConfig) {
  const journal = buildJournal(pos, config);
  const agg = aggregate(journal);
  const { vatRate, annualInterestRate, monthsInPeriod, corporateTaxRate } = config.settings;

  const totals = (account: string) => agg.get(account) ?? { debit: 0, credit: 0 };
  /** Signed balance in the account's natural direction (positive = normal). */
  const balance = (account: string) => {
    const t = totals(account);
    const normal = ACCOUNT_BY_NAME.get(account)?.normal ?? 'Debit';
    return normal === 'Debit' ? t.debit - t.credit : t.credit - t.debit;
  };

  // ---------- VAT Ledger (period only) ----------
  const inPeriod = makeInPeriod(config.settings);
  const outputVat = pos.sales
    .filter((s) => s.status === 'Completed' && inPeriod(s.date))
    .reduce((acc, s) => acc + vatPortion(s.total, vatRate), 0);
  const inputVat = pos.purchases
    .filter((p) => p.type !== 'Live Cattle' && inPeriod(p.date))
    .reduce((acc, p) => acc + vatPortion(p.totalCost, vatRate), 0);
  const vatNetPayable = outputVat - inputVat;

  // ---------- Income Statement ----------
  const salesRevenue = balance('Sales Revenue');
  const serviceRevenue = balance('Service Revenue');
  const otherIncome = balance('Other Income');
  const grossRevenue = salesRevenue + serviceRevenue + otherIncome;

  const cogs = balance('Cost of Goods Sold');
  const directLabour = balance('Direct Labour');
  const totalCogs = cogs + directLabour;
  const grossProfit = grossRevenue - totalCogs;

  const opex: Line[] = OPEX_ACCOUNTS.map((name) => ({ label: name, value: balance(name) }));
  const totalOpex = opex.reduce((s, l) => s + l.value, 0);
  const operatingProfit = grossProfit - totalOpex; // EBIT

  const loansBalance = balance('Loans Payable');
  const interestExpense = (loansBalance * annualInterestRate * monthsInPeriod) / 12;
  const ebt = operatingProfit - interestExpense;

  // ---------- Tax Engine (NamRA) ----------
  const finesAddBack = balance('Fines & Penalties (Non-Deductible)');
  const entertainmentAddBack = balance('Entertainment (50% Non-Deductible)') * 0.5;
  const totalAddBacks = finesAddBack + entertainmentAddBack + config.otherNonDeductible;
  const capitalAllowances = config.assets.reduce(
    (s, a) => s + a.cost * (NAMRA_WEAR_AND_TEAR[a.category] ?? 0),
    0,
  );
  const preTaxableBase = ebt + totalAddBacks - capitalAllowances - config.assessedLossBroughtForward;
  const taxableIncome = Math.max(0, preTaxableBase);
  const taxLiability = taxableIncome * corporateTaxRate;
  const lossCarriedForward = Math.max(0, -preTaxableBase);

  const netProfitAfterTax = ebt - taxLiability;

  // ---------- Balance Sheet (Statement of Financial Position) ----------
  const cash = balance('Cash & Cash Equivalents');
  const accountsReceivable = balance('Accounts Receivable');
  const inventory = balance('Inventory');
  const prepaid = balance('Prepaid Expenses');
  const totalCurrentAssets = cash + accountsReceivable + inventory + prepaid;

  const ppeCost = balance('Property, Plant & Equipment');
  const accumDep = -balance('Accumulated Depreciation'); // contra-asset, shown negative
  const totalNonCurrentAssets = ppeCost + accumDep;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const accountsPayable = balance('Accounts Payable');
  const incomeTaxPayable = taxLiability; // from Tax Engine, like the spreadsheet
  const accrued = balance('Accrued Liabilities');
  const totalCurrentLiabilities = accountsPayable + vatNetPayable + incomeTaxPayable + accrued;
  const totalNonCurrentLiabilities = loansBalance;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  const shareCapital = balance('Share Capital');
  const priorRetainedEarnings = config.priorYear.retainedEarnings;
  const dividends = config.dividendsDeclared;
  const totalEquity = shareCapital + priorRetainedEarnings - dividends + netProfitAfterTax;

  const balanceSheetCheck = round2(totalAssets - (totalLiabilities + totalEquity));

  // ---------- Cash Flow (indirect; opening from Prior Year) ----------
  const py = config.priorYear;
  const depreciationExpense = balance('Depreciation Expense');
  const wc =
    (py.accountsReceivable - accountsReceivable) +
    (py.inventory - inventory) +
    (py.prepaidExpenses - prepaid) +
    (accountsPayable - py.accountsPayable) +
    (vatNetPayable - py.vatPayable) +
    (accrued - py.accruedLiabilities) +
    (incomeTaxPayable - py.incomeTaxPayable);
  const netOperating = netProfitAfterTax + depreciationExpense + wc;
  const netInvesting = -ppeCost; // PP&E additions this period
  const netFinancing = shareCapital - dividends; // simplistic: capital raised less dividends paid
  const netCashChange = netOperating + netInvesting + netFinancing;
  const openingCash = py.cash;
  const closingCash = openingCash + netCashChange;
  const cashFlowCheck = round2(closingCash - cash);

  // ---------- Trial Balance (Balancete) — straight from the journal, always balances ----------
  const trialBalance = CHART_OF_ACCOUNTS.map((a) => {
    const t = totals(a.name);
    const net = round2(t.debit - t.credit);
    return { account: a.name, category: a.category, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
  }).filter((r) => r.debit !== 0 || r.credit !== 0);
  const tbDebitTotal = round2(trialBalance.reduce((s, r) => s + r.debit, 0));
  const tbCreditTotal = round2(trialBalance.reduce((s, r) => s + r.credit, 0));

  // ---------- Statement of Changes in Equity ----------
  const changesInEquity = {
    shareCapitalOpening: config.priorYear.shareCapital,
    shareCapitalIssued: round2(shareCapital - config.priorYear.shareCapital),
    shareCapitalClosing: shareCapital,
    retainedOpening: priorRetainedEarnings,
    profitForYear: netProfitAfterTax,
    dividends,
    retainedClosing: round2(priorRetainedEarnings + netProfitAfterTax - dividends),
    totalOpening: round2(config.priorYear.shareCapital + priorRetainedEarnings),
    totalClosing: totalEquity,
  };

  // ---------- Debtors (Accounts Receivable) Aging — for banks ----------
  const nowMs = Date.now();
  const aging = { current: 0, d30: 0, d60: 0, d90: 0, total: 0 };
  for (const c of pos.customers) {
    if (c.balance <= 0) continue;
    const days = c.lastPurchaseDate ? (nowMs - new Date(c.lastPurchaseDate).getTime()) / 86400000 : 0;
    if (days <= 30) aging.current += c.balance;
    else if (days <= 60) aging.d30 += c.balance;
    else if (days <= 90) aging.d60 += c.balance;
    else aging.d90 += c.balance;
    aging.total += c.balance;
  }

  // ---------- KPIs ----------
  const safeDiv = (a: number, b: number) => (b !== 0 ? a / b : 0);
  const kpis = {
    grossMargin: safeDiv(grossProfit, grossRevenue),
    ebitMargin: safeDiv(operatingProfit, grossRevenue),
    netMargin: safeDiv(netProfitAfterTax, grossRevenue),
    currentRatio: safeDiv(totalCurrentAssets, totalCurrentLiabilities),
    debtToEquity: safeDiv(totalLiabilities, totalEquity),
    interestCoverage: safeDiv(operatingProfit, interestExpense),
    returnOnEquity: safeDiv(netProfitAfterTax, totalEquity),
  };

  return {
    journal,
    journalBalanced: round2(journal.reduce((s, l) => s + l.debit - l.credit, 0)) === 0,
    incomeStatement: {
      salesRevenue, serviceRevenue, otherIncome, grossRevenue,
      cogs, directLabour, totalCogs, grossProfit,
      opex, totalOpex, operatingProfit,
      interestExpense, ebt, taxLiability, dividends, netProfitAfterTax,
    },
    taxEngine: {
      ebt, finesAddBack, entertainmentAddBack, otherNonDeductible: config.otherNonDeductible,
      totalAddBacks, capitalAllowances, assessedLoss: config.assessedLossBroughtForward,
      taxableIncome, corporateTaxRate, taxLiability,
      provisionalP1: taxLiability * 0.4, provisionalP2: taxLiability * 0.6,
      lossCarriedForward,
    },
    vat: { outputVat, inputVat, netPayable: vatNetPayable },
    balanceSheet: {
      cash, accountsReceivable, inventory, prepaid, totalCurrentAssets,
      ppeCost, accumDep, totalNonCurrentAssets, totalAssets,
      accountsPayable, vatPayable: vatNetPayable, incomeTaxPayable, accrued,
      totalCurrentLiabilities, loansPayable: loansBalance, totalNonCurrentLiabilities, totalLiabilities,
      shareCapital, priorRetainedEarnings, dividends, netProfitAfterTax, totalEquity,
      check: balanceSheetCheck,
    },
    cashFlow: {
      netProfitAfterTax, depreciationExpense, workingCapital: wc, netOperating,
      netInvesting, netFinancing, netCashChange, openingCash, closingCash, check: cashFlowCheck,
    },
    trialBalance: { rows: trialBalance, debitTotal: tbDebitTotal, creditTotal: tbCreditTotal, balanced: tbDebitTotal === tbCreditTotal },
    changesInEquity,
    debtorsAging: aging,
    kpis,
  };
}

export type Reports = ReturnType<typeof buildReports>;
