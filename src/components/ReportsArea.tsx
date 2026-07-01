import { useMemo, useState, ReactNode, Fragment } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Plus, Trash2, Printer } from 'lucide-react';
import { useData } from '../context/DataContext';
import { buildReports } from '../finance/engine';
import { CHART_OF_ACCOUNTS, NAMRA_WEAR_AND_TEAR } from '../finance/chartOfAccounts';
import { FixedAsset, ManualEntry, PriorYear, FinanceSettings } from '../finance/types';
import AFSDocument from './AFSDocument';

type Tab = 'kpi' | 'income' | 'balance' | 'cashflow' | 'tax' | 'vat' | 'trial' | 'equity' | 'aging' | 'afs' | 'setup';

const n$ = (v: number) =>
  (v < 0 ? '-N$ ' : 'N$ ') +
  Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number) => (v * 100).toFixed(1) + '%';

interface RowProps { label: string; value: number; bold?: boolean; accent?: boolean; indent?: boolean }
function Row({ label, value, bold, accent, indent }: RowProps) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-[#222] ${bold ? 'font-bold' : ''}`}>
      <span className={`${indent ? 'pl-4 ' : ''}text-sm ${bold ? 'text-[#E4E3E0]' : 'text-[#AAA]'}`}>{label}</span>
      <span className={`text-sm font-mono ${accent ? 'text-[#D42C2C]' : bold ? 'text-white' : 'text-[#E4E3E0]'}`}>{n$(value)}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-[11px] uppercase tracking-widest text-[#888] font-bold mt-6 mb-2">{children}</div>;
}

function CheckBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest ${ok ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#D42C2C]/10 text-[#D42C2C]'}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {label}
    </div>
  );
}

const PRIOR_YEAR_FIELDS: { key: keyof PriorYear; label: string }[] = [
  { key: 'cash', label: 'Cash & cash equivalents' },
  { key: 'accountsReceivable', label: 'Accounts receivable' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'prepaidExpenses', label: 'Prepaid expenses' },
  { key: 'ppeCost', label: 'PP&E (cost)' },
  { key: 'accumulatedDepreciation', label: 'Accumulated depreciation' },
  { key: 'accountsPayable', label: 'Accounts payable' },
  { key: 'vatPayable', label: 'VAT payable' },
  { key: 'incomeTaxPayable', label: 'Income tax payable' },
  { key: 'accruedLiabilities', label: 'Accrued liabilities' },
  { key: 'loansPayable', label: 'Loans payable' },
  { key: 'shareCapital', label: 'Share capital' },
  { key: 'retainedEarnings', label: 'Retained earnings (opening)' },
];

