import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Check, AlertTriangle, ArrowLeft, Download, RefreshCw, X, Receipt, Trash2, Pencil, Plus } from 'lucide-react';
import { Sale, Product } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import InvoiceActions from './InvoiceActions';
import { formatSaleText, buildSalePdf } from '../lib/invoice';

/** A line being edited: keeps the product snapshot plus an editable unit price + quantity. */
interface EditLine { product: Product; quantity: number; price: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function SalesHistoryArea({ onBack }: { onBack: () => void }) {
  const { sales, setSales, products, setProducts, customers, setCustomers, settings } = useData();
  const { role, canEdit, user } = useAuth();
  const readOnly = !canEdit; // "Till + Viewing" role: view sales but cannot void/refund.
  const isAdmin = role === 'admin'; // Only admins may correct a recorded sale.
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

  // Admin edit state — correct a recorded sale (line items, prices, payment, customer).
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [editPaymentType, setEditPaymentType] = useState<'Cash' | 'Credit'>('Cash');
  const [editCustomerId, setEditCustomerId] = useState<string>('');
  const [editReason, setEditReason] = useState('');
  const [addProductId, setAddProductId] = useState('');
  const [editError, setEditError] = useState('');

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
    const sale = voidingSale;

    // Reverse the sale's effects: return sold stock to inventory…
    setProducts(products.map(p => {
      const returned = sale.items.filter(i => i.product.id === p.id).reduce((s, i) => s + i.quantity, 0);
      return returned ? { ...p, stock: p.stock + returned } : p;
    }));

    // …and, for a credit sale, remove the amount from the customer's outstanding balance.
    if (sale.paymentType === 'Credit' && sale.customerId) {
      setCustomers(customers.map(c => {
        if (c.id !== sale.customerId) return c;
        const balance = Math.max(0, c.balance - sale.total);
        return { ...c, balance, status: balance === 0 ? 'Current' : c.status };
      }));
    }

    setSales(sales.map(s => (s.id === sale.id ? { ...s, status: 'Voided', voidReason: voidReason.trim() } : s)));
    if (selectedSale?.id === sale.id) {
      setSelectedSale({ ...selectedSale, status: 'Voided', voidReason: voidReason.trim() });
    }

    setVoidingSale(null);
    setVoidReason('');
  };

  const openEditor = (sale: Sale) => {
    setEditingSale(sale);
    setEditLines(sale.items.map((i) => ({ product: i.product, quantity: i.quantity, price: i.product.price })));
    setEditPaymentType(sale.paymentType);
    setEditCustomerId(sale.customerId ?? '');
    setEditReason('');
    setEditError('');
    setAddProductId('');
  };

  const editTotal = useMemo(() => round2(editLines.reduce((s, l) => s + l.quantity * l.price, 0)), [editLines]);

