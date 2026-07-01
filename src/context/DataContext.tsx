import { createContext, useContext, useEffect, useRef, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { Product, Sale, Purchase, Customer, BusinessSettings, DEFAULT_BUSINESS_SETTINGS } from '../types';
import { DUMMY_PRODUCTS, DUMMY_CUSTOMERS, DUMMY_SALES } from '../data';
import { FinanceConfig, DEFAULT_FINANCE_CONFIG } from '../finance/types';
import { ActivationRecord } from '../lib/activation';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type SyncStatus = 'local' | 'loading' | 'synced' | 'saving' | 'error';

interface DataContextValue {
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  sales: Sale[];
  setSales: Dispatch<SetStateAction<Sale[]>>;
  purchases: Purchase[];
  setPurchases: Dispatch<SetStateAction<Purchase[]>>;
  customers: Customer[];
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  finance: FinanceConfig;
  setFinance: Dispatch<SetStateAction<FinanceConfig>>;
  settings: BusinessSettings;
  setSettings: Dispatch<SetStateAction<BusinessSettings>>;
  /** Per-company license activation (synced) + keys already consumed (prevents reuse). */
  activation: ActivationRecord | null;
  setActivation: Dispatch<SetStateAction<ActivationRecord | null>>;
  activationUsedKeys: string[];
  setActivationUsedKeys: Dispatch<SetStateAction<string[]>>;
  /** True once the initial company snapshot has loaded (so the activation gate doesn't flash). */
  hydrated: boolean;
  recordSale: (sale: Sale) => void;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
}

const DataContext = createContext<DataContextValue | null>(null);

const STORAGE_KEY = 'butchery-control-data-v1';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function reviveDates<T>(value: T): T {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value) as unknown as T;
  if (Array.isArray(value)) return value.map(reviveDates) as unknown as T;
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      (value as Record<string, unknown>)[k] = reviveDates((value as Record<string, unknown>)[k]);
    }
  }
  return value;
}

interface PersistShape {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  customers: Customer[];
  finance: FinanceConfig;
  settings: BusinessSettings;
  activation: ActivationRecord | null;
  activationUsedKeys: string[];
}

function fallbackData(): PersistShape {
  return {
    products: DUMMY_PRODUCTS,
    sales: DUMMY_SALES,
    purchases: [],
    customers: DUMMY_CUSTOMERS,
    finance: DEFAULT_FINANCE_CONFIG,
    settings: DEFAULT_BUSINESS_SETTINGS,
    activation: null,
    activationUsedKeys: [],
  };
}

function loadLocal(): PersistShape {
  const fb = fallbackData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fb;
    const parsed = reviveDates(JSON.parse(raw)) as Partial<PersistShape>;
    return { ...fb, ...parsed, finance: mergeFinance(parsed.finance), settings: mergeSettings(parsed.settings) };
  } catch {
    return fb;
  }
}

function isEmptyRemote(data: unknown): boolean {
  return !data || typeof data !== 'object' || Object.keys(data as object).length === 0;
}

/** Deep-merge persisted finance config with defaults so new settings fields are always present. */
function mergeFinance(parsed?: Partial<FinanceConfig>): FinanceConfig {
  return {
    ...DEFAULT_FINANCE_CONFIG,
    ...parsed,
    settings: { ...DEFAULT_FINANCE_CONFIG.settings, ...parsed?.settings },
  };
}

