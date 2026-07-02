import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, ArrowUpDown, Clock, Check, AlertTriangle, ChevronDown, PackagePlus, ArrowRightLeft, X } from 'lucide-react';
import { Product, Category, Purchase, PurchaseItem } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface InventoryAreaProps {
  onBack: () => void;
  backLabel?: string;
  /** When false (stock manager), existing items can only be restocked — not edited or removed. */
  canEditProducts?: boolean;
}

export default function InventoryArea({ onBack, backLabel = 'Back to Dashboard', canEditProducts = true }: InventoryAreaProps) {
  const { products, setProducts, purchases, setPurchases, settings } = useData();
  const { user, canEdit } = useAuth();
  const readOnly = !canEdit; // "Till + Viewing" role: view stock but change nothing.
  const operator = user?.email ?? 'Local';
  const businessName = settings.businessName || 'Butchery Control';
  const [activeTab, setActiveTab] = useState<'list' | 'purchases' | 'activity'>('list');
  // Stock-manager restock flow (add-only quantity).
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category'>('name');

  // Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleRestock = () => {
    if (!selectedProduct || restockAmount <= 0) return;
    setProducts(products.map(p => (p.id === selectedProduct.id ? { ...p, stock: p.stock + restockAmount } : p)));
    setSelectedProduct(null);
    setRestockAmount(0);
  };

  // Controlled edit form (admin) — seeded whenever a product opens for editing.
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [editError, setEditError] = useState('');
  useEffect(() => {
    if (selectedProduct && canEditProducts) {
      setEditData({ ...selectedProduct });
      setEditError('');
    }
  }, [selectedProduct, canEditProducts]);

  const handleSaveEdit = () => {
    if (!selectedProduct) return;
    const name = (editData.name ?? '').trim();
    if (!name) {
      setEditError('Product name cannot be empty.');
      return;
    }
    if (products.some(p => p.id !== selectedProduct.id && p.name.toLowerCase() === name.toLowerCase())) {
      setEditError('Another item already uses this name.');
      return;
    }
    setProducts(products.map(p =>
      p.id === selectedProduct.id
        ? {
            ...p,
            name,
            category: (editData.category as Category) ?? p.category,
            costPrice: Number(editData.costPrice) || 0,
            price: Number(editData.price) || 0,
            unit: (editData.unit as 'kg' | 'u') ?? p.unit,
            stock: Number(editData.stock) || 0,
            lowStockThreshold: Number(editData.lowStockThreshold) || 0,
          }
        : p,
    ));
    setSelectedProduct(null);
  };

  // Add New Item State
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<Product>>({
    name: '',
    category: 'Cattle Cuts',
    costPrice: 0,
    price: 0,
    unit: 'kg',
    stock: 0,
    lowStockThreshold: 5,
  });
  const [newItemError, setNewItemError] = useState('');
  const [newItemWarning, setNewItemWarning] = useState('');

  // Purchases State
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<'All' | Purchase['type']>('All');
  
  const [newPurchaseData, setNewPurchaseData] = useState<Partial<Purchase>>({
    type: 'Live Cattle',
    supplier: '',
    date: new Date(),
    totalCost: 0,
    items: [],
    notes: ''
  });
  const [newPurchaseError, setNewPurchaseError] = useState('');

  const handleAddNewItemClick = () => {
    setNewItemError('');
    setNewItemWarning('');
    setIsAddingItem(true);
    setNewItemData({
      name: '',
      category: 'Cattle Cuts',
      costPrice: 0,
      price: 0,
      unit: 'kg',
      stock: 0,
      lowStockThreshold: 5,
    });
  };

  const handleSaveNewItem = (logAsPurchase: boolean) => {
    if (!newItemData.name?.trim()) {
      setNewItemError('Product name cannot be empty.');
      return;
    }
    if (products.some(p => p.name.toLowerCase() === newItemData.name?.toLowerCase().trim())) {
      setNewItemError('An item with this name already exists.');
      return;
    }
    if ((newItemData.stock || 0) < 0 || (newItemData.lowStockThreshold || 0) < 0) {
      setNewItemError('Quantities and thresholds must be positive numbers.');
      return;
    }
    
    if ((newItemData.price || 0) < (newItemData.costPrice || 0) && !newItemWarning) {
      setNewItemWarning('Warning: Selling price is lower than cost price. Click save again to proceed.');
      return;
    }

    const newProduct: Product = {
      id: Math.random().toString(),
      name: newItemData.name!.trim(),
      category: newItemData.category as Category,
      costPrice: Number(newItemData.costPrice) || 0,
      price: Number(newItemData.price) || 0,
      stock: Number(newItemData.stock) || 0,
      unit: newItemData.unit as 'kg' | 'u',
      lowStockThreshold: Number(newItemData.lowStockThreshold) || 0
    };

    setProducts([...products, newProduct]);
    setIsAddingItem(false);
  };

  const handleStartPurchase = () => {
    setIsAddingPurchase(true);
    setNewPurchaseError('');
    setNewPurchaseData({
      type: 'Live Cattle',
      supplier: '',
      date: new Date(),
      totalCost: 0,
      items: [],
      notes: ''
    });
  };

  const handleSavePurchase = () => {
    if (!newPurchaseData.supplier?.trim()) {
      setNewPurchaseError('Supplier is required.');
      return;
    }
    
    if (newPurchaseData.type !== 'Live Cattle' && (!newPurchaseData.items || newPurchaseData.items.length === 0)) {
      setNewPurchaseError('At least one item is required.');
      return;
    }

    if (newPurchaseData.type === 'Live Cattle' && (!newPurchaseData.totalCost || newPurchaseData.totalCost <= 0)) {
      setNewPurchaseError('Cost must be greater than zero.');
      return;
    }

    const calculatedTotal = newPurchaseData.type === 'Live Cattle' 
      ? (Number(newPurchaseData.totalCost) || 0)
      : (newPurchaseData.items?.reduce((sum, item) => sum + item.cost, 0) || 0);

    const newPurchase: Purchase = {
      id: `PUR-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      type: newPurchaseData.type as Purchase['type'],
      date: newPurchaseData.date || new Date(),
      supplier: newPurchaseData.supplier.trim(),
      items: newPurchaseData.items || [],
      totalCost: calculatedTotal,
      notes: newPurchaseData.notes,
      operator,
    };

    setPurchases([newPurchase, ...purchases]);
    setIsAddingPurchase(false);

    // If Resale, automatically update stock
    if (newPurchase.type === 'Resale') {
      let updatedProducts = [...products];
      newPurchase.items.forEach(item => {
        if (item.productId) {
          updatedProducts = updatedProducts.map(p => 
            p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p
          );
        }
      });
      setProducts(updatedProducts);
    }
    
    if (newPurchase.type === 'Live Cattle' || newPurchase.type === 'Manufactured Ingredient') {
       alert(`Purchase #${newPurchase.id} recorded successfully.\n\nReminder: Once processed, update the resulting stock quantities in Inventory > Item Detail > Adjust Stock.`);
    } else {
       alert(`Purchase #${newPurchase.id} recorded successfully.\n\nStock levels for resale items have been automatically increased.`);
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => purchaseTypeFilter === 'All' || p.type === purchaseTypeFilter);
  }, [purchases, purchaseTypeFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      if (sortBy === 'stock') return a.stock - b.stock;
      return 0;
    });
  }, [products, activeCategory, searchQuery, sortBy]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
           <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">{businessName}</div>
           <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory <span className="text-[#D42C2C]">Management</span></h2>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
            <span className="text-xs font-medium uppercase tracking-wider">Cloud Synced</span>
          </div>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
            {backLabel}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-4 sm:px-6 border-b border-[#262626] bg-[#111] shrink-0 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('list')}
          className={`py-4 px-5 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'list' ? 'border-[#D42C2C] text-[#D42C2C]' : 'border-transparent text-[#888] hover:text-[#E4E3E0]'}`}
        >
          Stock List
        </button>
        <button 
          onClick={() => setActiveTab('purchases')}
          className={`py-4 px-5 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'purchases' ? 'border-[#D42C2C] text-[#D42C2C]' : 'border-transparent text-[#888] hover:text-[#E4E3E0]'}`}
        >
          Purchases (Intake)
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`py-4 px-5 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'activity' ? 'border-[#D42C2C] text-[#D42C2C]' : 'border-transparent text-[#888] hover:text-[#E4E3E0]'}`}
        >
          Activity Log
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">

        {activeTab === 'list' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-6 shrink-0">
               <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-3xl">
                 <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                    <input 
                      type="text"
                      placeholder="Search stock..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-[#151515] border border-[#262626] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#555] transition-colors"
                    />
                 </div>
                 <div className="flex gap-2 bg-[#151515] p-1 rounded-xl border border-[#262626] overflow-x-auto">
                   {['All', 'Cattle Cuts', 'Manufactured', 'Resale'].map(cat => (
                     <button
                        key={cat}
                        onClick={() => setActiveCategory(cat as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer whitespace-nowrap shrink-0 ${activeCategory === cat ? 'bg-[#222] text-white' : 'text-[#888] hover:text-white'}`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
                 <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer shrink-0"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="stock">Sort: Stock Level</option>
                    <option value="category">Sort: Category</option>
                  </select>
               </div>
               
               {!readOnly && (
                 <button onClick={handleAddNewItemClick} className="bg-[#D42C2C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#B91C1C] transition-colors cursor-pointer w-full lg:w-auto shrink-0">
                   <Plus className="w-4 h-4" />
                   Add New Item
                 </button>
               )}
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto bg-[#151515] border border-[#262626] rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#111] sticky top-0 z-10">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Product Name</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Category</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Cost Price</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Selling Price</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Margin</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Stock Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const isLowStock = product.stock <= product.lowStockThreshold;
                    const margin = product.price - product.costPrice;
                    const marginPercent = ((margin / product.costPrice) * 100).toFixed(1);
                    
                    return (
                      <tr
                        key={product.id}
                        onClick={readOnly ? undefined : () => setSelectedProduct(product)}
                        className={`border-b border-[#262626] hover:bg-[#222] transition-colors group ${readOnly ? '' : 'cursor-pointer'}`}
                      >
                        <td className="py-4 px-6 text-sm font-semibold flex items-center gap-3">
                          {isLowStock && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          {product.name}
                        </td>
                        <td className="py-4 px-6 text-xs text-[#888] uppercase tracking-widest">{product.category}</td>
                        <td className="py-4 px-6 text-sm font-mono text-right text-[#888]">N$ {product.costPrice.toFixed(2)}</td>
                        <td className="py-4 px-6 text-sm font-mono text-right">N$ {product.price.toFixed(2)}</td>
                        <td className="py-4 px-6 text-xs font-mono text-right text-[#10B981]">{marginPercent}%</td>
                        <td className="py-4 px-6 text-right">
                          <span className={`text-sm font-mono px-3 py-1 rounded-md ${isLowStock ? 'bg-yellow-500/10 text-yellow-500 font-bold' : 'text-[#E4E3E0]'}`}>
                            {product.stock} {product.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'purchases' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex gap-4">
                <select 
                  value={purchaseTypeFilter}
                  onChange={(e) => setPurchaseTypeFilter(e.target.value as any)}
                  className="bg-[#151515] border border-[#262626] rounded-xl px-4 py-2 text-sm text-[#888] font-bold uppercase tracking-widest focus:outline-none cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Live Cattle">Live Cattle</option>
                  <option value="Manufactured Ingredient">Manufactured Ingredient</option>
                  <option value="Resale">Resale</option>
                </select>
              </div>
              {!readOnly && (
                <button onClick={handleStartPurchase} className="bg-[#D42C2C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#B91C1C] transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Order New Purchase
                </button>
              )}
            </div>

            {filteredPurchases.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border border-[#262626] border-dashed rounded-2xl bg-[#111]">
                <div className="text-center">
                  <PackagePlus className="w-12 h-12 text-[#555] mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Purchases & Intake</h3>
                  <p className="text-sm text-[#888] max-w-md mx-auto mb-6">
                    Record live cattle purchases, manufactured product ingredients, and resale items here.
                  </p>
                  {!readOnly && (
                    <button onClick={handleStartPurchase} className="bg-[#222] border border-[#333] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Log New Purchase
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto bg-[#151515] border border-[#262626] rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#111] sticky top-0 z-10">
                    <tr>
                      <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Date</th>
                      <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Type</th>
                      <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626]">Supplier</th>
                      <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-[#888] border-b border-[#262626] text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map(purchase => (
                      <tr key={purchase.id} className="border-b border-[#262626] hover:bg-[#222] transition-colors cursor-pointer">
                        <td className="py-4 px-6 text-sm text-[#888]">{purchase.date.toLocaleDateString()}</td>
                        <td className="py-4 px-6 text-sm font-semibold">{purchase.type}</td>
                        <td className="py-4 px-6 text-sm">{purchase.supplier}</td>
                        <td className="py-4 px-6 text-sm font-mono text-right font-bold text-[#E4E3E0]">N$ {purchase.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="flex-1 flex items-center justify-center border border-[#262626] border-dashed rounded-2xl bg-[#111]">
             <div className="text-center">
              <ArrowRightLeft className="w-12 h-12 text-[#555] mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Stock Activity Log</h3>
              <p className="text-sm text-[#888] max-w-md mx-auto">
                Chronological history of all stock movements, manual adjustments, sales deductions, and intake.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Restock-only Modal (stock manager) */}
      {selectedProduct && !canEditProducts && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111]">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Restock Item</div>
                <div className="text-2xl font-bold">{selectedProduct.name}</div>
              </div>
              <button onClick={() => { setSelectedProduct(null); setRestockAmount(0); }} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-[#111] p-4 rounded-xl border border-[#262626] flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#888]">Current Stock</span>
                <span className="text-xl font-mono font-bold">{selectedProduct.stock} {selectedProduct.unit}</span>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Add Quantity ({selectedProduct.unit})</label>
                <input
                  type="number"
                  value={restockAmount || ''}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-4 px-4 text-xl font-mono focus:outline-none focus:border-[#10B981]"
                />
                {restockAmount > 0 && (
                  <p className="text-xs text-[#10B981] mt-2">New stock: {(selectedProduct.stock + restockAmount)} {selectedProduct.unit}</p>
                )}
              </div>
              <p className="text-xs text-[#555] italic">You can add stock and create new items. Editing prices or removing items requires an admin.</p>
            </div>
            <div className="p-6 border-t border-[#262626] flex justify-end gap-4 bg-[#111]">
              <button onClick={() => { setSelectedProduct(null); setRestockAmount(0); }} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleRestock} disabled={restockAmount <= 0} className="bg-[#10B981] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail / Edit Modal */}
      {selectedProduct && canEditProducts && editData.id === selectedProduct.id && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111] shrink-0">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Edit Stock Item</div>
                   <div className="text-2xl font-bold">{selectedProduct.name}</div>
                 </div>
                 <button onClick={() => setSelectedProduct(null)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                   <Check className="w-5 h-5 opacity-0 absolute" /> {/* just spacing */}
                   <span className="font-mono text-sm">Esc</span>
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">

                {editError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Item Name</label>
                    <input type="text" value={editData.name ?? ''} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Category</label>
                    <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value as Category })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none">
                      <option value="Cattle Cuts">Cattle Cuts</option>
                      <option value="Manufactured">Manufactured</option>
                      <option value="Resale">Resale</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Cost Price (N$)</label>
                    <input type="number" value={editData.costPrice ?? 0} onChange={e => setEditData({ ...editData, costPrice: Number(e.target.value) })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Selling Price (N$)</label>
                    <input type="number" value={editData.price ?? 0} onChange={e => setEditData({ ...editData, price: Number(e.target.value) })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Unit</label>
                    <select value={editData.unit} onChange={e => setEditData({ ...editData, unit: e.target.value as 'kg' | 'u' })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none">
                      <option value="kg">kg</option>
                      <option value="u">Each (u)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-[#262626] pt-6">
                  <div className="flex justify-between items-center mb-4">
                     <h4 className="text-sm font-bold uppercase tracking-widest">Manual Stock Adjustment</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#111] p-5 rounded-2xl border border-[#262626]">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Current Quantity</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={editData.stock ?? 0} onChange={e => setEditData({ ...editData, stock: Number(e.target.value) })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-lg font-mono focus:outline-none focus:border-[#555] text-white" />
                        <span className="text-[#888] font-mono">{selectedProduct.unit}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Adjustment Reason (Optional)</label>
                      <select className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none">
                        <option value="">Select a reason...</option>
                        <option value="process">Processed from cattle</option>
                        <option value="count">Stock count correction</option>
                        <option value="waste">Spoilage / Wastage</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Low Stock Threshold</label>
                    <input type="number" value={editData.lowStockThreshold ?? 0} onChange={e => setEditData({ ...editData, lowStockThreshold: Number(e.target.value) })} className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Notes</label>
                    <input type="text" placeholder="Optional comments..." className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" />
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-[#262626] flex justify-end gap-4 shrink-0 bg-[#111]">
                 <button onClick={() => setSelectedProduct(null)} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                   Cancel
                 </button>
                 <button onClick={handleSaveEdit} className="bg-[#10B981] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                   Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111] shrink-0">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Inventory Management</div>
                   <div className="text-2xl font-bold">Add New Item</div>
                 </div>
                 <button onClick={() => setIsAddingItem(false)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                   <Check className="w-5 h-5 opacity-0 absolute" /> {/* just spacing */}
                   <span className="font-mono text-sm">Esc</span>
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {newItemError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {newItemError}
                  </div>
                )}
                {newItemWarning && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {newItemWarning}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Item Name *</label>
                    <input 
                      type="text" 
                      value={newItemData.name} 
                      onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Category *</label>
                    <select 
                      value={newItemData.category}
                      onChange={e => setNewItemData({...newItemData, category: e.target.value as Category})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                    >
                      <option value="Cattle Cuts">Cattle Cuts</option>
                      <option value="Manufactured">Manufactured</option>
                      <option value="Resale">Resale</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Cost Price (N$) *</label>
                    <input 
                      type="number" 
                      value={newItemData.costPrice} 
                      onChange={e => setNewItemData({...newItemData, costPrice: Number(e.target.value)})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Selling Price (N$) *</label>
                    <input 
                      type="number" 
                      value={newItemData.price} 
                      onChange={e => setNewItemData({...newItemData, price: Number(e.target.value)})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Unit *</label>
                    <select 
                      value={newItemData.unit}
                      onChange={e => setNewItemData({...newItemData, unit: e.target.value as 'kg' | 'u'})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                    >
                      <option value="kg">kg</option>
                      <option value="u">Each (u)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#111] p-5 rounded-2xl border border-[#262626]">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Starting Stock Qty *</label>
                    <input 
                      type="number" 
                      value={newItemData.stock} 
                      onChange={e => setNewItemData({...newItemData, stock: Number(e.target.value)})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555] text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Low Stock Threshold *</label>
                    <input 
                      type="number" 
                      value={newItemData.lowStockThreshold} 
                      onChange={e => setNewItemData({...newItemData, lowStockThreshold: Number(e.target.value)})}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Notes / Supplier (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Supplier: Manakwa..." 
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-[#262626] flex justify-between items-center shrink-0 bg-[#111]">
                 <button onClick={() => setIsAddingItem(false)} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                   Cancel
                 </button>
                 <div className="flex gap-4">
                   {(newItemData.stock || 0) > 0 && (
                     <button onClick={() => handleSaveNewItem(true)} className="bg-[#222] border border-[#333] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer">
                       Save & Log Purchase
                     </button>
                   )}
                   <button onClick={() => handleSaveNewItem(false)} className="bg-[#10B981] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#059669] transition-colors cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                     {(newItemData.stock || 0) > 0 ? 'Save Only' : 'Save Item'}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Order New Purchase Modal */}
      {isAddingPurchase && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div className="bg-[#151515] border border-[#262626] rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-[#262626] flex justify-between items-start bg-[#111] shrink-0">
                 <div>
                   <div className="text-xs uppercase tracking-widest text-[#888] mb-1">Intake</div>
                   <div className="text-2xl font-bold">Order New Purchase</div>
                 </div>
                 <button onClick={() => setIsAddingPurchase(false)} className="text-[#555] hover:text-white cursor-pointer p-2 bg-[#222] rounded-full">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {newPurchaseError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {newPurchaseError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Purchase Type *</label>
                    <select 
                      value={newPurchaseData.type}
                      onChange={(e) => {
                        setNewPurchaseData({
                          ...newPurchaseData, 
                          type: e.target.value as Purchase['type'],
                          items: [],
                          totalCost: 0
                        });
                        setNewPurchaseError('');
                      }}
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] appearance-none cursor-pointer"
                    >
                      <option value="Live Cattle">Live Cattle</option>
                      <option value="Manufactured Ingredient">Manufactured Ingredient</option>
                      <option value="Resale">Resale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Supplier *</label>
                    <input 
                      type="text" 
                      value={newPurchaseData.supplier}
                      onChange={e => setNewPurchaseData({...newPurchaseData, supplier: e.target.value})}
                      placeholder="e.g. Auction, Manakwa..."
                      className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]" 
                    />
                  </div>
                </div>

                {newPurchaseData.type === 'Live Cattle' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#111] p-5 rounded-2xl border border-[#262626]">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Total Cost (N$) *</label>
                      <input 
                        type="number" 
                        value={newPurchaseData.totalCost || ''}
                        onChange={e => setNewPurchaseData({...newPurchaseData, totalCost: Number(e.target.value)})}
                        className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-lg font-mono focus:outline-none focus:border-[#555]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Number of Animals (Optional)</label>
                      <input 
                        type="number" 
                        className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-[#555]" 
                      />
                    </div>
                    <div className="col-span-2">
                       <p className="text-xs text-[#888] italic flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4 text-[#888]" />
                         This logs the cost. Cut stock quantities must be adjusted manually after processing.
                       </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111] p-5 rounded-2xl border border-[#262626] space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#888]">Items</label>
                    </div>
                    
                    {newPurchaseData.items?.map((item, index) => (
                      <div key={index} className="flex flex-wrap gap-4 items-end bg-[#151515] p-4 rounded-xl border border-[#262626]">
                        {newPurchaseData.type === 'Resale' ? (
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1">Product</label>
                            <select
                              value={item.productId || ''}
                              onChange={(e) => {
                                const prod = products.find(p => p.id === e.target.value);
                                const newItems = [...(newPurchaseData.items || [])];
                                newItems[index] = { 
                                  ...newItems[index], 
                                  productId: e.target.value, 
                                  name: prod ? prod.name : '',
                                  cost: prod ? prod.costPrice * (newItems[index].quantity || 1) : newItems[index].cost
                                };
                                setNewPurchaseData({...newPurchaseData, items: newItems});
                              }}
                              className="w-full bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#555] appearance-none"
                            >
                              <option value="">Select Resale Product...</option>
                              {products.filter(p => p.category === 'Resale').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1">Ingredient Name</label>
                            <input 
                              type="text" 
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...(newPurchaseData.items || [])];
                                newItems[index].name = e.target.value;
                                setNewPurchaseData({...newPurchaseData, items: newItems});
                              }}
                              placeholder="e.g. Pork Shoulder"
                              className="w-full bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#555]" 
                            />
                          </div>
                        )}
                        
                        <div className="w-24">
                          <label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1">Qty</label>
                          <input 
                            type="number" 
                            value={item.quantity || ''}
                            onChange={(e) => {
                              const newItems = [...(newPurchaseData.items || [])];
                              const qty = Number(e.target.value);
                              newItems[index].quantity = qty;
                              
                              if (newPurchaseData.type === 'Resale' && item.productId) {
                                const prod = products.find(p => p.id === item.productId);
                                if (prod) newItems[index].cost = prod.costPrice * qty;
                              }
                              
                              setNewPurchaseData({...newPurchaseData, items: newItems});
                            }}
                            className="w-full bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:border-[#555]" 
                          />
                        </div>
                        
                        <div className="w-32">
                          <label className="block text-[10px] uppercase tracking-widest text-[#555] mb-1">Line Cost</label>
                          <input 
                            type="number" 
                            value={item.cost || ''}
                            onChange={(e) => {
                              const newItems = [...(newPurchaseData.items || [])];
                              newItems[index].cost = Number(e.target.value);
                              setNewPurchaseData({...newPurchaseData, items: newItems});
                            }}
                            className="w-full bg-[#222] border border-[#333] rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:border-[#555]" 
                          />
                        </div>
                        
                        <button 
                          onClick={() => {
                            const newItems = [...(newPurchaseData.items || [])];
                            newItems.splice(index, 1);
                            setNewPurchaseData({...newPurchaseData, items: newItems});
                          }}
                          className="text-red-500 hover:text-red-400 p-2 cursor-pointer border border-transparent hover:border-red-500/20 rounded-lg bg-transparent hover:bg-red-500/10 mb-[2px]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => {
                        setNewPurchaseData({
                          ...newPurchaseData, 
                          items: [...(newPurchaseData.items || []), { name: '', quantity: 1, cost: 0 }]
                        });
                      }}
                      className="w-full py-3 border border-dashed border-[#333] rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white hover:border-[#555] transition-colors cursor-pointer flex justify-center items-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                    
                    {newPurchaseData.items && newPurchaseData.items.length > 0 && (
                      <div className="flex justify-end pt-4 border-t border-[#262626] mt-4">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Total Order Cost</div>
                          <div className="text-2xl font-mono font-bold text-[#E4E3E0]">
                            N$ {newPurchaseData.items.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {newPurchaseData.type === 'Resale' && (
                       <p className="text-xs text-[#888] italic flex items-center gap-2 mt-4 pt-4 border-t border-[#262626]">
                         <Check className="w-4 h-4 text-[#10B981]" />
                         Stock quantities for Resale products will be automatically increased upon saving.
                       </p>
                    )}
                    
                    {newPurchaseData.type === 'Manufactured Ingredient' && (
                       <p className="text-xs text-[#888] italic flex items-center gap-2 mt-4 pt-4 border-t border-[#262626]">
                         <AlertTriangle className="w-4 h-4 text-[#888]" />
                         This logs the ingredient cost. Finished product stock (e.g. Boerewors) must be adjusted manually after production.
                       </p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Notes</label>
                  <textarea 
                    value={newPurchaseData.notes}
                    onChange={e => setNewPurchaseData({...newPurchaseData, notes: e.target.value})}
                    placeholder="Optional notes or references..."
                    className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555] min-h-[80px]" 
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-[#262626] flex justify-end items-center shrink-0 bg-[#111] gap-4">
                 <button onClick={() => setIsAddingPurchase(false)} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer">
                   Cancel
                 </button>
                 <button onClick={handleSavePurchase} className="bg-[#D42C2C] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#B91C1C] transition-colors cursor-pointer shadow-[0_0_15px_rgba(212,44,44,0.3)]">
                   Save Purchase
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
