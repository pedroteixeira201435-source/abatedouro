import { supabase } from './supabase';
import type { Attachment } from '../types';

/**
 * Supporting-document storage (invoices, bank statements, transfer proofs).
 *
 * Files live in the private Supabase Storage bucket `documents`, partitioned per
 * company: `${companyId}/${category}/${uuid}-${name}`. RLS on `storage.objects`
 * scopes every object to the caller's company (see migration 0003). Only the
 * lightweight {@link Attachment} metadata is kept in the synced snapshot — never
 * the binary — so realtime sync and localStorage stay small. No OCR/AI: we only
 * store and serve the file.
 */

export const BUCKET = 'documents';

/** Attachments require a signed-in Supabase session; disabled in local-only mode. */
export const attachmentsEnabled = !!supabase;

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

/** `accept` attribute for the file input. */
export const ACCEPT_ATTR = '.pdf,image/png,image/jpeg,image/webp';

export type AttachmentCategory =
  | 'purchases'
  | 'bank-statements'
  | 'payments'
  | 'assets';

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(-100);
}

/** Human-readable size, e.g. "1.2 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Upload a file and return its metadata to store on the record. Throws on failure. */
export async function uploadAttachment(
  companyId: string,
  category: AttachmentCategory,
  file: File,
  uploadedBy: string,
): Promise<Attachment> {
  if (!supabase) throw new Error('Sign in to attach documents.');
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error('Only PDF, PNG, JPEG or WebP files are allowed.');
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('File is too large (max 10 MB).');
  }

  const uuid = crypto.randomUUID();
  const path = `${companyId}/${category}/${uuid}-${sanitizeName(file.name)}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);

  return {
    id: uuid,
    name: file.name,
    path,
    mime: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };
}

/** A short-lived signed URL for viewing/downloading a private object. */
export async function attachmentUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Sign in to view documents.');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) throw new Error(error?.message ?? 'Could not open document.');
  return data.signedUrl;
}

/** Best-effort delete of the underlying object (metadata removal is the caller's job). */
export async function removeAttachment(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
