import { Product, Customer } from './types';

export const DUMMY_PRODUCTS: Product[] = [
  { id: '1', name: 'Beef Rump', category: 'Cattle Cuts', costPrice: 85, price: 120, stock: 4.2, unit: 'kg', lowStockThreshold: 5 },
  { id: '2', name: 'T-Bone Steak', category: 'Cattle Cuts', costPrice: 90, price: 145, stock: 15, unit: 'kg', lowStockThreshold: 5 },
  { id: '3', name: 'Boerewors (Traditional)', category: 'Manufactured', costPrice: 65, price: 95, stock: 12, unit: 'kg', lowStockThreshold: 10 },
  { id: '4', name: 'Pork Ribs', category: 'Manufactured', costPrice: 75, price: 110, stock: 68, unit: 'kg', lowStockThreshold: 20 },
  { id: '5', name: 'Chicken Whole', category: 'Resale', costPrice: 45, price: 65, stock: 34, unit: 'u', lowStockThreshold: 10 },
  { id: '6', name: 'Charcoal 5kg', category: 'Resale', costPrice: 30, price: 45, stock: 2, unit: 'u', lowStockThreshold: 10 },
];

export const DUMMY_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', 
    name: 'Windhoek Estates', 
    phone: '081 234 5678',
    email: 'info@windhoekestates.com',
    balance: 12400,
    status: 'Overdue',
    creditLimit: 15000,
    lastPurchaseDate: new Date(new Date().setHours(new Date().getHours() - 2)),
    payments: []
  },
  { 
    id: 'c2', 
    name: 'Safari Lodge CC',
    phone: '081 987 6543',
    balance: 8210,
    status: 'Current',
    creditLimit: 20000,
    lastPurchaseDate: new Date(new Date().setDate(new Date().getDate() - 5)),
    payments: [
      {
        id: 'p1',
        date: new Date(new Date().setDate(new Date().getDate() - 10)),
        amount: 5000,
        method: 'Bank Transfer',
        operator: 'ADMIN',
        syncStatus: 'Synced'
      }
    ]
  },
  { 
    id: 'c3', 
    name: 'John Doe', 
    phone: '081 111 2222',
    balance: 0,
    status: 'Current',
    payments: []
  },
];

export const DUMMY_SALES: import('./types').Sale[] = [
  {
    id: '001204',
    date: new Date(new Date().setHours(new Date().getHours() - 1)),
    operator: 'JD',
    paymentType: 'Cash',
    items: [
      { product: DUMMY_PRODUCTS[0], quantity: 2, subtotal: 240, costSubtotal: 170 },
      { product: DUMMY_PRODUCTS[4], quantity: 1, subtotal: 65, costSubtotal: 45 },
    ],
    total: 305,
    costTotal: 215,
    syncStatus: 'Synced',
    status: 'Completed',
  },
  {
    id: '001205',
    date: new Date(new Date().setHours(new Date().getHours() - 2)),
    operator: 'JD',
    paymentType: 'Credit',
    customerId: 'c1',
    customerName: 'Windhoek Estates',
    items: [
      { product: DUMMY_PRODUCTS[1], quantity: 10, subtotal: 1450, costSubtotal: 900 },
    ],
    total: 1450,
    costTotal: 900,
    syncStatus: 'Synced',
    status: 'Completed',
  },
  {
    id: '001206',
    date: new Date(new Date().setHours(new Date().getHours() - 3)),
    operator: 'ADMIN',
    paymentType: 'Cash',
    items: [
      { product: DUMMY_PRODUCTS[2], quantity: 5, subtotal: 475, costSubtotal: 325 },
    ],
    total: 475,
    costTotal: 325,
    syncStatus: 'Pending Sync',
    status: 'Completed',
  },
  {
    id: '001207',
    date: new Date(new Date().setDate(new Date().getDate() - 1)),
    operator: 'JD',
    paymentType: 'Cash',
    items: [
      { product: DUMMY_PRODUCTS[3], quantity: 3, subtotal: 330, costSubtotal: 225 },
    ],
    total: 330,
    costTotal: 225,
    syncStatus: 'Synced',
    status: 'Voided',
    voidReason: 'Customer changed mind',
  },
];
