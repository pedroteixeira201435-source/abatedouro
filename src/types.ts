export type Category = 'Cattle Cuts' | 'Manufactured' | 'Resale';

export interface Product {
  id: string;
  name: string;
  category: Category;
  costPrice: number;
  price: number;
  stock: number;
  unit: 'kg' | 'u';
  lowStockThreshold: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface SaleItem {
  product: Product;
  quantity: number;
  subtotal: number;
  costSubtotal: number;
}

export interface Sale {
  id: string; // Receipt number
  date: Date;
  operator: string;
  paymentType: 'Cash' | 'Credit';
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  total: number;
  costTotal: number;
  syncStatus: 'Synced' | 'Pending Sync';
  status: 'Completed' | 'Voided' | 'Refunded';
  voidReason?: string;
}

export interface Payment {
  id: string;
  date: Date;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Other';
  operator: string;
  note?: string;
  syncStatus: 'Synced' | 'Pending Sync';
}

export interface PurchaseItem {
  name: string;
  quantity: number;
  cost: number;
  productId?: string; // If it maps to a Resale product
}

export interface Purchase {
  id: string;
  type: 'Live Cattle' | 'Manufactured Ingredient' | 'Resale';
  date: Date;
  supplier: string;
  items: PurchaseItem[];
  totalCost: number;
  notes?: string;
  operator: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  creditLimit?: number;
  balance: number;
  status: 'Current' | 'Overdue';
  lastPurchaseDate?: Date;
  payments: Payment[];
}
