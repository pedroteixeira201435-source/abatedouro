import { Fragment, useRef, useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Attachment } from '../types';
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
  attachments?: Attachment[];
  onChange: (next: Attachment[]) => void;
  category: AttachmentCategory;
  /** Small label above the control, e.g. "Invoice" or "Bank statement". */
  label?: string;
  readOnly?: boolean;
}

/**
 * Attach/view supporting documents (invoice, bank statement, transfer proof) on a record.
 * Files go to Supabase Storage; only metadata is stored on the record via `onChange`.
 * No OCR/AI — store & show only. Disabled in local-only mode (no Supabase session).
 */
export default function AttachmentField({ attachments = [], onChange, category, label = 'Documents', readOnly = false }: Props) {
  const { companyId, user, canEdit } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = readOnly || !canEdit || !attachmentsEnabled || !companyId;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !companyId) return;
    setError(null);
    setBusy(true);
    const uploadedBy = user?.email ?? 'admin';
    const added: Attachment[] = [];
    try {
      for (const file of Array.from(files)) {
        added.push(await uploadAttachment(companyId, category, file, uploadedBy));
      }
      onChange([...attachments, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleView = async (a: Attachment) => {
    setError(null);
    try {
      const url = await attachmentUrl(a.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open document.');
    }
  };

  const handleRemove = async (a: Attachment) => {
    onChange(attachments.filter((x) => x.id !== a.id));
    void removeAttachment(a.path); // best-effort; metadata is the source of truth
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#888]">
          <Paperclip className="w-3 h-3" /> {label}
        </span>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-[#10B981] disabled:text-[#555] disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
              Attach PDF/photo
            </button>
          </>
        )}
      </div>

      {!attachmentsEnabled && !readOnly && (
        <p className="text-[11px] text-[#555] italic">Sign in to attach documents.</p>
      )}

      {attachments.length === 0 ? (
        attachmentsEnabled && <p className="text-[11px] text-[#555] italic">No documents attached.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {attachments.map((a) => (
            <Fragment key={a.id}>
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#262626] rounded-lg px-2.5 py-1.5">
                {a.mime === 'application/pdf'
                  ? <FileText className="w-4 h-4 text-[#D42C2C] shrink-0" />
                  : <ImageIcon className="w-4 h-4 text-[#10B981] shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleView(a)}
                  title={a.name}
                  className="flex-1 min-w-0 text-left text-xs truncate hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="truncate">{a.name}</span>
                  <ExternalLink className="w-3 h-3 text-[#555] shrink-0" />
                </button>
                <span className="text-[10px] text-[#666] shrink-0 tabular-nums">{formatSize(a.size)}</span>
                {!readOnly && !disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(a)}
                    className="text-red-500 hover:text-red-400 p-0.5 cursor-pointer shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
