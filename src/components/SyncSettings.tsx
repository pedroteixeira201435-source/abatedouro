import { Check, RefreshCw, Download, LogOut, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  local: { text: 'Local only (not signed in)', color: 'text-[#888]' },
  loading: { text: 'Loading…', color: 'text-[#888]' },
  synced: { text: 'All data synced', color: 'text-[#10B981]' },
  saving: { text: 'Saving…', color: 'text-yellow-500' },
  error: { text: 'Sync error', color: 'text-[#D42C2C]' },
};

export default function SyncSettings() {
  const { configured, session, user, role, profile, signOut } = useAuth();
  const { syncStatus, lastSyncAt, products, sales, purchases, customers, finance } = useData();

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify({ products, sales, purchases, customers, finance }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `butchery-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const status = STATUS_LABEL[syncStatus] ?? STATUS_LABEL.local;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold mb-4">Sync & Storage</h3>
        <p className="text-sm text-[#888] mb-2">Cloud sync &amp; multi-device access via Supabase. Manage staff in the <b>Users</b> tab.</p>
      </div>

      {!configured && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Supabase credentials not set. The app runs <b className="mx-1">local-only</b>. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to enable cloud sync.
        </div>
      )}

      <div className="bg-[#111] border border-[#262626] p-6 rounded-2xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-1">Account</div>
            <div className="font-semibold">{session ? user?.email : '—'}</div>
            <div className="flex items-center gap-2 mt-2">
              {profile?.companyName && <span className="text-xs text-[#888]">{profile.companyName}</span>}
              {role && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
                  <ShieldCheck className="w-3 h-3" /> {role}
                </span>
              )}
            </div>
          </div>
          {session && (
            <button onClick={signOut} className="text-xs font-bold uppercase tracking-widest text-[#D42C2C] hover:text-white transition-colors cursor-pointer border border-[#D42C2C]/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-[#262626]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-1">Sync Status</div>
          <div className={`flex items-center gap-2 font-semibold ${status.color}`}>
            {syncStatus === 'synced' ? <Check className="w-4 h-4" /> : syncStatus === 'saving' || syncStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {status.text}
          </div>
          {lastSyncAt && <div className="text-xs text-[#555] mt-1">Last sync: {lastSyncAt.toLocaleTimeString()}</div>}
        </div>

        <div className="pt-4 border-t border-[#262626]">
          <button onClick={downloadBackup} className="bg-[#222] border border-[#333] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
            <Download className="w-4 h-4" /> Download Data Backup (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
