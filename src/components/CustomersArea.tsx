import React, { useState, useMemo } from 'react';
import { Search, Check, AlertTriangle, ArrowLeft, X, UserPlus, Phone, Mail, MapPin, Receipt, Wallet, Banknote, Trash2, Percent } from 'lucide-react';
import { Customer, Sale, Payment, InterestCharge } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { effectiveInterest, computeInterest, currentMonthKey, interestLabel } from '../lib/credit';
import { formatStatementText, buildStatementPdf } from '../lib/invoice';
import InvoiceActions from './InvoiceActions';

export default function CustomersArea({ onBack }: { onBack: () => void }) {
  const { customers, setCustomers, sales, settings } = useData();
  const { user } = useAuth();
  const operator = user?.email ?? 'Local';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'lastPurchase'>('name');
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Add Customer State
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    creditLimit: undefined
  });
  const [newCustomerError, setNewCustomerError] = useState('');

  // Payment State
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{amount: number; method: 'Cash' | 'Bank Transfer' | 'Other'; note: string}>({
    amount: 0,
    method: 'Bank Transfer',
    note: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             c.phone.includes(searchQuery) ||
             (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'balance') return b.balance - a.balance;
      if (sortBy === 'lastPurchase') {
        const dateA = a.lastPurchaseDate ? a.lastPurchaseDate.getTime() : 0;
        const dateB = b.lastPurchaseDate ? b.lastPurchaseDate.getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
  }, [customers, searchQuery, sortBy]);

  const customerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales.filter(s => s.customerId === selectedCustomer.id && s.paymentType === 'Credit' && s.status !== 'Voided');
  }, [selectedCustomer, sales]);

  const handleSaveCustomer = () => {
    if (!newCustomerData.name?.trim() || !newCustomerData.phone?.trim()) {
      setNewCustomerError('Name and phone number are required.');
      return;
    }
    
    if (customers.some(c => c.name.toLowerCase() === newCustomerData.name?.toLowerCase().trim() || c.phone === newCustomerData.phone)) {
      setNewCustomerError('A customer with this name or phone number already exists.');
      return;
    }

    const newCustomer: Customer = {
      id: Math.random().toString(),
      name: newCustomerData.name!.trim(),
      phone: newCustomerData.phone!.trim(),
      email: newCustomerData.email,
      address: newCustomerData.address,
      notes: newCustomerData.notes,
      creditLimit: newCustomerData.creditLimit ? Number(newCustomerData.creditLimit) : undefined,
      balance: 0,
      status: 'Current',
      payments: []
    };

    setCustomers([newCustomer, ...customers]);
    setIsAddingCustomer(false);
    setNewCustomerData({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: undefined });
    setNewCustomerError('');
  };

  const handleRecordPayment = () => {
    if (!selectedCustomer || paymentData.amount <= 0) return;

    const newPayment: Payment = {
      id: Math.random().toString(),
      date: new Date(),
      amount: paymentData.amount,
      method: paymentData.method,
      operator,
      note: paymentData.note,
      syncStatus: 'Pending Sync'
    };

    const updatedCustomer = {
      ...selectedCustomer,
      balance: Math.max(0, selectedCustomer.balance - paymentData.amount),
      payments: [newPayment, ...selectedCustomer.payments]
    };
    
    // Update if balance drops to 0, status is current
    if (updatedCustomer.balance === 0) {
      updatedCustomer.status = 'Current';
    }

    setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setSelectedCustomer(updatedCustomer);
    setIsRecordingPayment(false);
    setPaymentData({ amount: 0, method: 'Bank Transfer', note: '' });
  };

  const handleDeleteCustomer = () => {
    if (!selectedCustomer || selectedCustomer.balance > 0) return;
    setCustomers(customers.filter(c => c.id !== selectedCustomer.id));
    setSelectedCustomer(null);
  };

  const updateCustomer = (id: string, patch: Partial<Customer>) => {
    setCustomers(customers.map(c => (c.id === id ? { ...c, ...patch } : c)));
    setSelectedCustomer(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  // Post one month's interest to every account carrying a balance (guarded against double runs).
  const applyMonthlyInterest = () => {
    const month = currentMonthKey();
    const targets = customers.filter(c => c.balance > 0 && c.lastInterestRun !== month);
    if (targets.length === 0) {
      alert('No accounts are due interest this month (all already charged or zero balance).');
      return;
    }
    let total = 0;
    let charged = 0;
    const updated = customers.map(c => {
      if (c.balance <= 0 || c.lastInterestRun === month) return c;
      const amount = computeInterest(c.balance, effectiveInterest(c, settings));
      if (amount <= 0) return { ...c, lastInterestRun: month };
      total += amount;
      charged++;
      const charge: InterestCharge = {
        id: Math.random().toString(),
        date: new Date(),
        amount,
        balanceAt: c.balance,
        note: `Monthly interest (${interestLabel(effectiveInterest(c, settings))})`,
      };
      return {
        ...c,
        balance: c.balance + amount,
        charges: [charge, ...(c.charges || [])],
        lastInterestRun: month,
        status: c.creditLimit && c.balance + amount > c.creditLimit ? 'Overdue' as const : c.status,
      };
    });
    setCustomers(updated);
    alert(charged === 0
      ? 'Interest is set to 0 — nothing charged. Configure it in Settings → Credit.'
      : `Applied N$ ${total.toFixed(2)} interest across ${charged} account(s) for ${month}.`);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
           <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">{settings.businessName || 'Butchery Control'}</div>
           <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Customer <span className="text-[#3B82F6]">Accounts</span></h2>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-6 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex-1 sm:max-w-sm relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input 
                type="text"
                placeholder="Search customers by name, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#151515] border border-[#262626] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#555] transition-colors"
              />
            </div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer appearance-none"
            >
              <option value="name">Sort: Name</option>
              <option value="balance">Sort: Balance (High-Low)</option>
              <option value="lastPurchase">Sort: Recent Purchase</option>
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={applyMonthlyInterest}
              className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#333] transition-colors cursor-pointer"
              title="Charge this month's interest to all accounts with a balance"
            >
              <Percent className="w-4 h-4" />
              Apply Monthly Interest
            </button>
            <button
              onClick={() => setIsAddingCustomer(true)}
              className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#2563EB] transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add New Customer
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-[#151515] border border-[#262626] rounded-2xl">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-[#111] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Customer</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Contact</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Outstanding Balance</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className="border-b border-[#262626] hover:bg-[#222] transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-6">
                    <div className="text-sm font-bold">{customer.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-[#E4E3E0]">{customer.phone}</div>
                    {customer.email && <div className="text-[10px] text-[#888]">{customer.email}</div>}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className={`text-lg font-mono font-bold ${customer.balance > 0 ? 'text-white' : 'text-[#555]'}`}>
                      N$ {customer.balance.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {customer.balance > 0 ? (
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${customer.status === 'Overdue' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                        {customer.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        Clear
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-sm text-[#888]">
                    {customer.lastPurchaseDate ? customer.lastPurchaseDate.toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#555]">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add Customer Modal */}
      {isAddingCustomer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111]">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Customer Management</div>
                   <div className="text-2xl font-bold">Add New Customer</div>
                 </div>
                 <button onClick={() => setIsAddingCustomer(false)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {newCustomerError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {newCustomerError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Customer Name *</label>
                    <input 
                      type="text" 
                      value={newCustomerData.name} 
                      onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Phone Number *</label>
                    <input 
                      type="text" 
                      value={newCustomerData.phone} 
                      onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Email Address</label>
                    <input 
                      type="email" 
                      value={newCustomerData.email} 
                      onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Credit Limit (N$)</label>
                    <input 
                      type="number" 
                      value={newCustomerData.creditLimit || ''} 
                      onChange={e => setNewCustomerData({...newCustomerData, creditLimit: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Optional limit"
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Physical Address</label>
                  <input 
                    type="text" 
                    value={newCustomerData.address} 
                    onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})}
                    className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Notes</label>
                  <textarea 
                    value={newCustomerData.notes} 
                    onChange={e => setNewCustomerData({...newCustomerData, notes: e.target.value})}
                    className="w-full bg-[#222] border border-[#333] rounded-xl p-4 text-sm focus:outline-none focus:border-[#555] min-h-[80px] resize-none" 
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#262626] flex justify-end gap-4 bg-[#111]">
                 <button onClick={() => setIsAddingCustomer(false)} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                   Cancel
                 </button>
                 <button onClick={handleSaveCustomer} className="bg-[#3B82F6] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2563EB] transition-colors cursor-pointer">
                   Save Customer
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && !isRecordingPayment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111] shrink-0">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Account Overview</div>
                   <div className="text-2xl font-bold">{selectedCustomer.name}</div>
                 </div>
                 <button onClick={() => setSelectedCustomer(null)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
                {/* Left Column: Summary */}
                <div className="w-full md:w-1/3 bg-[#111] border-b md:border-b-0 md:border-r border-[#262626] p-6 flex flex-col justify-between md:overflow-y-auto">
                  <div className="space-y-6">
                    <div className="bg-[#151515] p-5 rounded-2xl border border-[#262626] text-center">
                      <div className="text-[10px] uppercase tracking-widest text-[#888] mb-2">Outstanding Balance</div>
                      <div className={`text-4xl font-mono font-bold tracking-tighter ${selectedCustomer.status === 'Overdue' ? 'text-red-500' : 'text-white'}`}>
                        N$ {selectedCustomer.balance.toFixed(2)}
                      </div>
                      {selectedCustomer.creditLimit && (
                        <div className="text-xs text-[#555] mt-2">
                          Limit: N$ {selectedCustomer.creditLimit.toFixed(2)}
                        </div>
                      )}
                      
                      <button
                        onClick={() => setIsRecordingPayment(true)}
                        disabled={selectedCustomer.balance === 0}
                        className="mt-6 w-full bg-[#10B981] text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Record Payment
                      </button>
                    </div>

                    {/* Interest policy for this account */}
                    <div className="bg-[#151515] p-4 rounded-2xl border border-[#262626]">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#888] mb-3">
                        <Percent className="w-3.5 h-3.5" /> Monthly Interest
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={selectedCustomer.interest ? selectedCustomer.interest.mode : 'default'}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next = v === 'default' ? undefined : { mode: v as 'fixed' | 'percent', value: selectedCustomer.interest?.value ?? 0 };
                            updateCustomer(selectedCustomer.id, { interest: next });
                          }}
                          className="flex-1 bg-[#222] border border-[#333] rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                        >
                          <option value="default">Use default ({interestLabel(settings.interest)})</option>
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed (N$)</option>
                        </select>
                        {selectedCustomer.interest && (
                          <input
                            type="number"
                            value={selectedCustomer.interest.value}
                            onChange={(e) => updateCustomer(selectedCustomer.id, { interest: { mode: selectedCustomer.interest!.mode, value: Number(e.target.value) } })}
                            className="w-20 bg-[#222] border border-[#333] rounded-lg py-2 px-2 text-xs font-mono focus:outline-none focus:border-[#555]"
                          />
                        )}
                      </div>
                    </div>

                    {/* Send account statement */}
                    <div className="bg-[#151515] p-4 rounded-2xl border border-[#262626]">
                      <div className="text-[10px] uppercase tracking-widest text-[#888] mb-3">Send Statement</div>
                      <InvoiceActions
                        phone={selectedCustomer.phone}
                        message={formatStatementText(selectedCustomer, sales, settings)}
                        pdf={() => buildStatementPdf(selectedCustomer, sales, settings)}
                        filename={`statement-${selectedCustomer.name.replace(/\s+/g, '-')}`}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3 text-sm">
                        <Phone className="w-4 h-4 text-[#555] mt-0.5" />
                        <span className="text-[#E4E3E0]">{selectedCustomer.phone}</span>
                      </div>
                      {selectedCustomer.email && (
                        <div className="flex items-start gap-3 text-sm">
                          <Mail className="w-4 h-4 text-[#555] mt-0.5" />
                          <span className="text-[#E4E3E0]">{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-4 h-4 text-[#555] mt-0.5" />
                          <span className="text-[#E4E3E0]">{selectedCustomer.address}</span>
                        </div>
                      )}
                    </div>

                    {selectedCustomer.notes && (
                      <div className="bg-[#151515] p-4 rounded-xl border border-[#262626]">
                        <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Notes</div>
                        <p className="text-sm text-[#AAA]">{selectedCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedCustomer.balance === 0 && (
                    <button onClick={handleDeleteCustomer} className="mt-8 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 flex items-center gap-2 justify-center py-2">
                      <Trash2 className="w-4 h-4" />
                      Deactivate Account
                    </button>
                  )}
                </div>

                {/* Right Column: History */}
                <div className="flex-1 flex flex-col">
                  {/* Tabs could go here in future */}
                  <div className="p-6 md:overflow-y-auto md:flex-1 space-y-8">
                    
                    {/* Unpaid/Recent Purchases */}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#555]" />
                        Credit Purchases (History)
                      </h3>
                      {customerSales.length === 0 ? (
                        <div className="text-sm text-[#555] italic">No credit purchases recorded.</div>
                      ) : (
                        <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111]">
                          <table className="w-full text-left">
                            <thead className="bg-[#151515] border-b border-[#262626]">
                              <tr>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Date</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Receipt #</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888] text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customerSales.map(sale => (
                                <tr key={sale.id} className="border-b border-[#262626] last:border-0">
                                  <td className="py-3 px-4 text-sm text-[#888]">{sale.date.toLocaleDateString()}</td>
                                  <td className="py-3 px-4 text-sm font-mono">{sale.id}</td>
                                  <td className="py-3 px-4 text-sm font-mono font-bold text-right">N$ {sale.total.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Interest charges */}
                    {selectedCustomer.charges && selectedCustomer.charges.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Percent className="w-4 h-4 text-[#555]" />
                          Interest Charges
                        </h3>
                        <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111]">
                          <table className="w-full text-left">
                            <thead className="bg-[#151515] border-b border-[#262626]">
                              <tr>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Date</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Note</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888] text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCustomer.charges.map(ch => (
                                <tr key={ch.id} className="border-b border-[#262626] last:border-0">
                                  <td className="py-3 px-4 text-sm text-[#888]">{new Date(ch.date).toLocaleDateString()}</td>
                                  <td className="py-3 px-4 text-sm text-[#555] truncate max-w-[180px]">{ch.note}</td>
                                  <td className="py-3 px-4 text-sm font-mono font-bold text-yellow-500 text-right">+ N$ {ch.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Payments */}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-[#555]" />
                        Payment History
                      </h3>
                      {selectedCustomer.payments.length === 0 ? (
                        <div className="text-sm text-[#555] italic">No payments recorded.</div>
                      ) : (
                        <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111]">
                          <table className="w-full text-left">
                            <thead className="bg-[#151515] border-b border-[#262626]">
                              <tr>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Date</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Method</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888]">Note</th>
                                <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-[#888] text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCustomer.payments.map(payment => (
                                <tr key={payment.id} className="border-b border-[#262626] last:border-0">
                                  <td className="py-3 px-4 text-sm text-[#888]">{payment.date.toLocaleDateString()}</td>
                                  <td className="py-3 px-4 text-sm">{payment.method}</td>
                                  <td className="py-3 px-4 text-sm text-[#555] truncate max-w-[150px]">{payment.note}</td>
                                  <td className="py-3 px-4 text-sm font-mono font-bold text-[#10B981] text-right">
                                    - N$ {payment.amount.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isRecordingPayment && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#111]">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Record Payment</div>
                   <div className="text-xl font-bold">{selectedCustomer.name}</div>
                 </div>
                 <button onClick={() => setIsRecordingPayment(false)} className="text-[#555] hover:text-white cursor-pointer">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-[#111] p-4 rounded-xl border border-[#262626] flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#888]">Current Balance</span>
                  <span className="text-xl font-mono font-bold text-red-500">N$ {selectedCustomer.balance.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Payment Amount (N$) *</label>
                  <input 
                    type="number" 
                    value={paymentData.amount || ''}
                    onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                    className="w-full bg-[#222] border border-[#333] rounded-xl py-4 px-4 text-xl font-mono font-bold focus:outline-none focus:border-[#10B981] text-white" 
                    placeholder="0.00"
                  />
                  <div className="mt-2 text-right">
                    <button 
                      onClick={() => setPaymentData({...paymentData, amount: selectedCustomer.balance})}
                      className="text-[10px] uppercase font-bold tracking-widest text-[#10B981] hover:text-[#059669] cursor-pointer"
                    >
                      Pay Full Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Payment Method *</label>
                  <select 
                    value={paymentData.method}
                    onChange={e => setPaymentData({...paymentData, method: e.target.value as any})}
                    className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (EFT)</option>
                    <option value="Other">Other / Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Note / Reference (Optional)</label>
                  <input 
                    type="text" 
                    value={paymentData.note}
                    onChange={e => setPaymentData({...paymentData, note: e.target.value})}
                    className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    placeholder="e.g., EFT Ref: #12345"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#262626] flex justify-end gap-4 bg-[#111]">
                 <button onClick={() => setIsRecordingPayment(false)} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                   Cancel
                 </button>
                 <button 
                   onClick={handleRecordPayment}
                   disabled={paymentData.amount <= 0 || paymentData.amount > selectedCustomer.balance}
                   className="bg-[#10B981] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                 >
                   Confirm Payment
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
