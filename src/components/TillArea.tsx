import React, { useState, useMemo } from 'react';
import { Search, LogOut, X, ShoppingCart, CreditCard, Banknote, Trash2 } from 'lucide-react';
import { Product, CartItem, Customer, Category } from '../types';
import { DUMMY_PRODUCTS, DUMMY_CUSTOMERS } from '../data';

export default function TillArea({ onLogout }: { onLogout: () => void }) {
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [keypadValue, setKeypadValue] = useState('');
  
  // Checkout Modals
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  
  // Recent Sales State
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [showRecentSales, setShowRecentSales] = useState(false);

  const filteredProducts = useMemo(() => {
    return DUMMY_PRODUCTS.filter(p => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

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
    generateReceipt('Cash');
  };

  const processCreditSale = (customer: Customer) => {
    generateReceipt('Credit', customer);
    setShowCustomerSelect(false);
  };

  const generateReceipt = (paymentType: 'Cash' | 'Credit', customer?: Customer) => {
    const newReceipt = {
      id: Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
      date: new Date(),
      operator: 'JD',
      items: [...cart],
      total: cartTotal,
      costTotal: cart.reduce((acc, item) => acc + (item.product.costPrice * item.quantity), 0),
      paymentType,
      customerId: customer?.id,
      customerName: customer?.name,
      syncStatus: 'Pending Sync',
      status: 'Completed'
    };
    setReceipt(newReceipt);
    setRecentSales(prev => [newReceipt, ...prev]);
    setCart([]);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div className="flex items-center gap-4">
           <div className="h-10 w-10 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xs font-bold">
              JD
           </div>
           <div>
             <div className="text-sm font-bold">John Doe</div>
             <div className="text-[10px] text-[#888] uppercase tracking-widest">TILL ROLE</div>
           </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setShowRecentSales(true)} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors cursor-pointer mr-2">
            <span className="text-xs font-bold uppercase tracking-widest">Recent Sales</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            <span className="text-xs font-medium uppercase tracking-wider">Cloud Synced</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Controls */}
          <div className="flex gap-4 mb-6 shrink-0">
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
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
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

        {/* Right: Cart */}
        <div className="w-80 md:w-96 bg-[#111] border-l border-[#262626] flex flex-col shrink-0">
          <div className="p-6 border-b border-[#262626] flex items-center gap-3 shrink-0">
            <ShoppingCart className="w-5 h-5 text-[#888]" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Current Sale</h2>
          </div>
          
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
               {DUMMY_CUSTOMERS.map(cust => (
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
                <h2 className="font-bold text-lg">AGILITY INVESTMENTS CC</h2>
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
             
             <div className="mt-8 text-center text-xs text-gray-500">
               <button onClick={() => window.print()} className="mb-4 px-4 py-2 border border-black rounded hover:bg-gray-100 cursor-pointer">
                 Print Receipt
               </button>
               <div>Thank you for your business!</div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
