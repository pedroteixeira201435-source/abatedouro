import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';

type Tab = 'profile' | 'users' | 'sync' | 'inventory' | 'credit' | 'receipts' | 'expenses' | 'about';

export default function SettingsArea({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Dummy State for Settings
  const [businessName, setBusinessName] = useState('Agility Investments CC');
  const [businessAddress, setBusinessAddress] = useState('123 Main St, Windhoek');
  const [businessPhone, setBusinessPhone] = useState('081 123 4567');
  
  const [users, setUsers] = useState([
    { id: '1', email: 'admin@agility.com', name: 'System Admin', role: 'ADMIN', status: 'Active', lastLogin: '2026-06-30 08:00' },
    { id: '2', email: 'till1@agility.com', name: 'Front Desk 1', role: 'TILL', status: 'Active', lastLogin: '2026-06-30 07:30' },
  ]);

  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  const [creditLimitBehavior, setCreditLimitBehavior] = useState<'Warn' | 'Block'>('Warn');
  const [billingCycle, setBillingCycle] = useState('Last day of the month');

  const [receiptHeader, setReceiptHeader] = useState('Agility Investments CC\n123 Main St, Windhoek\n081 123 4567');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your business!');
  const [receiptPrefix, setReceiptPrefix] = useState('AG-');

  const [expenseCategories, setExpenseCategories] = useState([
    'Staff Wages', 'Cold Room/Utilities', 'Packaging', 'Processing Costs'
  ]);
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
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Physical Address</label>
                <input 
                  type="text" 
                  value={businessAddress} 
                  onChange={e => setBusinessAddress(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Phone Number / Contact</label>
                <input 
                  type="text" 
                  value={businessPhone} 
                  onChange={e => setBusinessPhone(e.target.value)}
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
        return (
          <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-lg font-bold mb-2">User & Role Management</h3>
                <p className="text-sm text-[#888]">Manage staff access and permissions.</p>
              </div>
              <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2563EB] transition-colors cursor-pointer flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New User
              </button>
            </div>
            
            <div className="bg-[#111] border border-[#262626] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#151515] border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888]">User</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888]">Role</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888]">Status</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888]">Last Login</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-[#262626] last:border-0">
                      <td className="py-3 px-4">
                        <div className="font-bold">{u.name}</div>
                        <div className="text-xs text-[#888]">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'bg-[#888]/20 text-[#CCC]'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#10B981]">{u.status}</td>
                      <td className="py-3 px-4 text-sm text-[#888]">{u.lastLogin}</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-xs text-[#3B82F6] hover:text-white uppercase font-bold tracking-widest mr-4 cursor-pointer">Edit</button>
                        <button className="text-xs text-red-500 hover:text-red-400 uppercase font-bold tracking-widest cursor-pointer">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 text-yellow-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <strong>Offline Warning:</strong> Adding or removing users requires an active internet connection to authorize Google accounts.
              </div>
            </div>
          </div>
        );
      
      case 'sync':
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4">Sync & Storage</h3>
              <p className="text-sm text-[#888] mb-6">Manage data synchronization with Google Drive.</p>
            </div>
            
            <div className="bg-[#111] border border-[#262626] p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-1">Connected Account</div>
                  <div className="font-semibold">admin@agility.com</div>
                </div>
                <button className="text-xs font-bold uppercase tracking-widest text-[#3B82F6] hover:text-white transition-colors cursor-pointer border border-[#3B82F6]/30 px-3 py-1.5 rounded-lg">
                  Reconnect
                </button>
              </div>
              
              <div className="pt-4 border-t border-[#262626] flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-1">Sync Status</div>
                  <div className="flex items-center gap-2 text-[#10B981] font-semibold">
                    <Check className="w-4 h-4" />
                    All data synced
                  </div>
                  <div className="text-xs text-[#555] mt-1">Last sync: 2 mins ago</div>
                </div>
                <button className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Force Sync Now
                </button>
              </div>
              
              <div className="pt-4 border-t border-[#262626]">
                <button className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Data Backup (JSON)
                </button>
              </div>
            </div>
          </div>
        );

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
                  onChange={e => setLowStockThreshold(Number(e.target.value))}
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
                  <input type="checkbox" checked={allowNegativeStock} onChange={e => setAllowNegativeStock(e.target.checked)} className="sr-only peer" />
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
                  onChange={e => setCreditLimitBehavior(e.target.value as 'Warn' | 'Block')}
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
                  onChange={e => setBillingCycle(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                />
              </div>

              <div className="pt-6 border-t border-[#262626]">
                <button className="bg-[#10B981] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Save className="w-4 h-4" />
                  Save Policies
                </button>
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
                  onChange={e => setReceiptPrefix(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Receipt Header Text</label>
                <textarea 
                  value={receiptHeader} 
                  onChange={e => setReceiptHeader(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl p-4 text-sm focus:outline-none focus:border-[#555] min-h-[100px] font-mono whitespace-pre-wrap" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Receipt Footer Text</label>
                <textarea 
                  value={receiptFooter} 
                  onChange={e => setReceiptFooter(e.target.value)}
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
                  <button onClick={() => setExpenseCategories(expenseCategories.filter(c => c !== cat))} className="text-red-500 hover:text-red-400 p-1 cursor-pointer">
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
                      setExpenseCategories([...expenseCategories, newExpenseCat.trim()]);
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
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="text-[#888]">App Version</span>
                <span className="font-mono font-bold">1.0.0-beta</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="text-[#888]">Last Update</span>
                <span>June 30, 2026</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="text-[#888]">Developer</span>
                <span>AI Studio Built</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[#888]">Support Email</span>
                <span className="text-[#3B82F6]">support@agilityinvestments.com</span>
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
    <div className="flex h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 bg-[#111] border-r border-[#262626] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#262626]">
           <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">Agility Investments CC</div>
           <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </div>
      </div>

    </div>
  );
}
