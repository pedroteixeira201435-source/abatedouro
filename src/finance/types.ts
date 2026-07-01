/** Finance configuration & inputs the POS does not capture (mirrors Settings / Prior Year / Asset Register). */

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  /** True when the amount is VAT-inclusive (used for the VAT Ledger). */
  vat?: boolean;
}

export interface FinanceSettings {
  companyName: string;
  /** Reporting date shown on statement headers, e.g. "31 December 2025". */
  reportingDate: string;
  corporateTaxRate: number; // 0.30
  vatRate: number; // 0.15
  annualInterestRate: number; // 0.10
  monthsInPeriod: number; // 12
  /** Report period (ISO yyyy-mm-dd) — transactions are filtered to this range. Empty = all dates. */
  periodStart: string;
  periodEnd: string;
  // --- Statutory identity (AFS cover / NAMRA / banks) ---
  entityType: string; // 'Close Corporation (CC)' | '(Pty) Ltd' | 'Sole Proprietor'
  registrationNumber: string; // CC/company registration number
  vatNumber: string; // NAMRA VAT registration number
  taxNumber: string; // NAMRA income tax number
  financialYearStart: string; // e.g. '1 January 2025'
  financialYearEnd: string; // e.g. '31 December 2025'
  preparedBy: string;
  businessAddress: string;
}

/** Audited closing balances of the previous year — seed the opening journal so the Balance Sheet ties. */
export interface PriorYear {
  cash: number;
  accountsReceivable: number;
  inventory: number;
  prepaidExpenses: number;
  ppeCost: number;
  accumulatedDepreciation: number; // entered as a positive number
  accountsPayable: number;
  vatPayable: number;
  incomeTaxPayable: number;
  accruedLiabilities: number;
  loansPayable: number;
  shareCapital: number;
  retainedEarnings: number;
}

export interface FixedAsset {
  id: string;
  description: string;
  category: 'Computers & Equipment' | 'Motor Vehicles' | 'Plant & Machinery' | 'Industrial Buildings';
  cost: number;
}

/** Manual journal entry for things the POS does not generate (expenses, capital, loans, depreciation). */
export interface ManualEntry {
  id: string;
  date: Date;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  vat: boolean;
}

export interface FinanceConfig {
  settings: FinanceSettings;
  priorYear: PriorYear;
  assets: FixedAsset[];
  manualEntries: ManualEntry[];
  /** Manual tax inputs (Tax Engine). */
  otherNonDeductible: number;
  assessedLossBroughtForward: number;
  /** Dividends declared during the period (Income Statement). */
  dividendsDeclared: number;
}

export const ZERO_PRIOR_YEAR: PriorYear = {
  cash: 0,
  accountsReceivable: 0,
  inventory: 0,
  prepaidExpenses: 0,
  ppeCost: 0,
  accumulatedDepreciation: 0,
  accountsPayable: 0,
  vatPayable: 0,
  incomeTaxPayable: 0,
  accruedLiabilities: 0,
  loansPayable: 0,
  shareCapital: 0,
  retainedEarnings: 0,
};

export const DEFAULT_FINANCE_CONFIG: FinanceConfig = {
  settings: {
    companyName: '',
    reportingDate: '31 December 2025',
    corporateTaxRate: 0.3,
    vatRate: 0.15,
    annualInterestRate: 0.1,
    monthsInPeriod: 12,
    periodStart: '',
    periodEnd: '',
    entityType: 'Close Corporation (CC)',
    registrationNumber: '',
    vatNumber: '',
    taxNumber: '',
    financialYearStart: '1 January 2025',
    financialYearEnd: '31 December 2025',
    preparedBy: '',
    businessAddress: '',
  },
  priorYear: { ...ZERO_PRIOR_YEAR },
  assets: [],
  manualEntries: [],
  otherNonDeductible: 0,
  assessedLossBroughtForward: 0,
  dividendsDeclared: 0,
};
