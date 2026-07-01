import { useEffect, useState } from 'react';
import { Check, Loader2, Ticket, Plus, Trash2, Copy, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Role } from '../lib/supabase';

interface ProfileRow { id: string; email: string | null; role: Role }
interface InviteRow { code: string; role: Role; created_at: string }

export default function UserManagement() {
  const { configured, role, user, profile } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'admin'>>('till');

  const isAdmin = role === 'admin' && configured;

  const load = async () => {
    if (!supabase || !isAdmin) return;
    const [{ data: p }, { data: inv }] = await Promise.all([
      supabase.from('profiles').select('id, email, role').order('created_at'),
      supabase.from('company_invites').select('code, role, created_at').order('created_at', { ascending: false }),
    ]);
    if (p) setProfiles(p as ProfileRow[]);
    if (inv) setInvites(inv as InviteRow[]);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [role]);

  const generate = async () => {
    if (!supabase) return;
    setCreating(true);
    await supabase.rpc('create_invite', { invite_role: inviteRole });
    await load();
    setCreating(false);
  };

  const remove = async (code: string) => {
    if (!supabase) return;
    await supabase.from('company_invites').delete().eq('code', code);
    await load();
  };

  const changeRole = async (id: string, newRole: Role) => {
    if (!supabase) return;
    setSavingId(id);
    await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    await load();
    setSavingId(null);
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!configured) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl text-sm max-w-2xl flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" /> Cloud mode is off. Add Supabase credentials to manage users.
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="text-sm text-[#888] max-w-2xl">Only an Admin can manage users.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-bold mb-1">User & Role Management</h3>
        <p className="text-sm text-[#888]">{profile?.companyName ?? 'Your business'} — invite staff and manage their access.</p>
      </div>

      {/* Invite a new employee */}
      <div className="bg-[#111] border border-[#262626] rounded-xl p-6">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-bold uppercase tracking-widest text-[#888] flex items-center gap-2"><Ticket className="w-4 h-4" /> Invite a new employee</div>
          <div className="flex items-center gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Exclude<Role, 'admin'>)}
              className="bg-[#222] border border-[#333] rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#555] cursor-pointer"
            >
              <option value="till">Till</option>
              <option value="stock_manager">Stock Manager</option>
            </select>
            <button onClick={generate} disabled={creating} className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2563EB] transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate Invite Code
            </button>
          </div>
        </div>
        <p className="text-xs text-[#555] mb-4">Pick the role, click <b>Generate Invite Code</b>, then send the code to your employee. They open the app → <b>Create Account</b> → <b>Join with Code</b>. <b>Till</b> = Open Till only; <b>Stock Manager</b> = Inventory only (add + restock).</p>
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.code} className="flex justify-between items-center bg-[#151515] border border-[#262626] rounded-xl px-4 py-3">
              <span className="font-mono text-lg tracking-widest">{inv.code}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => copy(inv.code)} className="text-[#888] hover:text-white cursor-pointer flex items-center gap-1 text-xs uppercase font-bold tracking-widest">
                  {copied === inv.code ? <><Check className="w-4 h-4 text-[#10B981]" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
                <button onClick={() => remove(inv.code)} className="text-red-500 hover:text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {invites.length === 0 && <div className="text-sm text-[#555] italic">No active codes. Generate one to invite staff.</div>}
        </div>
      </div>

      {/* Existing users */}
      <div className="bg-[#111] border border-[#262626] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#151515] border-b border-[#262626]">
            <tr>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888]">User</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[#888] text-right">Role / Access</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-[#262626] last:border-0">
                <td className="py-3 px-4">
                  <div className="font-semibold flex items-center gap-2">
                    {p.role === 'admin' && <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />}
                    {p.email}{p.id === user?.id && <span className="text-[#555] text-xs font-normal"> (you)</span>}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    {savingId === p.id && <Loader2 className="w-4 h-4 animate-spin text-[#888]" />}
                    <select
                      value={p.role}
                      disabled={p.id === user?.id}
                      onChange={(e) => changeRole(p.id, e.target.value as Role)}
                      className="bg-[#222] border border-[#333] rounded-lg py-1.5 px-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#555] disabled:opacity-50 cursor-pointer"
                    >
                      <option value="till">Till (Open Till only)</option>
                      <option value="stock_manager">Stock Manager (Inventory only)</option>
                      <option value="admin">Admin (full access)</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr><td colSpan={2} className="py-8 text-center text-[#555] text-sm">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
