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
  /** Extra charged on a credit sale (over the cash price) per the credit surcharge policy. Included in `total`. */
  surcharge?: number;
  syncStatus: 'Synced' | 'Pending Sync';
  status: 'Completed' | 'Voided' | 'Refunded';
  voidReason?: string;
  /** Audit trail for admin corrections (only admins may edit a recorded sale). */
  editedAt?: Date;
  editedBy?: string;
  editReason?: string;
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

/** Interest charged on overdue credit — either a flat N$ amount or a percentage of the overdue balance. */
export interface CreditInterest {
  mode: 'fixed' | 'percent';
  value: number; // N$ when 'fixed'; percentage points when 'percent' (e.g. 10 = 10%)
}

/** A monthly interest charge posted against a customer's outstanding balance. */
export interface InterestCharge {
  id: string;
  date: Date;
  amount: number;
  balanceAt: number; // the outstanding balance the interest was computed on
  note?: string;
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
  /** Per-customer override of the global interest policy. Falls back to BusinessSettings.interest. */
  interest?: CreditInterest;
  /** Interest charges posted at month-end. */
  charges?: InterestCharge[];
  /** Guards against charging interest twice in the same month (ISO yyyy-mm). */
  lastInterestRun?: string;
}

/** Business-level configuration (persisted in the shared snapshot, synced per company). */
export interface BusinessSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  /** Company logo as a base64 data URL (shown on receipts/statements). Empty = none. */
  logo?: string;
  // Credit policy
  creditLimitBehavior: 'Warn' | 'Block';
  billingCycle: string;
  interest: CreditInterest;
  /** Extra charged on credit sales over the cash price (the cost of buying on credit). value 0 = disabled. */
  creditSurcharge: CreditInterest;
  // Receipt / invoice
  receiptPrefix: string;
  receiptHeader: string;
  receiptFooter: string;
  // Inventory defaults
  lowStockThreshold: number;
  allowNegativeStock: boolean;
  expenseCategories: string[];
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  logo: '',
  creditLimitBehavior: 'Warn',
  billingCycle: 'Last day of the month',
  interest: { mode: 'percent', value: 0 },
  creditSurcharge: { mode: 'percent', value: 0 },
  receiptPrefix: 'INV-',
  receiptHeader: '',
  receiptFooter: 'Thank you for your business!',
  lowStockThreshold: 5,
  allowNegativeStock: false,
  expenseCategories: ['Staff Wages', 'Cold Room/Utilities', 'Packaging', 'Processing Costs'],
};
