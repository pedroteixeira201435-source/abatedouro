import { Fragment, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, Image as ImageIcon, Receipt, Landmark, File as FileIcon, Trash2, ExternalLink, Loader2, UploadCloud } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Attachment, DocumentKind, StoredDocument } from '../types';
import {
  ACCEPT_ATTR,
  attachmentsEnabled,
  attachmentUrl,
  removeAttachment,
  uploadAttachment,
  formatSize,
  type AttachmentCategory,
} from '../lib/attachments';

interface Props {
  onBack: () => void;
}

const KIND_META: Record<DocumentKind, { label: string; category: AttachmentCategory; icon: typeof Receipt; accent: string }> = {
  invoice: { label: 'Invoice', category: 'invoices', icon: Receipt, accent: '#D42C2C' },
  'bank-statement': { label: 'Bank statement', category: 'bank-statements', icon: Landmark, accent: '#10B981' },
  other: { label: 'Other', category: 'documents', icon: FileIcon, accent: '#888' },
};

type Filter = 'all' | DocumentKind;

async function openDoc(path: string) {
  try {
    window.open(await attachmentUrl(path), '_blank', 'noopener,noreferrer');
  } catch { /* ignore */ }
}

function fileIcon(mime: string, accent: string) {
  return mime === 'application/pdf'
    ? <FileText className="w-5 h-5 shrink-0" style={{ color: accent }} />
    : <ImageIcon className="w-5 h-5 shrink-0" style={{ color: accent }} />;
}