export default function ReportsArea({ onBack }: { onBack: () => void }) {
  const { products, sales, purchases, customers, finance, setFinance } = useData();
  const [tab, setTab] = useState<Tab>('kpi');

  const reports = useMemo(
    () => buildReports({ sales, purchases, customers }, finance),
    [sales, purchases, customers, finance],
  );
  const is = reports.incomeStatement;
  const bs = reports.balanceSheet;
  const tax = reports.taxEngine;
  const cf = reports.cashFlow;
  const tb = reports.trialBalance;
  const eq = reports.changesInEquity;
  const aging = reports.debtorsAging;
  const s = finance.settings;

  const setSetting = (key: keyof FinanceSettings, value: string | number) =>
    setFinance((f) => ({ ...f, settings: { ...f.settings, [key]: value } }));

  // Prior-year internal balance check (opening assets must equal opening equity + liabilities).
  const py = finance.priorYear;
  const pyAssets = py.cash + py.accountsReceivable + py.inventory + py.prepaidExpenses + py.ppeCost - py.accumulatedDepreciation;
  const pyEqLiab = py.accountsPayable + py.vatPayable + py.incomeTaxPayable + py.accruedLiabilities + py.loansPayable + py.shareCapital + py.retainedEarnings;
  const pyCheck = Math.round((pyAssets - pyEqLiab) * 100) / 100;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'kpi', label: 'KPI Dashboard' },
    { id: 'income', label: 'Income Statement' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'equity', label: 'Changes in Equity' },
    { id: 'trial', label: 'Trial Balance' },
    { id: 'tax', label: 'Tax (NAMRA)' },
    { id: 'vat', label: 'VAT Return' },
    { id: 'aging', label: 'Debtors Aging' },
    { id: 'afs', label: 'AFS (Print)' },
    { id: 'setup', label: 'Setup & Inputs' },
  ];

  // ---- Setup helpers ----
  const updatePriorYear = (key: keyof PriorYear, value: number) =>
    setFinance((f) => ({ ...f, priorYear: { ...f.priorYear, [key]: value } }));
  const addAsset = () =>
    setFinance((f) => ({
      ...f,
      assets: [...f.assets, { id: Math.random().toString(), description: '', category: 'Computers & Equipment', cost: 0 }],
    }));
  const updateAsset = (id: string, patch: Partial<FixedAsset>) =>
    setFinance((f) => ({ ...f, assets: f.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const removeAsset = (id: string) => setFinance((f) => ({ ...f, assets: f.assets.filter((a) => a.id !== id) }));
  const addEntry = () =>
    setFinance((f) => ({
      ...f,
      manualEntries: [
        ...f.manualEntries,
        { id: Math.random().toString(), date: new Date(), description: '', debitAccount: 'Rent Expense', creditAccount: 'Cash & Cash Equivalents', amount: 0, vat: false },
      ],
    }));
  const updateEntry = (id: string, patch: Partial<ManualEntry>) =>
    setFinance((f) => ({ ...f, manualEntries: f.manualEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const removeEntry = (id: string) =>
    setFinance((f) => ({ ...f, manualEntries: f.manualEntries.filter((e) => e.id !== id) }));

  const inputCls = 'bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:border-[#555] w-full';

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">{finance.settings.companyName}</div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Financial <span className="text-[#D42C2C]">Reports</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2 no-print">
            <span className="text-[10px] uppercase tracking-widest text-[#888] font-bold">Period</span>
            <input type="date" value={s.periodStart} onChange={(e) => setSetting('periodStart', e.target.value)}
              className="bg-[#222] border border-[#333] rounded-lg py-1.5 px-2 text-xs font-mono focus:outline-none focus:border-[#555]" />
            <span className="text-[#555] text-xs">→</span>
            <input type="date" value={s.periodEnd} onChange={(e) => setSetting('periodEnd', e.target.value)}
              className="bg-[#222] border border-[#333] rounded-lg py-1.5 px-2 text-xs font-mono focus:outline-none focus:border-[#555]" />
          </div>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-4 sm:px-6 border-b border-[#262626] bg-[#111] shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-4 px-5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer whitespace-nowrap ${tab === t.id ? 'border-[#D42C2C] text-[#D42C2C]' : 'border-transparent text-[#888] hover:text-[#E4E3E0]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">

          {tab === 'kpi' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Gross Margin', value: pct(reports.kpis.grossMargin) },
                { label: 'EBIT Margin', value: pct(reports.kpis.ebitMargin) },
                { label: 'Net Profit Margin', value: pct(reports.kpis.netMargin) },
                { label: 'Current Ratio', value: reports.kpis.currentRatio.toFixed(2) },
                { label: 'Debt-to-Equity', value: reports.kpis.debtToEquity.toFixed(2) },
                { label: 'Return on Equity', value: pct(reports.kpis.returnOnEquity) },
              ].map((k) => (
                <div key={k.label} className="bg-[#151515] border border-[#262626] rounded-2xl p-5">
                  <div className="text-[10px] uppercase tracking-widest text-[#888] mb-3">{k.label}</div>
                  <div className="text-3xl font-mono">{k.value}</div>
                </div>
              ))}
              <div className="col-span-2 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {[
                  { label: 'Total Revenue', value: is.grossRevenue },
                  { label: 'Gross Profit', value: is.grossProfit },
                  { label: 'EBIT', value: is.operatingProfit },
                  { label: 'Net Profit', value: is.netProfitAfterTax },
                ].map((k) => (
                  <div key={k.label} className="bg-[#151515] border border-[#262626] rounded-2xl p-5">
                    <div className="text-[10px] uppercase tracking-widest text-[#888] mb-2">{k.label}</div>
                    <div className="text-lg font-mono">{n$(k.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'income' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <SectionTitle>Revenue</SectionTitle>
              <Row label="Sales Revenue" value={is.salesRevenue} indent />
              <Row label="Service Revenue" value={is.serviceRevenue} indent />
              <Row label="Other Income" value={is.otherIncome} indent />
              <Row label="Gross Revenue" value={is.grossRevenue} bold />
              <SectionTitle>Cost of Goods Sold</SectionTitle>
              <Row label="Cost of Goods Sold" value={is.cogs} indent />
              <Row label="Direct Labour" value={is.directLabour} indent />
              <Row label="Total COGS" value={is.totalCogs} bold />
              <Row label="Gross Profit" value={is.grossProfit} bold accent />
              <SectionTitle>Operating Expenses</SectionTitle>
              {is.opex.filter((o: { label: string; value: number }) => o.value !== 0).map((o: { label: string; value: number }) => <Fragment key={o.label}><Row label={o.label} value={o.value} indent /></Fragment>)}
              <Row label="Total Operating Expenses" value={is.totalOpex} bold />
              <Row label="Operating Profit (EBIT)" value={is.operatingProfit} bold accent />
              <SectionTitle>Below the Line</SectionTitle>
              <Row label="Interest Expense" value={is.interestExpense} indent />
              <Row label="Net Profit Before Tax (EBT)" value={is.ebt} bold />
              <Row label="Income Tax" value={is.taxLiability} indent />
              <Row label="Dividends Declared" value={is.dividends} indent />
              <Row label="Net Profit After Tax" value={is.netProfitAfterTax} bold accent />
            </div>
          )}

          {tab === 'balance' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <div className="flex justify-end mb-2">
                <CheckBadge ok={bs.check === 0} label={bs.check === 0 ? 'Balanced ✓' : `Out of balance: ${n$(bs.check)}`} />
              </div>
              <SectionTitle>Current Assets</SectionTitle>
              <Row label="Cash & Cash Equivalents" value={bs.cash} indent />
              <Row label="Accounts Receivable" value={bs.accountsReceivable} indent />
              <Row label="Inventory" value={bs.inventory} indent />
              <Row label="Prepaid Expenses" value={bs.prepaid} indent />
              <Row label="Total Current Assets" value={bs.totalCurrentAssets} bold />
              <SectionTitle>Non-Current Assets</SectionTitle>
              <Row label="Property, Plant & Equipment" value={bs.ppeCost} indent />
              <Row label="Accumulated Depreciation" value={bs.accumDep} indent />
              <Row label="Total Assets" value={bs.totalAssets} bold accent />
              <SectionTitle>Liabilities</SectionTitle>
              <Row label="Accounts Payable" value={bs.accountsPayable} indent />
              <Row label="VAT Payable" value={bs.vatPayable} indent />
              <Row label="Income Tax Payable" value={bs.incomeTaxPayable} indent />
              <Row label="Accrued Liabilities" value={bs.accrued} indent />
              <Row label="Loans Payable (Long-term)" value={bs.loansPayable} indent />
              <Row label="Total Liabilities" value={bs.totalLiabilities} bold />
              <SectionTitle>Equity</SectionTitle>
              <Row label="Share Capital" value={bs.shareCapital} indent />
              <Row label="Prior Year Retained Earnings" value={bs.priorRetainedEarnings} indent />
              <Row label="Less: Dividends Declared" value={-bs.dividends} indent />
              <Row label="Current Year Net Profit" value={bs.netProfitAfterTax} indent />
              <Row label="Total Equity" value={bs.totalEquity} bold />
              <Row label="Total Liabilities + Equity" value={bs.totalLiabilities + bs.totalEquity} bold accent />
            </div>
          )}

          {tab === 'cashflow' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <SectionTitle>Operating Activities</SectionTitle>
              <Row label="Net Profit After Tax" value={cf.netProfitAfterTax} indent />
              <Row label="Add: Depreciation" value={cf.depreciationExpense} indent />
              <Row label="Working Capital Movements" value={cf.workingCapital} indent />
              <Row label="Net Cash from Operating" value={cf.netOperating} bold />
              <SectionTitle>Investing Activities</SectionTitle>
              <Row label="Net Cash from Investing" value={cf.netInvesting} bold />
              <SectionTitle>Financing Activities</SectionTitle>
              <Row label="Net Cash from Financing" value={cf.netFinancing} bold />
              <SectionTitle>Summary</SectionTitle>
              <Row label="Opening Cash Balance" value={cf.openingCash} indent />
              <Row label="Net Increase / (Decrease)" value={cf.netCashChange} indent />
              <Row label="Closing Cash Balance" value={cf.closingCash} bold accent />
              <div className="flex justify-end mt-3">
                <CheckBadge ok={cf.check === 0} label={cf.check === 0 ? 'Ties to Balance Sheet ✓' : `Variance vs BS cash: ${n$(cf.check)}`} />
              </div>
            </div>
          )}

          {tab === 'tax' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <SectionTitle>Taxable Income Computation (NamRA)</SectionTitle>
              <Row label="Accounting Profit (EBT)" value={tax.ebt} indent />
              <Row label="Add: Fines & Penalties" value={tax.finesAddBack} indent />
              <Row label="Add: 50% Entertainment Disallowance" value={tax.entertainmentAddBack} indent />
              <Row label="Add: Other Non-Deductible" value={tax.otherNonDeductible} indent />
              <Row label="Total Add-Backs" value={tax.totalAddBacks} bold />
              <Row label="Less: Capital Allowances (Wear & Tear)" value={-tax.capitalAllowances} indent />
              <Row label="Less: Assessed Loss Brought Forward" value={-tax.assessedLoss} indent />
              <Row label="Taxable Income" value={tax.taxableIncome} bold accent />
              <SectionTitle>Income Tax Liability</SectionTitle>
              <div className="flex justify-between py-2 border-b border-[#222]">
                <span className="text-sm text-[#AAA]">Corporate Tax Rate</span>
                <span className="text-sm font-mono">{pct(tax.corporateTaxRate)}</span>
              </div>
              <Row label="Income Tax Liability" value={tax.taxLiability} bold accent />
              <SectionTitle>Provisional Tax (Two-Payment System)</SectionTitle>
              <Row label="1st Provisional Payment (P1 — 40%, August)" value={tax.provisionalP1} indent />
              <Row label="2nd Provisional Payment (P2 — 60%, February)" value={tax.provisionalP2} indent />
              <Row label="Assessed Loss Carried Forward" value={tax.lossCarriedForward} bold />
            </div>
          )}

          {tab === 'vat' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <div className="flex justify-between items-center">
                <SectionTitle>VAT Return — NAMRA (Standard Rate {pct(s.vatRate)})</SectionTitle>
                {s.vatNumber && <span className="text-xs text-[#555] font-mono">VAT No: {s.vatNumber}</span>}
              </div>
              <Row label="Output VAT — on sales (Box 1)" value={reports.vat.outputVat} indent />
              <Row label="Input VAT — on purchases (Box 2)" value={reports.vat.inputVat} indent />
              <Row label="Net VAT Payable to NAMRA / (Refundable)" value={reports.vat.netPayable} bold accent />
              <p className="text-xs text-[#555] mt-4">
                Namibian VAT returns are filed per tax period (typically bi-monthly), due by the 25th of the month following the period end. A positive amount is payable to NAMRA; a negative amount is refundable.
              </p>
            </div>
          )}

          {tab === 'trial' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <div className="flex justify-between items-center mb-2">
                <SectionTitle>Trial Balance (Balancete)</SectionTitle>
                <CheckBadge ok={tb.balanced} label={tb.balanced ? 'Balanced ✓' : 'Out of balance ✗'} />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[#888] border-b border-[#262626]">
                    <th className="text-left py-2">Account</th>
                    <th className="text-right py-2">Debit (N$)</th>
                    <th className="text-right py-2">Credit (N$)</th>
                  </tr>
                </thead>
                <tbody>
                  {tb.rows.map((r) => (
                    <tr key={r.account} className="border-b border-[#222]">
                      <td className="py-2 text-[#AAA]">{r.account}</td>
                      <td className="py-2 text-right font-mono">{r.debit ? r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="py-2 text-right font-mono">{r.credit ? r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-[#444]">
                    <td className="py-2">TOTAL</td>
                    <td className="py-2 text-right font-mono">{tb.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right font-mono">{tb.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {tab === 'equity' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <SectionTitle>Statement of Changes in Equity</SectionTitle>
              <Row label="Balance at beginning of year" value={eq.totalOpening} bold />
              <Row label="Share / members' capital introduced" value={eq.shareCapitalIssued} indent />
              <Row label="Profit for the year" value={eq.profitForYear} indent />
              <Row label="Dividends / distributions" value={-eq.dividends} indent />
              <Row label="Balance at end of year" value={eq.totalClosing} bold accent />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#111] border border-[#262626] rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[#888] mb-2">Capital (closing)</div>
                  <div className="text-lg font-mono">{n$(eq.shareCapitalClosing)}</div>
                </div>
                <div className="bg-[#111] border border-[#262626] rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[#888] mb-2">Retained earnings (closing)</div>
                  <div className="text-lg font-mono">{n$(eq.retainedClosing)}</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'aging' && (
            <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
              <SectionTitle>Debtors Aging (Accounts Receivable)</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {[
                  { label: 'Current (0–30d)', value: aging.current },
                  { label: '31–60 days', value: aging.d30 },
                  { label: '61–90 days', value: aging.d60 },
                  { label: '90+ days', value: aging.d90 },
                ].map((b) => (
                  <div key={b.label} className="bg-[#111] border border-[#262626] rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-widest text-[#888] mb-2">{b.label}</div>
                    <div className="text-lg font-mono">{n$(b.value)}</div>
                  </div>
                ))}
              </div>
              <Row label="Total outstanding receivables" value={aging.total} bold accent />
              <p className="text-xs text-[#555] mt-4">Aged by last transaction date — useful for bank facilities and credit control.</p>
            </div>
          )}

          {tab === 'afs' && (
            <div>
              <div className="flex justify-between items-center mb-4 no-print">
                <div className="flex items-center gap-2">
                  <CheckBadge ok={bs.check === 0} label={bs.check === 0 ? 'Statements balanced ✓' : `Out of balance: ${n$(bs.check)}`} />
                </div>
                <button onClick={() => window.print()} className="bg-[#D42C2C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#B91C1C] transition-colors cursor-pointer flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              </div>
              <AFSDocument reports={reports} settings={s} />
            </div>
          )}

          {tab === 'setup' && (
            <div className="space-y-6">
              {/* Entity details (AFS cover / NAMRA / banks) */}
              <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
                <SectionTitle>Entity Details (AFS / NAMRA / Banks)</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <label className="text-xs text-[#888]">Entity Type
                    <select className={inputCls} value={s.entityType} onChange={(e) => setSetting('entityType', e.target.value)}>
                      <option>Close Corporation (CC)</option>
                      <option>(Pty) Ltd</option>
                      <option>Sole Proprietor</option>
                      <option>Partnership</option>
                    </select>
                  </label>
                  <label className="text-xs text-[#888]">Registration Number
                    <input className={inputCls} value={s.registrationNumber} onChange={(e) => setSetting('registrationNumber', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">VAT Registration No (NAMRA)
                    <input className={inputCls} value={s.vatNumber} onChange={(e) => setSetting('vatNumber', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Income Tax No (NAMRA)
                    <input className={inputCls} value={s.taxNumber} onChange={(e) => setSetting('taxNumber', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Financial Year Start
                    <input className={inputCls} value={s.financialYearStart} onChange={(e) => setSetting('financialYearStart', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Financial Year End
                    <input className={inputCls} value={s.financialYearEnd} onChange={(e) => setSetting('financialYearEnd', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Business Address
                    <input className={inputCls} value={s.businessAddress} onChange={(e) => setSetting('businessAddress', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Prepared By
                    <input className={inputCls} value={s.preparedBy} onChange={(e) => setSetting('preparedBy', e.target.value)} />
                  </label>
                </div>
              </div>

              {/* Global constants */}
              <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
                <SectionTitle>Global Constants</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <label className="text-xs text-[#888]">Company Name
                    <input className={inputCls} value={finance.settings.companyName}
                      onChange={(e) => setFinance((f) => ({ ...f, settings: { ...f.settings, companyName: e.target.value } }))} />
                  </label>
                  <label className="text-xs text-[#888]">Report Period Start
                    <input type="date" className={inputCls} value={s.periodStart} onChange={(e) => setSetting('periodStart', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Report Period End
                    <input type="date" className={inputCls} value={s.periodEnd} onChange={(e) => setSetting('periodEnd', e.target.value)} />
                  </label>
                  <label className="text-xs text-[#888]">Corporate Tax Rate
                    <input type="number" step="0.01" className={inputCls} value={finance.settings.corporateTaxRate}
                      onChange={(e) => setFinance((f) => ({ ...f, settings: { ...f.settings, corporateTaxRate: Number(e.target.value) } }))} />
                  </label>
                  <label className="text-xs text-[#888]">VAT Rate
                    <input type="number" step="0.01" className={inputCls} value={finance.settings.vatRate}
                      onChange={(e) => setFinance((f) => ({ ...f, settings: { ...f.settings, vatRate: Number(e.target.value) } }))} />
                  </label>
                  <label className="text-xs text-[#888]">Annual Interest Rate
                    <input type="number" step="0.01" className={inputCls} value={finance.settings.annualInterestRate}
                      onChange={(e) => setFinance((f) => ({ ...f, settings: { ...f.settings, annualInterestRate: Number(e.target.value) } }))} />
                  </label>
                  <label className="text-xs text-[#888]">Months in Period
                    <input type="number" className={inputCls} value={finance.settings.monthsInPeriod}
                      onChange={(e) => setFinance((f) => ({ ...f, settings: { ...f.settings, monthsInPeriod: Number(e.target.value) } }))} />
                  </label>
                  <label className="text-xs text-[#888]">Dividends Declared
                    <input type="number" className={inputCls} value={finance.dividendsDeclared}
                      onChange={(e) => setFinance((f) => ({ ...f, dividendsDeclared: Number(e.target.value) }))} />
                  </label>
                  <label className="text-xs text-[#888]">Other Non-Deductible (tax)
                    <input type="number" className={inputCls} value={finance.otherNonDeductible}
                      onChange={(e) => setFinance((f) => ({ ...f, otherNonDeductible: Number(e.target.value) }))} />
                  </label>
                  <label className="text-xs text-[#888]">Assessed Loss B/F
                    <input type="number" className={inputCls} value={finance.assessedLossBroughtForward}
                      onChange={(e) => setFinance((f) => ({ ...f, assessedLossBroughtForward: Number(e.target.value) }))} />
                  </label>
                </div>
              </div>

              {/* Prior year */}
              <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
                <div className="flex justify-between items-center">
                  <SectionTitle>Prior Year Closing Balances</SectionTitle>
                  <CheckBadge ok={pyCheck === 0} label={pyCheck === 0 ? 'Balanced ✓' : `Out by ${n$(pyCheck)}`} />
                </div>
                <p className="text-xs text-[#555] mb-2">Opening assets must equal opening equity + liabilities. Enter accumulated depreciation as a positive number.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {PRIOR_YEAR_FIELDS.map((fld) => (
                    <label key={fld.key} className="text-xs text-[#888]">{fld.label}
                      <input type="number" className={inputCls} value={finance.priorYear[fld.key]}
                        onChange={(e) => updatePriorYear(fld.key, Number(e.target.value))} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Fixed assets */}
              <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
                <div className="flex justify-between items-center">
                  <SectionTitle>Fixed Asset Register</SectionTitle>
                  <button onClick={addAsset} className="text-[10px] uppercase font-bold tracking-widest text-[#10B981] flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" /> Add</button>
                </div>
                {finance.assets.length === 0 && <p className="text-sm text-[#555] italic">No assets. Add cattle plant, vehicles, equipment…</p>}
                {finance.assets.map((a) => (
                  <div key={a.id} className="flex flex-wrap gap-2 items-end mt-3">
                    <input placeholder="Description" className={inputCls + ' flex-1'} value={a.description} onChange={(e) => updateAsset(a.id, { description: e.target.value })} />
                    <select className={inputCls + ' flex-1'} value={a.category} onChange={(e) => updateAsset(a.id, { category: e.target.value as FixedAsset['category'] })}>
                      {Object.keys(NAMRA_WEAR_AND_TEAR).map((c) => <option key={c} value={c}>{c} ({pct(NAMRA_WEAR_AND_TEAR[c])})</option>)}
                    </select>
                    <input type="number" placeholder="Cost" className={inputCls + ' w-28'} value={a.cost || ''} onChange={(e) => updateAsset(a.id, { cost: Number(e.target.value) })} />
                    <button onClick={() => removeAsset(a.id)} className="text-red-500 p-2 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              {/* Manual journal entries */}
              <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6">
                <div className="flex justify-between items-center">
                  <SectionTitle>Manual Journal Entries (expenses, capital, loans…)</SectionTitle>
                  <button onClick={addEntry} className="text-[10px] uppercase font-bold tracking-widest text-[#10B981] flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" /> Add</button>
                </div>
                {finance.manualEntries.length === 0 && <p className="text-sm text-[#555] italic">No entries. Book rent, salaries, utilities, depreciation, share capital, loans…</p>}
                {finance.manualEntries.map((e) => (
                  <div key={e.id} className="flex gap-2 items-end mt-3 flex-wrap">
                    <input placeholder="Description" className={inputCls + ' flex-1 min-w-[120px]'} value={e.description} onChange={(ev) => updateEntry(e.id, { description: ev.target.value })} />
                    <select className={inputCls + ' w-44'} value={e.debitAccount} onChange={(ev) => updateEntry(e.id, { debitAccount: ev.target.value })}>
                      {CHART_OF_ACCOUNTS.map((a) => <option key={a.name} value={a.name}>Dr: {a.name}</option>)}
                    </select>
                    <select className={inputCls + ' w-44'} value={e.creditAccount} onChange={(ev) => updateEntry(e.id, { creditAccount: ev.target.value })}>
                      {CHART_OF_ACCOUNTS.map((a) => <option key={a.name} value={a.name}>Cr: {a.name}</option>)}
                    </select>
                    <input type="number" placeholder="Amount" className={inputCls + ' w-28'} value={e.amount || ''} onChange={(ev) => updateEntry(e.id, { amount: Number(ev.target.value) })} />
                    <button onClick={() => removeEntry(e.id)} className="text-red-500 p-2 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
