/**
 * Chart of Accounts — mirrors the "Settings" sheet of Namibia_Financial_Model_v8.xlsx.
 * Account names MUST match exactly: the whole engine aggregates the journal by these strings.
 */

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type StatementKind = 'BS' | 'IS';
export type NormalBalance = 'Debit' | 'Credit';

export interface Account {
  name: string;
  category: AccountCategory;
  statement: StatementKind;
  normal: NormalBalance;
}

export const CHART_OF_ACCOUNTS: Account[] = [
  { name: 'Cash & Cash Equivalents', category: 'Asset', statement: 'BS', normal: 'Debit' },
  { name: 'Accounts Receivable', category: 'Asset', statement: 'BS', normal: 'Debit' },
  { name: 'Inventory', category: 'Asset', statement: 'BS', normal: 'Debit' },
  { name: 'Prepaid Expenses', category: 'Asset', statement: 'BS', normal: 'Debit' },
  { name: 'Property, Plant & Equipment', category: 'Asset', statement: 'BS', normal: 'Debit' },
  { name: 'Accumulated Depreciation', category: 'Asset', statement: 'BS', normal: 'Credit' },
  { name: 'Accounts Payable', category: 'Liability', statement: 'BS', normal: 'Credit' },
  { name: 'VAT Payable', category: 'Liability', statement: 'BS', normal: 'Credit' },
  { name: 'Income Tax Payable', category: 'Liability', statement: 'BS', normal: 'Credit' },
  { name: 'Loans Payable', category: 'Liability', statement: 'BS', normal: 'Credit' },
  { name: 'Accrued Liabilities', category: 'Liability', statement: 'BS', normal: 'Credit' },
  { name: 'Share Capital', category: 'Equity', statement: 'BS', normal: 'Credit' },
  { name: 'Retained Earnings', category: 'Equity', statement: 'BS', normal: 'Credit' },
  { name: 'Sales Revenue', category: 'Revenue', statement: 'IS', normal: 'Credit' },
  { name: 'Service Revenue', category: 'Revenue', statement: 'IS', normal: 'Credit' },
  { name: 'Other Income', category: 'Revenue', statement: 'IS', normal: 'Credit' },
  { name: 'Cost of Goods Sold', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Direct Labour', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Salaries & Wages', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Rent Expense', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Utilities Expense', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Marketing & Advertising', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Depreciation Expense', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Travel & Entertainment', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Professional Fees', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Bank Charges', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Fines & Penalties (Non-Deductible)', category: 'Expense', statement: 'IS', normal: 'Debit' },
  { name: 'Entertainment (50% Non-Deductible)', category: 'Expense', statement: 'IS', normal: 'Debit' },
];

export const ACCOUNT_BY_NAME = new Map(CHART_OF_ACCOUNTS.map((a) => [a.name, a]));

/** Operating-expense accounts shown on the Income Statement OPEX block (order matters for display). */
export const OPEX_ACCOUNTS = [
  'Salaries & Wages',
  'Rent Expense',
  'Utilities Expense',
  'Marketing & Advertising',
  'Depreciation Expense',
  'Travel & Entertainment',
  'Professional Fees',
  'Bank Charges',
  'Fines & Penalties (Non-Deductible)',
  'Entertainment (50% Non-Deductible)',
] as const;

/** NamRA wear & tear rates by fixed-asset category (Tax Engine — Step 3). */
export const NAMRA_WEAR_AND_TEAR: Record<string, number> = {
  'Computers & Equipment': 0.3333,
  'Motor Vehicles': 0.2,
  'Plant & Machinery': 0.1,
  'Industrial Buildings': 0.04,
};