export default function DocumentsArea({ onBack }: Props) {
  const { documents, setDocuments, purchases, finance, customers } = useData();
  const { companyId, user, canEdit } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<DocumentKind>('invoice');
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const canUpload = canEdit && attachmentsEnabled && !!companyId;

  const startUpload = (kind: DocumentKind) => {
    if (!canUpload) return;
    setUploadKind(kind);
    setError(null);
    inputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !companyId) return;
    const kind = uploadKind;
    setBusy(kind);
    setError(null);
    const uploadedBy = user?.email ?? 'admin';
    const added: StoredDocument[] = [];
    try {
      for (const file of Array.from(files)) {
        const att = await uploadAttachment(companyId, KIND_META[kind].category, file, uploadedBy);
        added.push({ ...att, kind });
      }
      setDocuments([...added, ...documents]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const patch = (id: string, p: Partial<StoredDocument>) =>
    setDocuments(documents.map((d) => (d.id === id ? { ...d, ...p } : d)));

  const remove = (d: StoredDocument) => {
    setDocuments(documents.filter((x) => x.id !== d.id));
    void removeAttachment(d.path);
  };

  const visible = useMemo(
    () => documents.filter((d) => filter === 'all' || d.kind === filter),
    [documents, filter],
  );

  // Documents already attached to accounting records — surfaced here read-only so everything
  // lives in one place.
  const attached = useMemo(() => {
    const out: { att: Attachment; source: string; kind: DocumentKind }[] = [];
    for (const p of purchases) for (const a of p.attachments ?? []) out.push({ att: a, source: `Purchase · ${p.supplier}`, kind: 'invoice' });
    for (const e of finance.manualEntries) for (const a of e.attachments ?? []) out.push({ att: a, source: `Journal · ${e.description || 'entry'}`, kind: 'bank-statement' });
    for (const as of finance.assets) for (const a of as.attachments ?? []) out.push({ att: a, source: `Asset · ${as.description || 'asset'}`, kind: 'invoice' });
    for (const c of customers) for (const pay of c.payments) for (const a of pay.attachments ?? []) out.push({ att: a, source: `Payment · ${c.name}`, kind: 'other' });
    return out;
  }, [purchases, finance, customers]);

  const inputCls = 'bg-[#222] border border-[#333] rounded-lg py-1.5 px-2 text-xs font-mono focus:outline-none focus:border-[#555]';

  const UploadBtn = ({ kind }: { kind: DocumentKind }) => {
    const m = KIND_META[kind];
    const Icon = m.icon;
    return (
      <button
        type="button"
        disabled={!canUpload || busy !== null}
        onClick={() => startUpload(kind)}
        className="flex-1 min-w-[160px] flex items-center gap-3 bg-[#151515] border border-[#262626] hover:border-[#3a3a3a] rounded-2xl p-5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${m.accent}1a` }}>
          {busy === kind ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: m.accent }} /> : <Icon className="w-5 h-5" style={{ color: m.accent }} />}
        </div>
        <div>
          <div className="text-sm font-bold flex items-center gap-1.5"><UploadCloud className="w-3.5 h-3.5 text-[#888]" /> Upload {m.label.toLowerCase()}</div>
          <div className="text-[11px] text-[#666] mt-0.5">PDF or photo · máx 10 MB</div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0C0C0C] text-[#E4E3E0] font-sans overflow-hidden">
      <header className="flex flex-wrap gap-3 justify-between items-center px-4 sm:px-6 py-4 bg-[#151515] border-b border-[#262626] shrink-0">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#888] font-semibold mb-1">Butchery Control</div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            <span className="text-[#D42C2C]">Documents</span> — invoices &amp; bank statements
          </h2>
        </div>
        <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-[#888] hover:text-white transition-colors cursor-pointer flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Hidden shared file input */}
        <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        {/* Prominent upload actions */}
        <div className="flex flex-wrap gap-3">
          <UploadBtn kind="invoice" />
          <UploadBtn kind="bank-statement" />
          <UploadBtn kind="other" />
        </div>
        {!attachmentsEnabled && <p className="text-xs text-[#888] italic">Sign in to upload documents (cloud storage is required).</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-[#151515] border border-[#262626] p-1 rounded-xl w-fit">
          {(['all', 'invoice', 'bank-statement', 'other'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${filter === f ? 'bg-[#D42C2C] text-white' : 'text-[#888] hover:text-white'}`}
            >
              {f === 'all' ? 'All' : KIND_META[f].label}
            </button>
          ))}
        </div>

        {/* Uploaded documents */}
        {visible.length === 0 ? (
          <div className="border border-dashed border-[#262626] rounded-2xl bg-[#111] p-10 text-center">
            <UploadCloud className="w-10 h-10 text-[#444] mx-auto mb-3" />
            <p className="text-sm text-[#888]">No documents yet. Upload an invoice or bank statement above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((d) => {
              const m = KIND_META[d.kind];
              return (
                <Fragment key={d.id}>
                  <div className="bg-[#151515] border border-[#262626] rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {fileIcon(d.mime, m.accent)}
                      <button onClick={() => openDoc(d.path)} title={d.name} className="flex-1 min-w-0 text-left flex items-center gap-1.5 hover:underline cursor-pointer">
                        <span className="text-sm font-semibold truncate">{d.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#555] shrink-0" />
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md shrink-0" style={{ backgroundColor: `${m.accent}1a`, color: m.accent }}>{m.label}</span>
                      <span className="text-[10px] text-[#666] shrink-0 tabular-nums hidden sm:inline">{formatSize(d.size)}</span>
                      {canEdit && (
                        <button onClick={() => remove(d)} className="text-red-500 hover:text-red-400 p-1 cursor-pointer shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    {/* Optional hand-typed metadata (no OCR) */}
                    <div className="flex flex-wrap gap-2 mt-3 pl-8">
                      <input placeholder="Reference / supplier / bank" disabled={!canEdit} className={inputCls + ' flex-1 min-w-[160px]'} value={d.reference ?? ''} onChange={(e) => patch(d.id, { reference: e.target.value })} />
                      <input type="date" disabled={!canEdit} className={inputCls} value={d.docDate ?? ''} onChange={(e) => patch(d.id, { docDate: e.target.value })} />
                      <input type="number" placeholder="Amount (N$)" disabled={!canEdit} className={inputCls + ' w-32'} value={d.amount ?? ''} onChange={(e) => patch(d.id, { amount: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}

        {/* Documents attached to accounting records (read-only) */}
        {attached.length > 0 && (
          <div className="pt-2">
            <div className="text-[11px] uppercase tracking-widest text-[#888] font-bold mb-3">Attached to records ({attached.length})</div>
            <div className="space-y-2">
              {attached.map(({ att, source, kind }) => {
                const m = KIND_META[kind];
                return (
                  <Fragment key={att.id}>
                    <div className="flex items-center gap-3 bg-[#111] border border-[#262626] rounded-xl px-4 py-2.5">
                      {fileIcon(att.mime, m.accent)}
                      <button onClick={() => openDoc(att.path)} title={att.name} className="flex-1 min-w-0 text-left flex items-center gap-1.5 hover:underline cursor-pointer">
                        <span className="text-sm truncate">{att.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#555] shrink-0" />
                      </button>
                      <span className="text-[11px] text-[#666] truncate max-w-[40%] shrink-0">{source}</span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
            <p className="text-[11px] text-[#555] italic mt-2">Manage these from their own record (Inventory, Reports, Customers).</p>
          </div>
        )}
      </div>
    </div>
  );
}