/** Deep-merge persisted business settings with defaults so new fields always get a value. */
function mergeSettings(parsed?: Partial<BusinessSettings>): BusinessSettings {
  return {
    ...DEFAULT_BUSINESS_SETTINGS,
    ...parsed,
    interest: { ...DEFAULT_BUSINESS_SETTINGS.interest, ...parsed?.interest },
    expenseCategories: parsed?.expenseCategories ?? DEFAULT_BUSINESS_SETTINGS.expenseCategories,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, companyId, configured } = useAuth();
  const initial = loadLocal();
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [sales, setSales] = useState<Sale[]>(initial.sales);
  const [purchases, setPurchases] = useState<Purchase[]>(initial.purchases);
  const [customers, setCustomers] = useState<Customer[]>(initial.customers);
  const [finance, setFinance] = useState<FinanceConfig>(initial.finance);
  const [settings, setSettings] = useState<BusinessSettings>(initial.settings);
  const [activation, setActivation] = useState<ActivationRecord | null>(initial.activation);
  const [activationUsedKeys, setActivationUsedKeys] = useState<string[]>(initial.activationUsedKeys);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const applyingRemote = useRef(false); // true while we apply a remote snapshot (skip the echo push)
  const ready = useRef(false); // becomes true once initial load done (local or remote)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySnapshot = (snap: Partial<PersistShape>) => {
    applyingRemote.current = true;
    if (snap.products) setProducts(snap.products);
    if (snap.sales) setSales(snap.sales);
    if (snap.purchases) setPurchases(snap.purchases);
    if (snap.customers) setCustomers(snap.customers);
    setFinance(mergeFinance(snap.finance));
    setSettings(mergeSettings(snap.settings));
    setActivation(snap.activation ?? null);
    setActivationUsedKeys(snap.activationUsedKeys ?? []);
  };

  // ---- Initial load + realtime subscription (per company, once attached to one) ----
  useEffect(() => {
    if (!supabase || !companyId) {
      ready.current = !configured; // local-only mode ready immediately; else wait for company
      setHydrated(true); // local snapshot is all we have — safe to evaluate the gate
      return;
    }
    let active = true;
    ready.current = false;
    setHydrated(false);
    setSyncStatus('loading');
    (async () => {
      const { data, error } = await supabase!
        .from('business_state')
        .select('data')
        .eq('company_id', companyId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setSyncStatus('error');
        ready.current = true;
        setHydrated(true);
        return;
      }
      if (isEmptyRemote(data?.data)) {
        // Fresh company → seed with current local snapshot.
        ready.current = true;
        await pushSnapshot();
      } else {
        applySnapshot(reviveDates(data!.data) as Partial<PersistShape>);
        ready.current = true;
      }
      setHydrated(true);
      setSyncStatus('synced');
      setLastSyncAt(new Date());
    })();

    const channel = supabase
      .channel(`business_state_${companyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'business_state', filter: `company_id=eq.${companyId}` },
        (payload) => {
          const row = payload.new as { data: unknown; updated_by: string | null };
          if (row.updated_by === user?.id) return; // ignore our own echo
          applySnapshot(reviveDates(row.data) as Partial<PersistShape>);
          setLastSyncAt(new Date());
          setSyncStatus('synced');
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase!.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const snapshot = (): PersistShape => ({ products, sales, purchases, customers, finance, settings, activation, activationUsedKeys });

  const pushSnapshot = async () => {
    if (!supabase || !companyId) return;
    setSyncStatus('saving');
    const { error } = await supabase
      .from('business_state')
      .update({ data: snapshot(), updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('company_id', companyId);
    if (error) {
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
      setLastSyncAt(new Date());
    }
  };

  // ---- Persist on every change: localStorage cache + debounced Supabase push ----
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    } catch {
      /* ignore quota */
    }
    if (applyingRemote.current) {
      applyingRemote.current = false; // this change came from remote — don't echo it back
      return;
    }
    if (!ready.current || !supabase || !companyId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void pushSnapshot(); }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, sales, purchases, customers, finance, settings, activation, activationUsedKeys]);

  useEffect(() => {
    if (configured && !companyId) setSyncStatus('local');
  }, [configured, companyId]);

  const recordSale = (sale: Sale) => {
    setSales((prev) => [sale, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        const sold = sale.items.filter((i) => i.product.id === p.id).reduce((s, i) => s + i.quantity, 0);
        return sold ? { ...p, stock: p.stock - sold } : p;
      }),
    );
    if (sale.paymentType === 'Credit' && sale.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId
            ? {
                ...c,
                balance: c.balance + sale.total,
                lastPurchaseDate: sale.date,
                status: c.creditLimit && c.balance + sale.total > c.creditLimit ? 'Overdue' : c.status,
              }
            : c,
        ),
      );
    }
  };

  return (
    <DataContext.Provider
      value={{ products, setProducts, sales, setSales, purchases, setPurchases, customers, setCustomers, finance, setFinance, settings, setSettings, activation, setActivation, activationUsedKeys, setActivationUsedKeys, hydrated, recordSale, syncStatus, lastSyncAt }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
