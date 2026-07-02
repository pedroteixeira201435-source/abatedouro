import React, { useState, useMemo } from 'react';
import { Search, LogOut, X, ShoppingCart, CreditCard, Banknote, Trash2, AlertTriangle } from 'lucide-react';
import { Product, CartItem, Customer, Category, Sale } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import InvoiceActions from './InvoiceActions';
import { formatSaleText, buildSalePdf } from '../lib/invoice';
import { creditSurcharge, interestLabel } from '../lib/credit';

export default function TillArea({ onLogout }: { onLogout: () => void }) {
  const { products, customers, settings, recordSale } = useData();
  const { user, role } = useAuth();
  const operator = user?.email ?? 'Local';
  const initials = (user?.email ?? 'OP').slice(0, 2).toUpperCase();
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [keypadValue, setKeypadValue] = useState('');
  
  // Checkout Modals
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  // Fast reconfirmation before finalising a sale (guards cash↔credit mistakes; no password).
  const [pendingSale, setPendingSale] = useState<{ paymentType: 'Cash' | 'Credit'; customer?: Customer } | null>(null);
  
  // Recent Sales State
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [showRecentSales, setShowRecentSales] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  // Extra charged when paying on credit instead of cash (Settings → Credit → Credit Surcharge).
  const creditExtra = creditSurcharge(cartTotal, settings);
  const creditGrandTotal = cartTotal + creditExtra;

  const handleKeypadSubmit = () => {
    if (!selectedProduct) return;
    const qty = parseFloat(keypadValue);
    if (isNaN(qty) || qty <= 0) {
      setSelectedProduct(null);
      setKeypadValue('');
      return;
    }
    
    if (qty > selectedProduct.stock) {
      alert(`Warning: Requested quantity (${qty}) exceeds available stock (${selectedProduct.stock}).`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === selectedProduct.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      const newQty = newCart[existingIndex].quantity + qty;
      if (newQty > selectedProduct.stock) {
          alert(`Warning: Total requested quantity (${newQty}) exceeds available stock (${selectedProduct.stock}).`);
          return;
      }
      newCart[existingIndex].quantity = newQty;
      newCart[existingIndex].subtotal = newQty * selectedProduct.price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product: selectedProduct,
        quantity: qty,
        subtotal: qty * selectedProduct.price
      }]);
    }
    setSelectedProduct(null);
    setKeypadValue('');
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const processCashSale = () => {
    if (cart.length === 0) return;
    setPendingSale({ paymentType: 'Cash' });
  };

  const processCreditSale = (customer: Customer) => {
    // Enforce the credit-limit policy configured in Settings → Credit (surcharge counts toward the limit).
    if (customer.creditLimit && customer.balance + creditGrandTotal > customer.creditLimit && settings.creditLimitBehavior === 'Block') {
      alert(`Credit limit exceeded for ${customer.name}. Limit: N$ ${customer.creditLimit.toFixed(2)}. Sale blocked (see Settings → Credit).`);
      return;
    }
    setShowCustomerSelect(false);
    setPendingSale({ paymentType: 'Credit', customer });
  };

  const confirmPendingSale = () => {
    if (!pendingSale) return;
    generateReceipt(pendingSale.paymentType, pendingSale.customer);
    setPendingSale(null);
  };

  const generateReceipt = (paymentType: 'Cash' | 'Credit', customer?: Customer) => {
    const surcharge = paymentType === 'Credit' ? creditExtra : 0;
    const newReceipt: Sale = {
      id: settings.receiptPrefix + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
      date: new Date(),
      operator,
      items: cart.map(item => ({
        product: item.product,
        quantity: item.quantity,
        subtotal: item.subtotal,
        costSubtotal: item.product.costPrice * item.quantity,
      })),
      total: cartTotal + surcharge,
      surcharge: surcharge > 0 ? surcharge : undefined,
      costTotal: cart.reduce((acc, item) => acc + (item.product.costPrice * item.quantity), 0),
      paymentType,
      customerId: customer?.id,
      customerName: customer?.name,
      syncStatus: 'Pending Sync',
      status: 'Completed',
    };
    setReceipt(newReceipt);
    setRecentSales(prev => [newReceipt, ...prev]);
    recordSale(newReceipt); // persists the sale, decrements stock, updates credit balance
    setCart([]);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div className="flex items-center gap-4">
           <div className="h-10 w-10 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xs font-bold">
              {initials}
           </div>
           <div>
             <div className="text-sm font-bold truncate max-w-[160px]">{user?.email ?? 'Local Mode'}</div>
             <div className="text-[10px] text-[#888] uppercase tracking-widest">{(role ?? 'till').replace('_', ' ')} Role</div>
           </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={() => setShowRecentSales(true)} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors cursor-pointer">
            <span className="text-xs font-bold uppercase tracking-widest">Recent Sales</span>
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            <span className="text-xs font-medium uppercase tracking-wider">Cloud Synced</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content — stacks on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 md:overflow-hidden">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 shrink-0">
             <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#151515] border border-[#262626] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[#555] transition-colors"
                />
             </div>
             <div className="flex gap-2 bg-[#151515] p-1 rounded-xl border border-[#262626] overflow-x-auto">
               {['All', 'Cattle Cuts', 'Manufactured', 'Resale'].map(cat => (
                 <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap cursor-pointer ${activeCategory === cat ? 'bg-[#222] text-white' : 'text-[#888] hover:text-white'}`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
          </div>

          {/* Product Grid */}
          <div className="md:flex-1 md:overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-6 md:pb-20">
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-[#151515] border border-[#262626] rounded-2xl p-4 flex flex-col cursor-pointer hover:border-[#444] transition-colors active:scale-95 select-none"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] uppercase tracking-widest text-[#888]">{product.category}</span>
                  {product.stock <= product.lowStockThreshold && (
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded-md whitespace-nowrap ml-2">
                      Low Stock
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold mb-1">{product.name}</div>
                <div className="text-xl font-mono text-[#D42C2C] mb-4">
                  N$ {product.price.toFixed(2)}<span className="text-xs text-[#888]">/{product.unit}</span>
                </div>
                <div className="mt-auto text-xs text-[#555] font-mono">
                  Stock: {product.stock} {product.unit}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart — full width below products on mobile */}
        <div className="w-full md:w-80 lg:w-96 bg-[#111] border-t md:border-t-0 md:border-l border-[#262626] flex flex-col shrink-0 md:h-full">
          <div className="p-6 border-b border-[#262626] flex items-center gap-3 shrink-0">
            <ShoppingCart className="w-5 h-5 text-[#888]" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Current Sale</h2>
          </div>
          
          {/* Cart Items */}
          <div className="md:flex-1 md:overflow-y-auto p-4 space-y-3">
             {cart.length === 0 ? (
               <div className="text-center text-[#555] text-sm mt-10">Cart is empty</div>
             ) : (
               cart.map((item, idx) => (
                 <div key={idx} className="bg-[#151515] border border-[#262626] rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                       <div className="text-sm font-semibold pr-2">{item.product.name}</div>
                       <button onClick={() => removeFromCart(idx)} className="text-[#555] hover:text-[#D42C2C] shrink-0 cursor-pointer">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="flex justify-between items-end">
                       <div className="text-xs text-[#888] font-mono">
                         {item.quantity} {item.product.unit} x {item.product.price.toFixed(2)}
                       </div>
                       <div className="text-sm font-mono">
                         N$ {item.subtotal.toFixed(2)}
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>

          {/* Totals & Checkout */}
          <div className="p-6 bg-[#151515] border-t border-[#262626] shrink-0">
            <div className="flex justify-between items-end mb-6">
              <span className="text-xs uppercase tracking-widest text-[#888]">Total</span>
              <span className="text-4xl font-mono tracking-tighter">N$ {cartTotal.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={processCashSale}
                disabled={cart.length === 0}
                className="bg-[#10B981] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                Cash
              </button>
              <button 
                onClick={() => setShowCustomerSelect(true)}
                disabled={cart.length === 0}
                className="bg-[#222] border border-[#333] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Credit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keypad Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Enter Quantity</div>
                   <div className="text-lg font-semibold">{selectedProduct.name}</div>
                   <div className="text-sm text-[#D42C2C] font-mono mt-1">N$ {selectedProduct.price.toFixed(2)} / {selectedProduct.unit}</div>
                 </div>
                 <button onClick={() => { setSelectedProduct(null); setKeypadValue(''); }} className="text-[#555] hover:text-white cursor-pointer">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-6 text-center">
                 <div className="text-5xl font-mono mb-6 min-h-[60px] border-b border-[#333] pb-4 flex items-center justify-center gap-2">
                   {keypadValue || '0'} <span className="text-xl text-[#555]">{selectedProduct.unit}</span>
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   {['7','8','9','4','5','6','1','2','3','.','0','DEL'].map(btn => (
                     <button 
                        key={btn}
                        onClick={() => {
                          if (btn === 'DEL') setKeypadValue(prev => prev.slice(0, -1));
                          else if (btn === '.' && keypadValue.includes('.')) return;
                          else setKeypadValue(prev => prev + btn);
                        }}
                        className="bg-[#222] py-4 rounded-xl text-xl font-mono hover:bg-[#333] active:bg-[#444] transition-colors cursor-pointer select-none"
                     >
                       {btn}
                     </button>
                   ))}
                 </div>
                 <button 
                    onClick={handleKeypadSubmit}
                    className="w-full mt-4 bg-[#D42C2C] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#B91C1C] transition-colors cursor-pointer select-none"
                 >
                   Add to Cart
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Customer Select Modal for Credit Sale */}
      {showCustomerSelect && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-[#262626] flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold uppercase tracking-widest">Select Customer</h2>
              <button onClick={() => setShowCustomerSelect(false)} className="text-[#555] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
               {customers.map(cust => (
                 <div 
                   key={cust.id} 
                   onClick={() => processCreditSale(cust)}
                   className="bg-[#222] border border-[#333] rounded-xl p-4 flex justify-between items-center cursor-pointer hover:border-[#555] transition-colors"
                 >
                   <span className="font-semibold">{cust.name}</span>
                   <span className="text-xs font-mono text-[#888]">Balance: N$ {cust.balance.toFixed(2)}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Sales Modal */}
      {showRecentSales && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-[#262626] flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold uppercase tracking-widest">Recent Sales (This Shift)</h2>
              <button onClick={() => setShowRecentSales(false)} className="text-[#555] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
               {recentSales.length === 0 ? (
                 <div className="text-center text-[#555] text-sm py-10">No recent sales in this session.</div>
               ) : (
                 recentSales.map((sale) => (
                   <div 
                     key={sale.id} 
                     className="bg-[#222] border border-[#333] rounded-xl p-4 flex justify-between items-center"
                   >
                     <div>
                       <div className="font-semibold mb-1">Receipt #{sale.id}</div>
                       <div className="text-xs text-[#888]">
                         {sale.date.toLocaleTimeString()} - {sale.paymentType} 
                         {sale.paymentType === 'Credit' && ` (${sale.customerName})`}
                       </div>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="font-mono text-lg font-bold">N$ {sale.total.toFixed(2)}</span>
                       <button 
                         onClick={() => { setShowRecentSales(false); setReceipt(sale); }}
                         className="bg-[#333] text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-[#444] transition-colors cursor-pointer"
                       >
                         Reprint
                       </button>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black w-full max-w-sm rounded-xl p-6 font-mono text-sm relative">
             <button onClick={() => setReceipt(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
             </button>
             <div className="text-center mb-6">
                {settings.logo && (
                  <img src={settings.logo} alt="Logo" className="h-16 mx-auto mb-3 object-contain" />
                )}
                <h2 className="font-bold text-lg">{settings.businessName || 'Butchery Control'}</h2>
                <div className="text-xs text-gray-500">Butchery Control</div>
                <div className="text-xs text-gray-500 mt-2">Receipt #{receipt.id}</div>
                <div className="text-xs text-gray-500">{receipt.date.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Operator: {receipt.operator}</div>
             </div>
             
             <div className="border-t border-b border-dashed border-gray-400 py-3 mb-4 space-y-2 max-h-64 overflow-y-auto">
               {receipt.items.map((item: any, idx: number) => (
                 <div key={idx} className="flex flex-col">
                   <div className="flex justify-between">
                     <span className="font-semibold">{item.product.name}</span>
                     <span>{item.subtotal.toFixed(2)}</span>
                   </div>
                   <div className="text-xs text-gray-500">
                     {item.quantity} {item.product.unit} @ {item.product.price.toFixed(2)}
                   </div>
                 </div>
               ))}
             </div>
             
             {receipt.surcharge ? (
               <>
                 <div className="flex justify-between text-xs text-gray-600">
                   <span>Subtotal</span>
                   <span>N$ {(receipt.total - receipt.surcharge).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-xs text-gray-600 mb-2">
                   <span>Credit surcharge</span>
                   <span>+ N$ {receipt.surcharge.toFixed(2)}</span>
                 </div>
               </>
             ) : null}
             <div className="flex justify-between font-bold text-lg mb-2">
               <span>TOTAL</span>
               <span>N$ {receipt.total.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-xs">
               <span>Payment Type:</span>
               <span>{receipt.paymentType}</span>
             </div>
             {receipt.paymentType === 'Credit' && receipt.customerName && (
               <div className="flex justify-between text-xs mt-1">
                 <span>Account:</span>
                 <span>{receipt.customerName}</span>
               </div>
             )}
             
             <div className="mt-8">
               <InvoiceActions
                 phone={customers.find((c) => c.id === receipt.customerId)?.phone}
                 message={formatSaleText(receipt, settings)}
                 pdf={() => buildSalePdf(receipt, settings)}
                 filename={`receipt-${receipt.id}`}
               />
               <div className="mt-4 text-center text-xs text-gray-500">{settings.receiptFooter}</div>
             </div>
          </div>
        </div>
      )}

      {/* Reconfirmation Modal — quick, no password, colour-coded by payment type */}
      {pendingSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className={`p-6 text-center ${pendingSale.paymentType === 'Cash' ? 'bg-[#10B981]/10' : 'bg-yellow-500/10'}`}>
              <div className="text-[11px] uppercase tracking-widest text-[#888] mb-2">Confirm Sale</div>
              <div className={`text-3xl font-black uppercase tracking-tight ${pendingSale.paymentType === 'Cash' ? 'text-[#10B981]' : 'text-yellow-500'}`}>
                {pendingSale.paymentType === 'Cash' ? 'Cash' : 'Credit'}
              </div>
              {pendingSale.paymentType === 'Credit' && pendingSale.customer && (
                <div className="text-sm font-semibold text-[#E4E3E0] mt-1">{pendingSale.customer.name}</div>
              )}
              {pendingSale.paymentType === 'Credit' && creditExtra > 0 && (
                <div className="text-[11px] text-[#888] mt-3 space-y-0.5">
                  <div>Subtotal: N$ {cartTotal.toFixed(2)}</div>
                  <div className="text-yellow-500">Credit surcharge ({interestLabel(settings.creditSurcharge)}): + N$ {creditExtra.toFixed(2)}</div>
                </div>
              )}
              <div className="text-5xl font-mono tracking-tighter mt-4">
                N$ {(pendingSale.paymentType === 'Credit' ? creditGrandTotal : cartTotal).toFixed(2)}
              </div>
              {pendingSale.paymentType === 'Credit' && pendingSale.customer?.creditLimit &&
                pendingSale.customer.balance + creditGrandTotal > pendingSale.customer.creditLimit && (
                  <div className="mt-3 text-[11px] font-bold uppercase tracking-widest text-red-500 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Over credit limit
                  </div>
                )}
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPendingSale(null)}
                className="py-4 rounded-xl font-bold uppercase tracking-widest text-xs bg-[#222] border border-[#333] text-white hover:bg-[#333] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmPendingSale}
                className={`py-4 rounded-xl font-bold uppercase tracking-widest text-xs text-white transition-colors cursor-pointer ${pendingSale.paymentType === 'Cash' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              >
                Confirm {pendingSale.paymentType}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
