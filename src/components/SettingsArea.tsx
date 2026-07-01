import React, { useState } from 'react';
import SyncSettings from './SyncSettings';
import UserManagement from './UserManagement';
import { useData } from '../context/DataContext';
import { BusinessSettings } from '../types';
import { computeStatus } from '../lib/activation';
import { 
  Building2, 
  Users, 
  Cloud, 
  Package, 
  CreditCard, 
  Receipt, 
  Tag, 
  Bell, 
  Info,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
  Check
} from 'lucide-react';

type Tab = 'profile' | 'users' | 'sync' | 'inventory' | 'credit' | 'receipts' | 'expenses' | 'about';

export default function SettingsArea({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { settings, setSettings, activation } = useData();

  // All settings persist to the shared snapshot (localStorage + Supabase per company).
  const update = (patch: Partial<BusinessSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const {
    businessName, businessAddress, businessPhone,
    lowStockThreshold, allowNegativeStock,
    creditLimitBehavior, billingCycle, interest,
    receiptHeader, receiptFooter, receiptPrefix,
    expenseCategories,
  } = settings;

  const [newExpenseCat, setNewExpenseCat] = useState('');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">Business Profile</h3>
              <p className="text-sm text-[#888] mb-6">Update your company's core details used on receipts and reports.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Business Name</label>
                <input 
                  type="text" 
                  value={businessName}
                  onChange={e => update({ businessName: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Physical Address</label>
                <input 
                  type="text" 
                  value={businessAddress}
                  onChange={e => update({ businessAddress: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Phone Number / Contact</label>
                <input 
                  type="text" 
                  value={businessPhone}
                  onChange={e => update({ businessPhone: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#262626]">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Default Currency</label>
                  <input type="text" value="NAD (N$)" disabled className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 px-4 text-sm text-[#555] cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Default Unit</label>
                  <input type="text" value="kg" disabled className="w-full bg-[#151515] border border-[#333] rounded-xl py-3 px-4 text-sm text-[#555] cursor-not-allowed" />
                </div>
              </div>

              <div className="pt-6">
                <button className="bg-[#10B981] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Save className="w-4 h-4" />
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'users':
        return <UserManagement />;

      case 'sync':
        return <SyncSettings />;

      case 'inventory':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">Stock & Inventory Defaults</h3>
              <p className="text-sm text-[#888] mb-6">Configure global settings for inventory management.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Default Low-Stock Threshold</label>
                <input 
                  type="number" 
                  value={lowStockThreshold}
                  onChange={e => update({ lowStockThreshold: Number(e.target.value) })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
                <p className="text-xs text-[#555] mt-2">This value is applied to new items by default.</p>
              </div>
              
              <div className="bg-[#111] border border-[#262626] p-4 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-bold">Allow Negative Stock Sales</div>
                  <div className="text-xs text-[#888] mt-1">If enabled, TILL can sell items even if stock drops below zero.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={allowNegativeStock} onChange={e => update({ allowNegativeStock: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
                </label>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#888] mb-3">Product Categories</h4>
                <div className="bg-[#111] border border-[#262626] rounded-xl p-4 space-y-2">
                  {['Cattle Cuts', 'Manufactured', 'Resale'].map(cat => (
                    <div key={cat} className="flex justify-between items-center bg-[#151515] p-3 rounded-lg border border-[#262626]">
                      <span className="text-sm font-semibold">{cat}</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#555]">System Default</span>
                    </div>
                  ))}
                  <button className="w-full py-3 mt-2 border border-dashed border-[#333] rounded-lg text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white hover:border-[#555] transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-[#262626]">
                <button className="bg-[#10B981] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Save className="w-4 h-4" />
                  Save Defaults
                </button>
              </div>
            </div>
          </div>
        );

      case 'credit':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">Customers & Credit Policy</h3>
              <p className="text-sm text-[#888] mb-6">Configure rules for account customers and credit limits.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Credit Limit Exceeded Behavior</label>
                <select
                  value={creditLimitBehavior}
                  onChange={e => update({ creditLimitBehavior: e.target.value as 'Warn' | 'Block' })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                >
                  <option value="Warn">Warn but allow sale</option>
                  <option value="Block">Block sale completely</option>
                </select>
                <p className="text-xs text-[#555] mt-2">What happens at the TILL when a credit sale exceeds a customer's set limit.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Monthly Billing Cycle Due Date</label>
                <input
                  type="text"
                  value={billingCycle}
                  onChange={e => update({ billingCycle: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]"
                />
              </div>

              {/* Interest on overdue balances */}
              <div className="bg-[#111] border border-[#262626] p-5 rounded-2xl space-y-4">
                <div>
                  <div className="font-bold text-sm">Interest on Overdue Balances</div>
                  <div className="text-xs text-[#888] mt-1">Default charge applied monthly to accounts carrying a balance. Each customer can override this on their profile.</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Interest Type</label>
                    <select
                      value={interest.mode}
                      onChange={e => update({ interest: { ...interest, mode: e.target.value as 'fixed' | 'percent' } })}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed amount (N$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">
                      {interest.mode === 'percent' ? 'Rate (% per month)' : 'Amount (N$ per month)'}
                    </label>
                    <input
                      type="number"
                      value={interest.value}
                      onChange={e => update({ interest: { ...interest, value: Number(e.target.value) } })}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#555]">Set to 0 to disable interest. Run interest each month from Customers → "Apply Monthly Interest".</p>
              </div>

              <div className="pt-2 text-xs text-[#10B981] flex items-center gap-2">
                <Check className="w-4 h-4" /> Changes save automatically.
              </div>
            </div>
          </div>
        );

      case 'receipts':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">Receipt & Invoice Settings</h3>
              <p className="text-sm text-[#888] mb-6">Customize the format of printed receipts and statements.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Receipt Number Prefix</label>
                <input 
                  type="text" 
                  value={receiptPrefix}
                  onChange={e => update({ receiptPrefix: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Receipt Header Text</label>
                <textarea 
                  value={receiptHeader}
                  onChange={e => update({ receiptHeader: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl p-4 text-sm focus:outline-none focus:border-[#555] min-h-[100px] font-mono whitespace-pre-wrap" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Receipt Footer Text</label>
                <textarea 
                  value={receiptFooter}
                  onChange={e => update({ receiptFooter: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-xl p-4 text-sm focus:outline-none focus:border-[#555] min-h-[60px] font-mono" 
                />
              </div>

              <div className="pt-6 border-t border-[#262626]">
                <button className="bg-[#10B981] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Save className="w-4 h-4" />
                  Save Format
                </button>
              </div>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">Expense Categories</h3>
              <p className="text-sm text-[#888] mb-6">Manage the list of categories used for logging business expenses.</p>
            </div>
            
            <div className="bg-[#111] border border-[#262626] rounded-xl p-4 space-y-2">
              {expenseCategories.map(cat => (
                <div key={cat} className="flex justify-between items-center bg-[#151515] p-3 rounded-lg border border-[#262626]">
                  <span className="text-sm font-semibold">{cat}</span>
                  <button onClick={() => update({ expenseCategories: expenseCategories.filter(c => c !== cat) })} className="text-red-500 hover:text-red-400 p-1 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-[#262626]">
                <input 
                  type="text" 
                  value={newExpenseCat}
                  onChange={e => setNewExpenseCat(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#555]"
                />
                <button 
                  onClick={() => {
                    if (newExpenseCat.trim() && !expenseCategories.includes(newExpenseCat.trim())) {
                      update({ expenseCategories: [...expenseCategories, newExpenseCat.trim()] });
                      setNewExpenseCat('');
                    }
                  }}
                  className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">About / App Info</h3>
              <p className="text-sm text-[#888] mb-6">System information and support.</p>
            </div>
            
            <div className="bg-[#111] border border-[#262626] p-6 rounded-2xl space-y-4 text-sm">
              {(() => {
                const lic = computeStatus(activation);
                return (
                  <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                    <span className="text-[#888]">License</span>
                    {lic.activated ? (
                      <span className={`font-mono font-bold ${lic.expired ? 'text-[#D42C2C]' : 'text-[#10B981]'}`}>
                        {lic.expired ? 'Expired' : 'Active'} · {lic.durationDays}d · exp {lic.expiresAt?.toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-[#888]">Not activated</span>
                    )}
                  </div>
                );
              })()}
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="text-[#888]">App Version</span>
                <span className="font-mono font-bold">1.0.0-beta</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="text-[#888]">Business</span>
                <span>{businessName || '—'}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#888]">Support Contact</span>
                <span>{businessPhone || '—'}</span>
              </div>
            </div>
          </div>
        );
      
      default: return null;
    }
  };

  const navItems = [
    { id: 'profile', icon: Building2, label: 'Business Profile' },
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'sync', icon: Cloud, label: 'Sync & Storage' },
    { id: 'inventory', icon: Package, label: 'Stock Defaults' },
    { id: 'credit', icon: CreditCard, label: 'Credit Policy' },
    { id: 'receipts', icon: Receipt, label: 'Receipt Format' },
    { id: 'expenses', icon: Tag, label: 'Expense Categories' },
    { id: 'about', icon: Info, label: 'About / App Info' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans md:overflow-hidden">

      {/* Sidebar — becomes a scrollable top bar on mobile */}
      <div className="w-full md:w-64 bg-[#111] border-b md:border-b-0 md:border-r border-[#262626] flex flex-col shrink-0">
        <div className="p-4 sm:p-6 border-b border-[#262626]">
           <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">{businessName || 'Butchery Control'}</div>
           <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        </div>

        <div className="flex md:flex-col md:flex-1 overflow-x-auto md:overflow-y-auto p-3 md:p-4 gap-1 md:space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === item.id 
                  ? 'bg-[#222] text-white border border-[#333]' 
                  : 'text-[#888] hover:text-[#E4E3E0] hover:bg-[#151515] border border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#262626]">
          <button onClick={onBack} className="w-full flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer py-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:overflow-hidden">
        <div className="flex-1 md:overflow-y-auto p-4 sm:p-8">
          {renderContent()}
        </div>
      </div>

    </div>
  );
}
