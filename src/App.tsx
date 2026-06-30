/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PlusCircle } from "lucide-react";
import TillArea from './components/TillArea';
import InventoryArea from './components/InventoryArea';
import SalesHistoryArea from './components/SalesHistoryArea';
import CustomersArea from './components/CustomersArea';
import SettingsArea from './components/SettingsArea';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'till' | 'inventory' | 'sales_history' | 'customers' | 'settings'>('dashboard');

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

  return (
    <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="flex flex-col h-[768px] w-full max-w-[1024px] bg-[#0C0C0C] text-[#E4E3E0] overflow-hidden p-6 rounded-3xl border border-[#262626] shadow-2xl">
        {/* Header Section */}
        <header className="flex justify-between items-end mb-6 shrink-0">
          <div>
            <h1 className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">
              Agility Investments CC
            </h1>
            <h2 className="text-3xl font-bold tracking-tight">
              Butchery <span className="text-[#D42C2C]">Control</span>
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
                <span className="text-xs font-medium uppercase tracking-wider">
                  Cloud Synced
                </span>
              </div>
              <span className="text-[10px] text-[#555] font-mono">
                Last Update: 14:02:11 GMT+2
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xs font-bold">
              JD
            </div>
          </div>
        </header>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-4 grid-rows-3 gap-4 flex-grow min-h-0">
          {/* Primary KPI: Sales */}
          <div className="col-span-3 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] uppercase tracking-widest text-[#888]">
                Daily Revenue
              </span>
              <span className="px-2 py-1 bg-[#D42C2C]/10 text-[#D42C2C] text-[10px] font-bold rounded-md">
                +12.4%
              </span>
            </div>
            <div>
              <div className="text-5xl font-mono font-medium tracking-tighter">
                N$ 14,290.50
              </div>
              <div className="text-[11px] text-[#555] mt-2">
                Cash: N$ 8,100.00 • Credit: N$ 6,190.50
              </div>
            </div>
          </div>

          {/* Sync Health */}
          <div className="col-span-1 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#888]">
              Google Drive Storage
            </span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-mono">82%</span>
              <div className="w-full h-1.5 bg-[#222] rounded-full mb-2">
                <div
                  className="bg-[#10B981] h-full rounded-full"
                  style={{ width: "82%" }}
                ></div>
              </div>
            </div>
            <span className="text-[10px] text-[#555]">
              12.4MB / 100MB App Data
            </span>
          </div>

          {/* Low Stock Inventory */}
          <div className="col-span-1 row-span-2 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col">
            <span className="text-[11px] uppercase tracking-widest text-[#888] mb-4">
              Stock Alerts
            </span>
            <div className="space-y-4 overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <div>
                  <div className="text-xs font-semibold">Beef Rump</div>
                  <div className="text-[10px] text-[#555]">Cattle Cuts</div>
                </div>
                <div className="text-xs font-mono text-[#D42C2C]">4.2kg</div>
              </div>
              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <div>
                  <div className="text-xs font-semibold">
                    Boerewors (Traditional)
                  </div>
                  <div className="text-[10px] text-[#555]">Manufactured</div>
                </div>
                <div className="text-xs font-mono text-[#D42C2C]">12kg</div>
              </div>
              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <div>
                  <div className="text-xs font-semibold">Chicken Whole</div>
                  <div className="text-[10px] text-[#555]">Resale</div>
                </div>
                <div className="text-xs font-mono">34u</div>
              </div>
              <div className="flex justify-between items-center opacity-40">
                <div>
                  <div className="text-xs font-semibold">Pork Ribs</div>
                  <div className="text-[10px] text-[#555]">Manakwa</div>
                </div>
                <div className="text-xs font-mono">68kg</div>
              </div>
            </div>
            <button className="mt-auto text-[10px] uppercase font-bold text-[#888] tracking-widest text-center py-2 border border-[#333] rounded hover:bg-[#222] cursor-pointer transition-colors">
              View All Inventory
            </button>
          </div>

          {/* Category Performance */}
          <div className="col-span-2 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-6 grid grid-cols-3 gap-6">
            <div className="flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-tighter text-[#888]">
                Cattle Cuts
              </span>
              <span className="text-xl font-mono">N$ 8,120</span>
              <div className="h-1 bg-[#D42C2C] w-[70%] rounded-full"></div>
            </div>
            <div className="flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-tighter text-[#888]">
                Manufactured
              </span>
              <span className="text-xl font-mono">N$ 4,050</span>
              <div className="h-1 bg-[#D42C2C] w-[45%] rounded-full"></div>
            </div>
            <div className="flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-tighter text-[#888]">
                Resale Goods
              </span>
              <span className="text-xl font-mono">N$ 2,120</span>
              <div className="h-1 bg-[#D42C2C] w-[20%] rounded-full"></div>
            </div>
          </div>

          {/* Outstanding Credit */}
          <div className="col-span-1 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#888]">
              Credit Exposure
            </span>
            <div className="mt-auto">
              <div className="text-3xl font-mono">N$ 45,902</div>
              <div className="text-[10px] text-[#555] mt-1 italic tracking-wide">
                Across 12 accounts
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
              <div className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-[#222]">
                <span className="text-xs font-semibold">Windhoek Estates</span>
                <span className="text-xs font-mono text-[#D42C2C]">
                  N$ 12,400
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-[#222]">
                <span className="text-xs font-semibold">Safari Lodge CC</span>
                <span className="text-xs font-mono text-[#D42C2C]">N$ 8,210</span>
              </div>
            </div>
          </div>

          {/* Fixed Expenses */}
          <div className="col-span-1 row-span-1 bg-[#151515] border border-[#262626] rounded-2xl p-5 flex flex-col">
            <span className="text-[11px] uppercase tracking-widest text-[#888] mb-auto">
              Fixed Overhead
            </span>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] font-mono text-[#555]">Wages</span>
              <span className="text-xs font-mono">N$ 18k</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-mono text-[#555]">Cold Room</span>
              <span className="text-xs font-mono">N$ 4.2k</span>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="flex justify-center mt-6 shrink-0">
          <div className="flex gap-1 bg-[#151515] border border-[#262626] p-1 rounded-xl items-center">
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
            <button className="px-4 py-2 text-[#888] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors">
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
