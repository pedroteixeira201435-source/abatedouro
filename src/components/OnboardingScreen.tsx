import { useState, FormEvent } from 'react';
import { Building2, Ticket, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function OnboardingScreen() {
  const { refreshProfile, signOut, user } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [companyName, setCompanyName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setBusy(true);
    const { error } =
      mode === 'create'
        ? await supabase.rpc('create_company', { company_name: companyName.trim() })
        : await supabase.rpc('join_company', { invite_code: code.trim().toUpperCase() });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    await refreshProfile();
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center p-4 font-sans text-[#E4E3E0]">
      <div className="w-full max-w-md bg-[#151515] border border-[#262626] rounded-3xl p-8 shadow-2xl">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">Welcome{user?.email ? `, ${user.email}` : ''}</div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your access</h1>
        </div>

        <div className="flex gap-2 bg-[#111] p-1 rounded-xl border border-[#262626] mb-6">
          <button
            onClick={() => { setMode('create'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer ${mode === 'create' ? 'bg-[#D42C2C] text-white' : 'text-[#888] hover:text-white'}`}
          >
            <Building2 className="w-4 h-4" /> Create Business
          </button>
          <button
            onClick={() => { setMode('join'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer ${mode === 'join' ? 'bg-[#3B82F6] text-white' : 'text-[#888] hover:text-white'}`}
          >
            <Ticket className="w-4 h-4" /> Join with Code
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === 'create' ? (
            <>
              <p className="text-sm text-[#888]">Create your company — you become its Admin with full access.</p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Business Name</label>
                <input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. My Butchery"
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[#888]">Enter the invite code your manager gave you to join as an employee (Till).</p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Invite Code</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-[#555]"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`w-full text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer ${mode === 'create' ? 'bg-[#D42C2C] hover:bg-[#B91C1C]' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'create' ? 'Create Business' : 'Join'}
          </button>
        </form>

        <button onClick={signOut} className="mt-6 w-full text-center text-xs text-[#888] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