  const handleSaveEdit = () => {
    if (!editingSale) return;
    const old = editingSale;
    const lines = editLines.filter((l) => l.quantity > 0);
    if (lines.length === 0) { setEditError('A sale must have at least one line item with a quantity.'); return; }
    if (editPaymentType === 'Credit' && !editCustomerId) { setEditError('Select a customer for a credit sale.'); return; }
    if (!editReason.trim()) { setEditError('Please enter a reason for this correction.'); return; }

    const newItems = lines.map((l) => ({
      product: { ...l.product, price: l.price },
      quantity: l.quantity,
      subtotal: round2(l.quantity * l.price),
      costSubtotal: round2(l.quantity * l.product.costPrice),
    }));
    const newTotal = round2(newItems.reduce((s, i) => s + i.subtotal, 0));
    const newCostTotal = round2(newItems.reduce((s, i) => s + i.costSubtotal, 0));
    const newCustomer = editPaymentType === 'Credit' ? customers.find((c) => c.id === editCustomerId) : undefined;

    // --- Reconcile inventory: return old quantities, deduct new ones (net delta per product) ---
    const qtyDelta = new Map<string, number>(); // productId -> stock change (return old, remove new)
    old.items.forEach((i) => qtyDelta.set(i.product.id, (qtyDelta.get(i.product.id) ?? 0) + i.quantity));
    newItems.forEach((i) => qtyDelta.set(i.product.id, (qtyDelta.get(i.product.id) ?? 0) - i.quantity));
    setProducts(products.map((p) => {
      const d = qtyDelta.get(p.id);
      return d ? { ...p, stock: round2(p.stock + d) } : p;
    }));

    // --- Reconcile customer balances: reverse old credit effect, apply new credit effect ---
    const balDelta = new Map<string, number>();
    if (old.paymentType === 'Credit' && old.customerId) balDelta.set(old.customerId, (balDelta.get(old.customerId) ?? 0) - old.total);
    if (editPaymentType === 'Credit' && newCustomer) balDelta.set(newCustomer.id, (balDelta.get(newCustomer.id) ?? 0) + newTotal);
    if (balDelta.size > 0) {
      setCustomers(customers.map((c) => {
        const d = balDelta.get(c.id);
        if (!d) return c;
        const balance = Math.max(0, round2(c.balance + d));
        return { ...c, balance, status: balance === 0 ? 'Current' : c.status };
      }));
    }

    const edited: Sale = {
      ...old,
      items: newItems,
      total: newTotal,
      costTotal: newCostTotal,
      surcharge: undefined, // recalculated corrections drop any prior surcharge line
      paymentType: editPaymentType,
      customerId: newCustomer?.id,
      customerName: newCustomer?.name,
      syncStatus: 'Pending Sync',
      editedAt: new Date(),
      editedBy: user?.email ?? 'Admin',
      editReason: editReason.trim(),
    };
    setSales(sales.map((s) => (s.id === old.id ? edited : s)));
    setSelectedSale(edited);
    setEditingSale(null);
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
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
           <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">{settings.businessName || 'Butchery Control'}</div>
           <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Sales <span className="text-[#D42C2C]">History</span></h2>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2">
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
      <div className="bg-[#111] border-b border-[#262626] p-4 sm:p-6 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
      <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-6 shrink-0">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 flex-1">
            <div className="flex-1 sm:max-w-sm relative">
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
          
          <button onClick={handleExportCSV} className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#333] transition-colors cursor-pointer w-full lg:w-auto shrink-0">
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
                    {sale.status === 'Completed' && sale.editedAt && <span className="ml-2 text-[10px] bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-widest">Edited</span>}
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
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111] p-4 rounded-xl border border-[#262626]">
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

                {selectedSale.editedAt && (
                  <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/20 p-4 rounded-xl">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#3B82F6] mb-1 flex items-center gap-2">
                      <Pencil className="w-3.5 h-3.5" /> Corrected by admin — {new Date(selectedSale.editedAt).toLocaleString()}
                    </div>
                    <div className="text-sm text-[#c7d7f5]">{selectedSale.editReason}</div>
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

              <div className="p-6 border-t border-[#262626] flex flex-wrap gap-3 justify-between items-center shrink-0 bg-[#111]">
                 <div className="w-full sm:w-72">
                   <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#888] mb-2">
                     <Receipt className="w-3.5 h-3.5" /> Reprint / Send Receipt
                   </div>
                   <InvoiceActions
                     phone={customers.find((c) => c.id === selectedSale.customerId)?.phone}
                     message={formatSaleText(selectedSale, settings)}
                     pdf={() => buildSalePdf(selectedSale, settings)}
                     filename={`receipt-${selectedSale.id}`}
                   />
                 </div>
                 {selectedSale.status === 'Completed' && !readOnly && (
                   <div className="flex flex-wrap gap-3">
                     {isAdmin && (
                       <button
                         onClick={() => openEditor(selectedSale)}
                         className="bg-[#3B82F6]/10 text-[#3B82F6] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#3B82F6] hover:text-white transition-colors cursor-pointer flex items-center gap-2 border border-[#3B82F6]/20"
                       >
                         <Pencil className="w-4 h-4" />
                         Edit / Correct Sale
                       </button>
                     )}
                     <button
                       onClick={() => setVoidingSale(selectedSale)}
                       className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2 border border-red-500/20"
                     >
                       <Trash2 className="w-4 h-4" />
                       Void / Refund Sale
                     </button>
                   </div>
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

      {/* Admin Edit / Correct Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111] shrink-0">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Admin Correction</div>
                <div className="text-2xl font-bold">Edit Receipt #{editingSale.id}</div>
              </div>
              <button onClick={() => setEditingSale(null)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {editError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {editError}
                </div>
              )}

              {/* Payment type + customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Payment Type</label>
                  <select
                    value={editPaymentType}
                    onChange={(e) => setEditPaymentType(e.target.value as 'Cash' | 'Credit')}
                    className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                {editPaymentType === 'Credit' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Customer</label>
                    <select
                      value={editCustomerId}
                      onChange={(e) => setEditCustomerId(e.target.value)}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div className="bg-[#111] border border-[#262626] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-[#888]">Line Items</div>
                {editLines.map((line, idx) => (
                  <div key={idx} className="flex flex-wrap gap-3 items-end bg-[#151515] p-3 rounded-xl border border-[#262626]">
                    <div className="flex-1 min-w-[140px]">
                      <div className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Product</div>
                      <div className="text-sm font-semibold">{line.product.name}</div>
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1">Qty ({line.product.unit})</label>
                      <input
                        type="number"
                        value={line.quantity || ''}
                        onChange={(e) => setEditLines(editLines.map((l, i) => i === idx ? { ...l, quantity: Number(e.target.value) } : l))}
                        className="w-full bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:border-[#555]"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1">Unit Price</label>
                      <input
                        type="number"
                        value={line.price || ''}
                        onChange={(e) => setEditLines(editLines.map((l, i) => i === idx ? { ...l, price: Number(e.target.value) } : l))}
                        className="w-full bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:border-[#555]"
                      />
                    </div>
                    <div className="w-24 text-right">
                      <div className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Subtotal</div>
                      <div className="text-sm font-mono">N$ {round2(line.quantity * line.price).toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => setEditLines(editLines.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-400 p-2 cursor-pointer rounded-lg hover:bg-red-500/10 mb-[2px]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add a line */}
                <div className="flex gap-2 pt-2 border-t border-[#262626]">
                  <select
                    value={addProductId}
                    onChange={(e) => setAddProductId(e.target.value)}
                    className="flex-1 bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                  >
                    <option value="">Add a product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} — N$ {p.price.toFixed(2)}/{p.unit}</option>)}
                  </select>
                  <button
                    onClick={() => {
                      const p = products.find((pr) => pr.id === addProductId);
                      if (!p) return;
                      setEditLines([...editLines, { product: p, quantity: 1, price: p.price }]);
                      setAddProductId('');
                    }}
                    disabled={!addProductId}
                    className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {/* Reason (required) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Reason for Correction *</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Wrong weight entered, price typo…"
                  className="w-full bg-[#222] border border-[#333] rounded-xl p-4 text-sm focus:outline-none focus:border-[#555] min-h-[70px] resize-none"
                />
              </div>

              <p className="text-xs text-[#555]">Saving adjusts stock and, for credit sales, the customer's outstanding balance to match the corrected sale.</p>
            </div>

            <div className="p-6 border-t border-[#262626] flex justify-between items-center shrink-0 bg-[#111]">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-[#888]">New Total</div>
                <div className="text-2xl font-mono font-bold">N$ {editTotal.toFixed(2)}</div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setEditingSale(null)} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="bg-[#3B82F6] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2563EB] transition-colors cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
