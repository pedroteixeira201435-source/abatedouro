import { useState, FormEvent } from 'react';
import { LogIn, UserPlus, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
    } else if (mode === 'signup') {
      setInfo('Account created. The first account is the Admin; others start as Till. You can now sign in.');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center p-4 font-sans text-[#E4E3E0]">
      <div className="w-full max-w-sm bg-[#151515] border border-[#262626] rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">Butchery Management</div>
          <h1 className="text-2xl font-bold tracking-tight">
            Butchery <span className="text-[#D42C2C]">Control</span>
          </h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {info && (
          <div className="bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] p-3 rounded-xl text-sm mb-4">{info}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#555]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#D42C2C] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#B91C1C] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
          className="mt-6 w-full text-center text-xs text-[#888] hover:text-white transition-colors cursor-pointer"
        >
          {mode === 'login' ? "No account yet? Create one" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
