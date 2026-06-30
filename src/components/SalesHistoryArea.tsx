import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Check, AlertTriangle, ArrowLeft, Download, RefreshCw, X, Receipt, Trash2 } from 'lucide-react';
import { Sale } from '../types';
import { DUMMY_SALES } from '../data';

export default function SalesHistoryArea({ onBack }: { onBack: () => void }) {
  const [sales, setSales] = useState<Sale[]>(DUMMY_SALES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Cash' | 'Credit'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Voided/Refunded'>('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'This Week' | 'This Month'>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Cattle Cuts' | 'Manufactured' | 'Resale'>('All');

  // Void/Refund state
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    // Get start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return sales.filter(sale => {
      const matchesSearch = 
        sale.id.includes(searchQuery) || 
        sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.items.some(item => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPayment = paymentFilter === 'All' || sale.paymentType === paymentFilter;
      
      const matchesStatus = statusFilter === 'All' 
        ? true 
        : statusFilter === 'Completed' 
          ? sale.status === 'Completed' 
          : (sale.status === 'Voided' || sale.status === 'Refunded');

      const matchesCategory = categoryFilter === 'All' || sale.items.some(item => item.product.category === categoryFilter);

      let matchesDate = true;
      if (dateFilter === 'Today') {
        matchesDate = sale.date.toDateString() === todayStr;
      } else if (dateFilter === 'This Week') {
        matchesDate = sale.date.getTime() >= startOfWeek.getTime();
      } else if (dateFilter === 'This Month') {
        matchesDate = sale.date.getMonth() === now.getMonth() && sale.date.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesPayment && matchesStatus && matchesCategory && matchesDate;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sales, searchQuery, paymentFilter, statusFilter, categoryFilter, dateFilter]);

  const summary = useMemo(() => {
    let totalSales = 0;
    let totalRevenue = 0;
    let totalCash = 0;
    let totalCredit = 0;
    let totalItems = 0;

    filteredSales.forEach(sale => {
      if (sale.status !== 'Completed') return; // Don't count voided/refunded in revenue totals
      totalSales++;
      totalRevenue += sale.total;
      if (sale.paymentType === 'Cash') totalCash += sale.total;
      if (sale.paymentType === 'Credit') totalCredit += sale.total;
      totalItems += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    });

    return { totalSales, totalRevenue, totalCash, totalCredit, totalItems };
  }, [filteredSales]);

  const handleVoidSale = () => {
    if (!voidingSale || !voidReason.trim()) return;

    setSales(sales.map(s => {
      if (s.id === voidingSale.id) {
        return {
          ...s,
          status: 'Voided',
          voidReason: voidReason.trim(),
        };
      }
      return s;
    }));
    
    // Also update selectedSale if it's the same one
    if (selectedSale?.id === voidingSale.id) {
      setSelectedSale({
        ...selectedSale,
        status: 'Voided',
        voidReason: voidReason.trim(),
      });
    }

    setVoidingSale(null);
    setVoidReason('');
  };

  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Date', 'Time', 'Operator', 'Payment Type', 'Customer', 'Items Count', 'Total', 'Status', 'Sync Status'];
    const rows = filteredSales.map(s => [
      s.id,
      s.date.toLocaleDateString(),
      s.date.toLocaleTimeString(),
      s.operator,
      s.paymentType,
      s.customerName || '',
      s.items.length.toString(),
      s.total.toFixed(2),
      s.status,
      s.syncStatus
    ]);
    
    const csvContent = [headers.join(',')]
      .concat(rows.map(row => row.map(cell => `"${cell}"`).join(',')))
      .join('\n');
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
           <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">Agility Investments CC</div>
           <h2 className="text-2xl font-bold tracking-tight">Sales <span className="text-[#D42C2C]">History</span></h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            <span className="text-xs font-medium uppercase tracking-wider">Cloud Synced</span>
          </div>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="bg-[#111] border-b border-[#262626] p-6 shrink-0 grid grid-cols-4 gap-6">
        <div className="flex flex-col bg-[#151515] p-4 rounded-xl border border-[#262626]">
          <span className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Total Revenue</span>
          <span className="text-2xl font-mono">N$ {summary.totalRevenue.toFixed(2)}</span>
        </div>
        <div className="flex flex-col bg-[#151515] p-4 rounded-xl border border-[#262626]">
          <span className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Sales Volume</span>
          <span className="text-2xl font-mono">{summary.totalSales} <span className="text-sm text-[#555]">transactions</span></span>
        </div>
        <div className="flex flex-col bg-[#151515] p-4 rounded-xl border border-[#262626]">
          <span className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Items Sold</span>
          <span className="text-2xl font-mono">{summary.totalItems} <span className="text-sm text-[#555]">units/kg</span></span>
        </div>
        <div className="flex flex-col bg-[#151515] p-4 rounded-xl border border-[#262626]">
          <span className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Cash / Credit</span>
          <div className="flex justify-between items-end">
            <span className="text-lg font-mono text-[#10B981]">N$ {summary.totalCash.toFixed(2)}</span>
            <span className="text-lg font-mono text-[#D42C2C]">N$ {summary.totalCredit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-6">
        
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex gap-4 flex-1">
            <div className="flex-1 max-w-sm relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input 
                type="text"
                placeholder="Search receipt, customer, product..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#151515] border border-[#262626] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#555] transition-colors"
              />
            </div>
            <select 
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none"
            >
              <option value="All">Payment: All</option>
              <option value="Cash">Payment: Cash</option>
              <option value="Credit">Payment: Credit</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none"
            >
              <option value="All">Status: All</option>
              <option value="Completed">Status: Completed</option>
              <option value="Voided/Refunded">Status: Voided/Refunded</option>
            </select>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none"
            >
              <option value="All">Date: All Time</option>
              <option value="Today">Date: Today</option>
              <option value="This Week">Date: This Week</option>
              <option value="This Month">Date: This Month</option>
            </select>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none max-w-[150px]"
            >
              <option value="All">Category: All</option>
              <option value="Cattle Cuts">Category: Cattle Cuts</option>
              <option value="Manufactured">Category: Manufactured</option>
              <option value="Resale">Category: Resale</option>
            </select>
          </div>
          
          <button onClick={handleExportCSV} className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#333] transition-colors cursor-pointer">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-[#151515] border border-[#262626] rounded-2xl">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-[#111] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Receipt #</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Date / Time</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Operator</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Type / Customer</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-center">Items</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Total</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className={`border-b border-[#262626] hover:bg-[#222] transition-colors cursor-pointer group ${sale.status !== 'Completed' ? 'opacity-60' : ''}`}
                >
                  <td className="py-4 px-6 text-sm font-mono">
                    {sale.id}
                    {sale.status !== 'Completed' && <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-sans uppercase font-bold tracking-widest">{sale.status}</span>}
                  </td>
                  <td className="py-4 px-6 text-sm text-[#888]">{sale.date.toLocaleString()}</td>
                  <td className="py-4 px-6 text-xs font-bold uppercase tracking-widest">{sale.operator}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm font-semibold">{sale.paymentType}</div>
                    {sale.customerName && <div className="text-xs text-[#888]">{sale.customerName}</div>}
                  </td>
                  <td className="py-4 px-6 text-sm text-center">{sale.items.length}</td>
                  <td className="py-4 px-6 text-sm font-mono text-right font-bold">N$ {sale.total.toFixed(2)}</td>
                  <td className="py-4 px-6 text-center">
                    {sale.syncStatus === 'Synced' ? (
                      <span className="text-[#10B981] inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest">
                        <Check className="w-3 h-3" /> Synced
                      </span>
                    ) : (
                      <span className="text-yellow-500 inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest">
                        <RefreshCw className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#555]">
                    No sales found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111] shrink-0">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Transaction Details</div>
                   <div className="text-2xl font-bold flex items-center gap-3">
                     Receipt #{selectedSale.id}
                     {selectedSale.status !== 'Completed' && (
                       <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-md uppercase tracking-widest">{selectedSale.status}</span>
                     )}
                   </div>
                 </div>
                 <button onClick={() => setSelectedSale(null)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                <div className="grid grid-cols-4 gap-4 bg-[#111] p-4 rounded-xl border border-[#262626]">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Date</div>
                    <div className="text-sm">{selectedSale.date.toLocaleDateString()}</div>
                    <div className="text-xs text-[#555]">{selectedSale.date.toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Operator</div>
                    <div className="text-sm font-bold">{selectedSale.operator}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Payment</div>
                    <div className="text-sm font-bold">{selectedSale.paymentType}</div>
                    {selectedSale.customerName && <div className="text-xs text-[#555]">{selectedSale.customerName}</div>}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Sync Status</div>
                    <div className={`text-sm font-bold ${selectedSale.syncStatus === 'Synced' ? 'text-[#10B981]' : 'text-yellow-500'}`}>{selectedSale.syncStatus}</div>
                  </div>
                </div>

                {selectedSale.status !== 'Completed' && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <div className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Void / Refund Reason</div>
                    <div className="text-sm text-red-200">{selectedSale.voidReason}</div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#888] mb-3">Line Items</h4>
                  <div className="bg-[#111] border border-[#262626] rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#151515] border-b border-[#262626]">
                        <tr>
                          <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-[#888]">Product</th>
                          <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-[#888] text-right">Qty</th>
                          <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-[#888] text-right">Unit Price</th>
                          <th className="py-3 px-4 text-[10px] uppercase tracking-widest text-[#888] text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-[#262626] last:border-0">
                            <td className="py-3 px-4">
                              <div className="text-sm font-semibold">{item.product.name}</div>
                              <div className="text-[10px] text-[#555] uppercase tracking-widest">{item.product.category}</div>
                            </td>
                            <td className="py-3 px-4 text-sm font-mono text-right">{item.quantity} {item.product.unit}</td>
                            <td className="py-3 px-4 text-sm font-mono text-right">N$ {item.product.price.toFixed(2)}</td>
                            <td className="py-3 px-4 text-sm font-mono text-right">N$ {item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-start bg-[#111] p-4 rounded-xl border border-[#262626]">
                   <div>
                     <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Admin Only Data</div>
                     <div className="text-sm">Cost: <span className="font-mono text-[#555]">N$ {selectedSale.costTotal.toFixed(2)}</span></div>
                     <div className="text-sm">Margin: <span className="font-mono text-[#10B981]">N$ {(selectedSale.total - selectedSale.costTotal).toFixed(2)}</span></div>
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Transaction Total</div>
                     <div className={`text-3xl font-mono tracking-tighter ${selectedSale.status !== 'Completed' ? 'line-through text-[#555]' : ''}`}>
                       N$ {selectedSale.total.toFixed(2)}
                     </div>
                   </div>
                </div>

              </div>

              <div className="p-6 border-t border-[#262626] flex justify-between items-center shrink-0 bg-[#111]">
                 <div className="flex gap-4">
                   <button className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
                     <Receipt className="w-4 h-4" />
                     Reprint Receipt
                   </button>
                 </div>
                 {selectedSale.status === 'Completed' && (
                   <button 
                     onClick={() => setVoidingSale(selectedSale)}
                     className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2 border border-red-500/20"
                   >
                     <Trash2 className="w-4 h-4" />
                     Void / Refund Sale
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidingSale && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#151515] border border-red-500/30 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-[0_0_50px_rgba(220,38,38,0.1)]">
             <div className="p-6 border-b border-[#262626]">
               <div className="flex items-center gap-3 text-red-500 mb-2">
                 <AlertTriangle className="w-6 h-6" />
                 <h3 className="text-xl font-bold">Void / Refund Sale</h3>
               </div>
               <p className="text-sm text-[#888]">
                 You are about to void Receipt #{voidingSale.id}. This action will return stock to inventory and adjust customer balances.
               </p>
             </div>
             <div className="p-6 space-y-4">
               <div>
                 <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Reason for Void/Refund *</label>
                 <textarea 
                   value={voidReason}
                   onChange={e => setVoidReason(e.target.value)}
                   placeholder="e.g., Customer return, Entry error..."
                   className="w-full bg-[#222] border border-[#333] rounded-xl p-4 text-sm focus:outline-none focus:border-red-500/50 min-h-[100px] resize-none"
                 />
               </div>
             </div>
             <div className="p-6 border-t border-[#262626] flex justify-end gap-4 bg-[#111]">
               <button 
                 onClick={() => { setVoidingSale(null); setVoidReason(''); }}
                 className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleVoidSale}
                 disabled={!voidReason.trim()}
                 className="bg-red-500 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Confirm Void
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
