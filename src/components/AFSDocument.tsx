import { ReactNode, Fragment } from 'react';
import { Reports } from '../finance/engine';
import { FinanceSettings } from '../finance/types';

/** Accounting-style money: thousands separators, 2 decimals, negatives in parentheses. */
const m = (v: number) => {
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
};

function L({ label, value, bold, indent, top }: { label: string; value?: number; bold?: boolean; indent?: boolean; top?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${top ? 'border-t border-black mt-1' : ''} ${bold ? 'font-bold border-b-2 border-black' : ''}`}>
      <span className={indent ? 'pl-5' : ''}>{label}</span>
      <span className="font-mono tabular-nums">{value === undefined ? '' : m(value)}</span>
    </div>
  );
}

function Head({ children }: { children: ReactNode }) {
  return <div className="font-bold uppercase tracking-wide text-[13px] mt-6 mb-1 border-b border-black pb-1">{children}</div>;
}

function StatementTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mt-10 mb-4 break-before-page first:mt-0 first:break-before-auto">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-xs text-gray-600">{sub}</p>
    </div>
  );
}

export default function AFSDocument({ reports, settings }: { reports: Reports; settings: FinanceSettings }) {
  const is = reports.incomeStatement;
  const bs = reports.balanceSheet;
  const cf = reports.cashFlow;
  const eq = reports.changesInEquity;
  const tax = reports.taxEngine;
  const fmtD = (iso: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const period =
    settings.periodStart && settings.periodEnd
      ? `for the period ${fmtD(settings.periodStart)} to ${fmtD(settings.periodEnd)}`
      : `for the year ended ${settings.financialYearEnd || settings.reportingDate}`;
  const asAt = settings.periodEnd ? fmtD(settings.periodEnd) : settings.financialYearEnd || settings.reportingDate;

  return (
    <div id="afs-print" className="bg-white text-black mx-auto max-w-[800px] p-12 text-sm leading-relaxed shadow-2xl rounded-lg">
      {/* COVER */}
      <div className="text-center py-24 break-after-page">
        <div className="text-3xl font-bold mb-2">{settings.companyName}</div>
        <div className="text-sm text-gray-600 mb-1">{settings.entityType}</div>
        {settings.registrationNumber && <div className="text-xs text-gray-600">Registration No: {settings.registrationNumber}</div>}
        <div className="mt-16 text-2xl font-bold uppercase tracking-wide">Annual Financial Statements</div>
        <div className="text-base mt-2">{period}</div>
        <div className="mt-24 text-xs text-gray-600 space-y-1">
          {settings.businessAddress && <div>{settings.businessAddress}</div>}
          {settings.taxNumber && <div>Income Tax No: {settings.taxNumber}</div>}
          {settings.vatNumber && <div>VAT Registration No: {settings.vatNumber}</div>}
          {settings.preparedBy && <div>Prepared by: {settings.preparedBy}</div>}
          <div className="pt-4">Expressed in Namibian Dollar (N$)</div>
        </div>
      </div>

      {/* STATEMENT OF COMPREHENSIVE INCOME */}
      <StatementTitle title="Statement of Comprehensive Income" sub={period} />
      <L label="Revenue" value={is.salesRevenue + is.serviceRevenue} bold />
      <L label="Cost of sales" value={-is.totalCogs} indent />
      <L label="Gross profit" value={is.grossProfit} bold />
      <L label="Other income" value={is.otherIncome} indent />
      <Head>Operating expenses</Head>
      {is.opex.filter((o: { label: string; value: number }) => o.value !== 0).map((o: { label: string; value: number }) => (
        <Fragment key={o.label}><L label={o.label} value={-o.value} indent /></Fragment>
      ))}
      <L label="Operating profit" value={is.operatingProfit} bold top />
      <L label="Finance costs" value={-is.interestExpense} indent />
      <L label="Profit before taxation" value={is.ebt} bold />
      <L label="Taxation (NAMRA)" value={-is.taxLiability} indent />
      <L label="Profit for the year" value={is.netProfitAfterTax} bold />

      {/* STATEMENT OF FINANCIAL POSITION */}
      <StatementTitle title="Statement of Financial Position" sub={`as at ${asAt}`} />
      <Head>Assets</Head>
      <div className="font-semibold mt-2">Non-current assets</div>
      <L label="Property, plant & equipment" value={bs.ppeCost} indent />
      <L label="Accumulated depreciation" value={bs.accumDep} indent />
      <L label="Total non-current assets" value={bs.totalNonCurrentAssets} bold />
      <div className="font-semibold mt-2">Current assets</div>
      <L label="Inventories" value={bs.inventory} indent />
      <L label="Trade & other receivables" value={bs.accountsReceivable} indent />
      <L label="Prepaid expenses" value={bs.prepaid} indent />
      <L label="Cash & cash equivalents" value={bs.cash} indent />
      <L label="Total current assets" value={bs.totalCurrentAssets} bold />
      <L label="TOTAL ASSETS" value={bs.totalAssets} bold top />

      <Head>Equity & Liabilities</Head>
      <div className="font-semibold mt-2">Equity</div>
      <L label="Members' / Share capital" value={bs.shareCapital} indent />
      <L label="Retained earnings" value={bs.priorRetainedEarnings - bs.dividends + bs.netProfitAfterTax} indent />
      <L label="Total equity" value={bs.totalEquity} bold />
      <div className="font-semibold mt-2">Non-current liabilities</div>
      <L label="Loans payable" value={bs.loansPayable} indent />
      <div className="font-semibold mt-2">Current liabilities</div>
      <L label="Trade & other payables" value={bs.accountsPayable} indent />
      <L label="VAT payable" value={bs.vatPayable} indent />
      <L label="Income tax payable" value={bs.incomeTaxPayable} indent />
      <L label="Accrued liabilities" value={bs.accrued} indent />
      <L label="Total liabilities" value={bs.totalLiabilities} bold />
      <L label="TOTAL EQUITY & LIABILITIES" value={bs.totalLiabilities + bs.totalEquity} bold top />

      {/* STATEMENT OF CHANGES IN EQUITY */}
      <StatementTitle title="Statement of Changes in Equity" sub={period} />
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-right">
        <div className="text-left font-bold border-b border-black pb-1">&nbsp;</div>
        <div className="font-bold border-b border-black pb-1">Capital</div>
        <div className="font-bold border-b border-black pb-1">Retained</div>
        <div className="font-bold border-b border-black pb-1">Total</div>

        <div className="text-left py-1">Balance at beginning</div>
        <div className="font-mono py-1">{m(eq.shareCapitalOpening)}</div>
        <div className="font-mono py-1">{m(eq.retainedOpening)}</div>
        <div className="font-mono py-1">{m(eq.totalOpening)}</div>

        <div className="text-left py-1">Capital introduced</div>
        <div className="font-mono py-1">{m(eq.shareCapitalIssued)}</div>
        <div className="font-mono py-1">{m(0)}</div>
        <div className="font-mono py-1">{m(eq.shareCapitalIssued)}</div>

        <div className="text-left py-1">Profit for the year</div>
        <div className="font-mono py-1">{m(0)}</div>
        <div className="font-mono py-1">{m(eq.profitForYear)}</div>
        <div className="font-mono py-1">{m(eq.profitForYear)}</div>

        <div className="text-left py-1">Dividends / distributions</div>
        <div className="font-mono py-1">{m(0)}</div>
        <div className="font-mono py-1">{m(-eq.dividends)}</div>
        <div className="font-mono py-1">{m(-eq.dividends)}</div>

        <div className="text-left font-bold border-t border-black py-1">Balance at end</div>
        <div className="font-mono font-bold border-t border-black py-1">{m(eq.shareCapitalClosing)}</div>
        <div className="font-mono font-bold border-t border-black py-1">{m(eq.retainedClosing)}</div>
        <div className="font-mono font-bold border-t border-black py-1">{m(eq.totalClosing)}</div>
      </div>

      {/* STATEMENT OF CASH FLOWS */}
      <StatementTitle title="Statement of Cash Flows" sub={period} />
      <Head>Cash flows from operating activities</Head>
      <L label="Profit for the year" value={cf.netProfitAfterTax} indent />
      <L label="Adjustment: depreciation" value={cf.depreciationExpense} indent />
      <L label="Working capital movements" value={cf.workingCapital} indent />
      <L label="Net cash from operating activities" value={cf.netOperating} bold />
      <Head>Cash flows from investing activities</Head>
      <L label="Net cash from investing activities" value={cf.netInvesting} bold />
      <Head>Cash flows from financing activities</Head>
      <L label="Net cash from financing activities" value={cf.netFinancing} bold />
      <L label="Net movement in cash" value={cf.netCashChange} bold top />
      <L label="Cash at beginning of year" value={cf.openingCash} indent />
      <L label="Cash at end of year" value={cf.closingCash} bold />

      {/* NOTES */}
      <StatementTitle title="Notes to the Annual Financial Statements" sub={period} />
      <div className="space-y-3 text-[13px]">
        <div>
          <div className="font-bold">1. Basis of preparation</div>
          <p>The annual financial statements are prepared on the historical cost basis and the going-concern assumption, in Namibian Dollar (N$), in accordance with the accounting policies set out below and the requirements applicable to a {settings.entityType}. Amounts are derived from the entity's accounting records.</p>
        </div>
        <div>
          <div className="font-bold">2. Revenue</div>
          <p>Revenue comprises the value of goods sold, net of Value-Added Tax (VAT) at {(settings.vatRate * 100).toFixed(0)}%. Revenue for the period: N$ {m(is.grossRevenue)}.</p>
        </div>
        <div>
          <div className="font-bold">3. Taxation (NAMRA)</div>
          <p>Income tax is provided at the Namibian corporate rate of {(settings.corporateTaxRate * 100).toFixed(0)}%. Taxable income: N$ {m(tax.taxableIncome)}; income tax: N$ {m(tax.taxLiability)}. Provisional tax payments (P1 40% / P2 60%): N$ {m(tax.provisionalP1)} / N$ {m(tax.provisionalP2)}. Assessed loss carried forward: N$ {m(tax.lossCarriedForward)}.</p>
        </div>
        <div>
          <div className="font-bold">4. Value-Added Tax</div>
          <p>Output VAT: N$ {m(reports.vat.outputVat)}; Input VAT: N$ {m(reports.vat.inputVat)}; net VAT payable/(refundable) to NAMRA: N$ {m(reports.vat.netPayable)}.</p>
        </div>
        <div>
          <div className="font-bold">5. Property, plant & equipment</div>
          <p>Depreciation (wear &amp; tear) is recognised per NAMRA Schedule rates. Cost: N$ {m(bs.ppeCost)}; accumulated depreciation: N$ {m(-bs.accumDep)}; carrying amount: N$ {m(bs.totalNonCurrentAssets)}.</p>
        </div>
      </div>

      <div className="mt-12 pt-4 border-t border-black text-xs text-gray-600">
        These statements were prepared by {settings.preparedBy || 'management'} and have not been independently audited. Approved on ____________________.
      </div>
    </div>
  );
}
