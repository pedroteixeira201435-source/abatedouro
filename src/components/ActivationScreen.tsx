import { useState, FormEvent } from 'react';
import { KeyRound, AlertTriangle, LogOut, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext';
import { parseKey, makeRecord, computeStatus } from '../lib/activation';

interface ActivationScreenProps {
  onActivated: () => void;
  onSignOut?: () => void;
}

export default function ActivationScreen({ onActivated, onSignOut }: ActivationScreenProps) {
  const { activation, setActivation, activationUsedKeys, setActivationUsedKeys } = useData();
  const status = computeStatus(activation);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = parseKey(key.trim());
    if (!parsed) {
      setError('Invalid activation key. Check the characters and try again.');
      return;
    }
    if (activationUsedKeys.includes(parsed.key)) {
      setError('This key has already been used for this business. Request a new activation key.');
      return;
    }
    setActivation(makeRecord(parsed));
    setActivationUsedKeys([...activationUsedKeys, parsed.key]);
    onActivated();
  };

  return (
    <div className="min-h-screen w-full bg-[#0C0C0C] flex items-center justify-center p-4 font-sans text-[#E4E3E0]">
      <div className="w-full max-w-sm bg-[#151515] border border-[#262626] rounded-3xl p-8 shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#D42C2C] mb-3">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs uppercase tracking-widest text-[#888] font-semibold">Product Activation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Activate <span className="text-[#D42C2C]">Butchery Control</span>
          </h1>
          <p className="text-sm text-[#888] mt-2">
            Enter the activation key for your business. It applies to the whole company on every device. The license
            period starts now, on first activation.
          </p>
        </div>

        {status.expired && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Your license expired on {status.expiresAt?.toLocaleDateString()}. Enter a new key to continue.
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#888] mb-2">Activation Key</label>
            <input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="MONICA-XXXXXXXXXXXX"
              className="w-full bg-[#222] border border-[#333] rounded-xl py-3 px-4 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-[#555]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#D42C2C] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#B91C1C] transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" /> Activate
          </button>
        </form>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="mt-6 w-full text-center text-xs text-[#888] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
