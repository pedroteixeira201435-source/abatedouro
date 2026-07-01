/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { PlusCircle } from "lucide-react";
import TillArea from './components/TillArea';
import InventoryArea from './components/InventoryArea';
import SalesHistoryArea from './components/SalesHistoryArea';
import CustomersArea from './components/CustomersArea';
import SettingsArea from './components/SettingsArea';
import ReportsArea from './components/ReportsArea';
import AnalyticsArea from './components/AnalyticsArea';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen';
import ActivationScreen from './components/ActivationScreen';
import { useData } from './context/DataContext';
import { useAuth } from './context/AuthContext';
import { computeStatus } from './lib/activation';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'till' | 'inventory' | 'sales_history' | 'customers' | 'settings' | 'reports' | 'analytics'>('dashboard');
  const { products, sales, customers, settings, activation, hydrated, syncStatus, lastSyncAt } = useData();
  const { configured, loading, session, user, role, needsOnboarding, signOut } = useAuth();
  const businessName = settings.businessName || 'Butchery Control';
  const userInitials = (user?.email ?? 'OP').slice(0, 2).toUpperCase();

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const todays = sales.filter((s) => s.status === 'Completed' && s.date.toDateString() === today);
    const cash = todays.filter((s) => s.paymentType === 'Cash').reduce((a, s) => a + s.total, 0);
    const credit = todays.filter((s) => s.paymentType === 'Credit').reduce((a, s) => a + s.total, 0);
    const revenue = cash + credit;
    const grossProfit = todays.reduce((a, s) => a + (s.total - s.costTotal), 0);
    const yRevenue = sales
      .filter((s) => s.status === 'Completed' && s.date.toDateString() === yesterday)
      .reduce((a, s) => a + s.total, 0);
    const growth = yRevenue > 0 ? ((revenue - yRevenue) / yRevenue) * 100 : null;
    // Revenue by product category, today.
    const catRevenue: Record<string, number> = { 'Cattle Cuts': 0, Manufactured: 0, Resale: 0 };
    todays.forEach((s) => s.items.forEach((i) => { catRevenue[i.product.category] = (catRevenue[i.product.category] || 0) + i.subtotal; }));
    const catMax = Math.max(1, ...Object.values(catRevenue));
    const creditExposure = customers.reduce((a, c) => a + c.balance, 0);
    const accountsOwing = customers.filter((c) => c.balance > 0).length;
    const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold).slice(0, 4);
    const topAccounts = [...customers].filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 2);
    return { revenue, cash, credit, grossProfit, growth, catRevenue, catMax, creditExposure, accountsOwing, lowStock, topAccounts };
  }, [products, sales, customers]);

  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---- Auth gating (active only once Supabase credentials are configured) ----
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center text-[#888]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (configured && !session) {
    return <LoginScreen />;
  }
  // Signed in but not attached to a company yet → create or join one.
  if (needsOnboarding) {
    return <OnboardingScreen />;
  }
  // License activation gate — per-company, synced via Supabase. Wait for the company snapshot
  // before deciding, so an already-activated business never sees a false prompt on a new device.
  if (configured && !hydrated) {
    return (
      <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center text-[#888]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  const activationStatus = computeStatus(activation);
  if (!activationStatus.activated || activationStatus.expired) {
    return <ActivationScreen onActivated={() => undefined} onSignOut={configured ? signOut : undefined} />;
  }
  // Till operators only ever see the Open Till screen.
  if (role === 'till') {
    return <TillArea onLogout={signOut} />;
  }
  // Stock managers only ever see Inventory, restricted to add + restock.
  if (role === 'stock_manager') {
    return <InventoryArea onBack={signOut} backLabel="Log Out" canEditProducts={false} />;
  }

  if (view === 'till') {
    return <TillArea onLogout={() => setView('dashboard')} />;
  }

  if (view === 'inventory') {
    return <InventoryArea onBack={() => setView('dashboard')} />;
  }

  if (view === 'sales_history') {
    return <SalesHistoryArea onBack={() => setView('dashboard')} />;
  }

  if (view === 'customers') {
    return <CustomersArea onBack={() => setView('dashboard')} />;
  }

  if (view === 'settings') {
    return <SettingsArea onBack={() => setView('dashboard')} />;
  }

  if (view === 'reports') {
    return <ReportsArea onBack={() => setView('dashboard')} />;
  }

  if (view === 'analytics') {
    return <AnalyticsArea onBack={() => setView('dashboard')} />;
  }

  return (
    <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center p-0 sm:p-6 font-sans">
      <div className="flex flex-col min-h-screen md:min-h-0 md:h-[768px] w-full max-w-[1024px] bg-[#0C0C0C] text-[#E4E3E0] overflow-y-auto md:overflow-hidden p-4 sm:p-6 rounded-none sm:rounded-3xl border-0 sm:border border-[#262626] shadow-2xl">
        {/* Header Section */}
        <header className="flex flex-wrap gap-4 justify-between items-end mb-6 shrink-0">
          <div>
            <h1 className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">
              {businessName}
            </h1>
            <h2 className="text-3xl font-bold tracking-tight">
              Butchery <span className="text-[#D42C2C]">Control</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            {(() => {
              const dot = syncStatus === 'synced' ? '#10B981' : syncStatus === 'error' ? '#D42C2C' : syncStatus === 'local' ? '#888' : '#EAB308';
              const label = syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'saving' ? 'Saving…' : syncStatus === 'loading' ? 'Loading…' : syncStatus === 'error' ? 'Sync Error' : 'Local Only';
              return (
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot, boxShadow: `0 0 8px ${dot}` }}></span>
                    <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-[10px] text-[#555] font-mono">
                    {lastSyncAt ? `Last sync: ${lastSyncAt.toLocaleTimeString()}` : 'Not synced yet'}
                  </span>
                </div>
              );
            })()}
            <div className="h-10 w-10 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xs font-bold" title={user?.email ?? 'Local Mode'}>
              {userInitials}
            </div>
          </div>
        </header>

        {/* Main Bento Grid — stacks on mobile, bento on md+ */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-4 md:grid-rows-3 md:flex-grow min-h-0">
          {/* Primary KPI: Sales */}
          <div className="col-span-3 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] uppercase tracking-widest text-[#888]">
                Daily Revenue
              </span>
              {stats.growth !== null && (
                <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${stats.growth >= 0 ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#D42C2C]/10 text-[#D42C2C]'}`}>
                  {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                </span>
              )}
            </div>
            <div>
              <div className="text-5xl font-mono font-medium tracking-tighter">
                N$ {fmt(stats.revenue)}
              </div>
              <div className="text-[11px] text-[#555] mt-2">
                Cash: N$ {fmt(stats.cash)} • Credit: N$ {fmt(stats.credit)}
              </div>
            </div>
          </div>

          {/* Cash taken today (cash-heavy business) */}
          <div className="col-span-1 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#888]">
              Cash Today
            </span>
            <div className="mt-auto">
              <div className="text-3xl font-mono text-[#10B981]">N$ {fmt(stats.cash)}</div>
              <div className="text-[10px] text-[#555] mt-1">
                {stats.revenue > 0 ? `${((stats.cash / stats.revenue) * 100).toFixed(0)}% of today's sales` : 'No sales yet today'}
              </div>
            </div>
          </div>

          {/* Low Stock Inventory */}
          <div className="col-span-1 row-span-2 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col">
            <span className="text-[11px] uppercase tracking-widest text-[#888] mb-4">
              Stock Alerts
            </span>
            <div className="space-y-4 overflow-hidden">
              {stats.lowStock.length === 0 && (
                <div className="text-xs text-[#555] italic">No low-stock items.</div>
              )}
              {stats.lowStock.map((p) => (
                <div key={p.id} className="flex justify-between items-center border-b border-[#222] pb-2">
                  <div>
                    <div className="text-xs font-semibold">{p.name}</div>
                    <div className="text-[10px] text-[#555]">{p.category}</div>
                  </div>
                  <div className="text-xs font-mono text-[#D42C2C]">{p.stock}{p.unit}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('inventory')} className="mt-auto text-[10px] uppercase font-bold text-[#888] tracking-widest text-center py-2 border border-[#333] rounded hover:bg-[#222] cursor-pointer transition-colors">
              View All Inventory
            </button>
          </div>

          {/* Category Performance (today, real) */}
          <div className="col-span-2 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-6 grid grid-cols-3 gap-6">
            {(['Cattle Cuts', 'Manufactured', 'Resale'] as const).map((cat) => (
              <div key={cat} className="flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-tighter text-[#888]">{cat}</span>
                <span className="text-xl font-mono">N$ {fmt(stats.catRevenue[cat] || 0)}</span>
                <div className="h-1 bg-[#D42C2C] rounded-full" style={{ width: `${Math.round(((stats.catRevenue[cat] || 0) / stats.catMax) * 100)}%` }}></div>
              </div>
            ))}
          </div>

          {/* Outstanding Credit */}
          <div className="col-span-1 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#888]">
              Credit Exposure
            </span>
            <div className="mt-auto">
              <div className="text-3xl font-mono">N$ {fmt(stats.creditExposure)}</div>
              <div className="text-[10px] text-[#555] mt-1 italic tracking-wide">
                Across {stats.accountsOwing} accounts
              </div>
            </div>
          </div>

          {/* Customer Watchlist */}
          <div className="col-span-2 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] uppercase tracking-widest text-[#888]">
                High-Balance Accounts
              </span>
              <span className="text-[10px] text-[#555]">
                Monthly Statements Due
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.topAccounts.length === 0 && (
                <div className="text-xs text-[#555] italic col-span-2">No outstanding balances.</div>
              )}
              {stats.topAccounts.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-[#222]">
                  <span className="text-xs font-semibold truncate pr-2">{c.name}</span>
                  <span className="text-xs font-mono text-[#D42C2C]">N$ {fmt(c.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gross Profit today (real) */}
          <div className="col-span-1 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#888]">
              Gross Profit Today
            </span>
            <div className="mt-auto">
              <div className="text-3xl font-mono">N$ {fmt(stats.grossProfit)}</div>
              <div className="text-[10px] text-[#555] mt-1">
                {stats.revenue > 0 ? `${((stats.grossProfit / stats.revenue) * 100).toFixed(0)}% margin` : 'No sales yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Bar — scrolls horizontally on mobile */}
        <nav className="flex justify-start sm:justify-center mt-6 shrink-0 overflow-x-auto">
          <div className="flex gap-1 bg-[#151515] border border-[#262626] p-1 rounded-xl items-center shrink-0 [&>button]:whitespace-nowrap">
            <button 
              onClick={() => setView('till')}
              className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[#059669] transition-colors mr-2"
            >
              <PlusCircle className="w-4 h-4" />
              Open Till
            </button>
            <button 
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-[#D42C2C] text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[#B91C1C] transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('inventory')}
              className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Inventory
            </button>
            <button 
              onClick={() => setView('sales_history')}
              className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Sales History
            </button>
            <button 
              onClick={() => setView('customers')}
              className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Customers
            </button>
            <button
              onClick={() => setView('analytics')}
              className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Analytics
            </button>
            <button
              onClick={() => setView('reports')}
              className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Reports
            </button>
            <button 
              onClick={() => setView('settings')}
              className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Settings
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
