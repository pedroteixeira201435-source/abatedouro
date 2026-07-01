import { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Wallet, CreditCard, Package, Users, Percent, Receipt, Banknote } from 'lucide-react';
import { useData } from '../context/DataContext';

type Range = 'today' | '7d' | '30d' | 'month' | 'all';

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rangeStart(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7d': return new Date(Date.now() - 7 * 86400000);
    case '30d': return new Date(Date.now() - 30 * 86400000);
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all': return null;
  }
}

export default function AnalyticsArea({ onBack }: { onBack: () => void }) {
  const { sales, products, customers, settings } = useData();
  const [range, setRange] = useState<Range>('30d');

  const k = useMemo(() => {
    const start = rangeStart(range);
    const inRange = (d: Date) => !start || d >= start;
    const completed = sales.filter((s) => s.status === 'Completed' && inRange(new Date(s.date)));

    const revenue = completed.reduce((a, s) => a + s.total, 0);
    const cogs = completed.reduce((a, s) => a + s.costTotal, 0);
    const grossProfit = revenue - cogs;
    const cashSales = completed.filter((s) => s.paymentType === 'Cash').reduce((a, s) => a + s.total, 0);
    const creditSales = completed.filter((s) => s.paymentType === 'Credit').reduce((a, s) => a + s.total, 0);
    const count = completed.length;
    const avgSale = count ? revenue / count : 0;

    // Payments received in range (cash collections from accounts).
    const paymentsIn = customers.flatMap((c) => c.payments || []).filter((p) => inRange(new Date(p.date)));
    const paymentsTotal = paymentsIn.reduce((a, p) => a + p.amount, 0);
    const cashCollected = cashSales + paymentsIn.filter((p) => p.method === 'Cash').reduce((a, p) => a + p.amount, 0);

    // Product performance (by revenue + margin) within range.
    const perProduct = new Map<string, { name: string; revenue: number; profit: number; qty: number; unit: string }>();
    completed.forEach((s) => s.items.forEach((i) => {
      const cur = perProduct.get(i.product.id) || { name: i.product.name, revenue: 0, profit: 0, qty: 0, unit: i.product.unit };
      cur.revenue += i.subtotal;
      cur.profit += i.subtotal - i.costSubtotal;
      cur.qty += i.quantity;
      perProduct.set(i.product.id, cur);
    }));
    const byRevenue = [...perProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const byMargin = [...perProduct.values()]
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.profit / b.revenue - a.profit / a.revenue)
      .slice(0, 5);

    // Category split within range.
    const catRevenue: Record<string, number> = { 'Cattle Cuts': 0, Manufactured: 0, Resale: 0 };
    completed.forEach((s) => s.items.forEach((i) => { catRevenue[i.product.category] = (catRevenue[i.product.category] || 0) + i.subtotal; }));
    const catTotal = Math.max(1, ...Object.values(catRevenue));

    // Debtors + aging (bucket each customer's balance by the age of their oldest open credit sale).
    const debtors = customers.reduce((a, c) => a + c.balance, 0);
    const accountsOwing = customers.filter((c) => c.balance > 0).length;
    const aging = { '0-30': 0, '31-60': 0, '60+': 0 };
    customers.filter((c) => c.balance > 0).forEach((c) => {
      const creditSalesForC = sales
        .filter((s) => s.customerId === c.id && s.paymentType === 'Credit' && s.status !== 'Voided')
        .map((s) => new Date(s.date).getTime());
      const oldest = creditSalesForC.length ? Math.min(...creditSalesForC) : Date.now();
      const days = (Date.now() - oldest) / 86400000;
      if (days <= 30) aging['0-30'] += c.balance;
      else if (days <= 60) aging['31-60'] += c.balance;
      else aging['60+'] += c.balance;
    });

    // Inventory snapshot (not range-bound).
    const stockValue = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
    const stockRetail = products.reduce((a, p) => a + p.stock * p.price, 0);
    const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold).length;

    return {
      revenue, cogs, grossProfit, margin: revenue ? (grossProfit / revenue) * 100 : 0,
      cashSales, creditSales, count, avgSale, paymentsTotal, cashCollected,
      byRevenue, byMargin, catRevenue, catTotal, debtors, accountsOwing, aging,
      stockValue, stockRetail, lowStock,
    };
  }, [sales, products, customers, range]);

  const Card = ({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: string }) => (
    <div className="bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <span className="text-[11px] uppercase tracking-widest text-[#888]">{label}</span>
        <Icon className={`w-4 h-4 ${accent || 'text-[#555]'}`} />
      </div>
      <div className="mt-4">
        <div className={`text-2xl font-mono tracking-tight ${accent || ''}`}>{value}</div>
        {sub && <div className="text-[10px] text-[#555] mt-1">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">{settings.businessName || 'Butchery Control'}</div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Business <span className="text-[#10B981]">Analytics</span></h2>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex gap-1 bg-[#111] border border-[#262626] p-1 rounded-xl overflow-x-auto max-w-full">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer whitespace-nowrap shrink-0 ${range === r.id ? 'bg-[#222] text-white' : 'text-[#888] hover:text-white'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Headline KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card icon={TrendingUp} label="Revenue" value={`N$ ${fmt(k.revenue)}`} sub={`${k.count} sales • avg N$ ${fmt(k.avgSale)}`} />
          <Card icon={Percent} label="Gross Profit" value={`N$ ${fmt(k.grossProfit)}`} sub={`${k.margin.toFixed(1)}% margin`} accent="text-[#10B981]" />
          <Card icon={DollarSign} label="COGS" value={`N$ ${fmt(k.cogs)}`} sub="Cost of goods sold" />
          <Card icon={Wallet} label="Cash Collected" value={`N$ ${fmt(k.cashCollected)}`} sub="Cash sales + cash payments" accent="text-[#10B981]" />
          <Card icon={Banknote} label="Cash Sales" value={`N$ ${fmt(k.cashSales)}`} />
          <Card icon={CreditCard} label="Credit Sales" value={`N$ ${fmt(k.creditSales)}`} />
          <Card icon={Receipt} label="Payments In" value={`N$ ${fmt(k.paymentsTotal)}`} sub="Account settlements" />
          <Card icon={Users} label="Debtors" value={`N$ ${fmt(k.debtors)}`} sub={`${k.accountsOwing} accounts owing`} accent={k.debtors > 0 ? 'text-[#D42C2C]' : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top products by revenue */}
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-[#888] mb-4">Top Products — Revenue</h3>
            {k.byRevenue.length === 0 ? <div className="text-sm text-[#555] italic">No sales in this period.</div> : (
              <div className="space-y-3">
                {k.byRevenue.map((p) => (
                  <div key={p.name} className="flex justify-between items-center border-b border-[#222] pb-2 last:border-0">
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-[10px] text-[#555]">{p.qty.toFixed(2)}{p.unit} sold</div>
                    </div>
                    <div className="text-sm font-mono">N$ {fmt(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top products by margin */}
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-[#888] mb-4">Top Products — Margin</h3>
            {k.byMargin.length === 0 ? <div className="text-sm text-[#555] italic">No sales in this period.</div> : (
              <div className="space-y-3">
                {k.byMargin.map((p) => (
                  <div key={p.name} className="flex justify-between items-center border-b border-[#222] pb-2 last:border-0">
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-sm font-mono text-[#10B981]">{((p.profit / p.revenue) * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category split */}
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-[#888] mb-4">Revenue by Category</h3>
            <div className="space-y-4">
              {(['Cattle Cuts', 'Manufactured', 'Resale'] as const).map((cat) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#888]">{cat}</span>
                    <span className="font-mono">N$ {fmt(k.catRevenue[cat] || 0)}</span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full">
                    <div className="h-full bg-[#D42C2C] rounded-full" style={{ width: `${Math.round(((k.catRevenue[cat] || 0) / k.catTotal) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debtor aging */}
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-[#888] mb-4">Debtor Aging</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['0-30', '31-60', '60+'] as const).map((b) => (
                <div key={b} className="bg-[#111] border border-[#262626] rounded-xl p-4 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-[#888] mb-2">{b} days</div>
                  <div className={`text-lg font-mono ${b === '60+' && k.aging[b] > 0 ? 'text-[#D42C2C]' : ''}`}>N$ {fmt(k.aging[b])}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card icon={Package} label="Stock Value (Cost)" value={`N$ ${fmt(k.stockValue)}`} sub="Capital tied in inventory" />
          <Card icon={Package} label="Stock Value (Retail)" value={`N$ ${fmt(k.stockRetail)}`} sub="Potential sell-through" />
          <Card icon={Package} label="Low-Stock Items" value={`${k.lowStock}`} sub="At or below threshold" accent={k.lowStock > 0 ? 'text-yellow-500' : undefined} />
        </div>
      </div>
    </div>
  );
}
