import type { DocumentKind } from '../types';

/**
 * Best-effort, **free & client-side** extraction of the key fields from an invoice
 * or bank statement (supplier/ref, document number, date, amount) so the Documents
 * hub can auto-fill them. No AI / no API key / no server:
 *   - digital PDFs → text layer via pdf.js (accurate)
 *   - scanned PDFs / photos → OCR via tesseract.js (WASM, in the browser)
 *   - the raw text is then parsed with plain heuristics (see {@link parseFields})
 *
 * Heavy deps (pdf.js, tesseract.js) are loaded with dynamic import() so they only
 * download on the first upload and never bloat the initial bundle. Parsing is a
 * pure function, importable in isolation for tests (`npx tsx`).
 */

export interface ExtractedFields {
  reference?: string;
  docNumber?: string;
  docDate?: string; // yyyy-mm-dd
  amount?: number;
}

// ---------------------------------------------------------------------------
// Pure parsing (no browser APIs) — unit-testable
// ---------------------------------------------------------------------------

/** Turn a raw money-looking string into a number, coping with `.`/`,` conventions. */
export function parseMoney(raw: string): number | undefined {
  let s = raw.replace(/[^\d.,]/g, '');
  if (!s) return undefined;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // The right-most separator is the decimal one.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length === 2) s = parts[0] + '.' + parts[1];
    else s = s.replace(/,/g, '');
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2) {
      const dec = parts.pop();
      s = parts.join('') + '.' + dec;
    }
  }
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function isValidYmd(y: number, m: number, d: number): boolean {
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

/** First plausible date in the text, normalized to `yyyy-mm-dd`. Prefers lines mentioning "date". */
export function parseDate(text: string): string | undefined {
  const candidates: { ymd: string; onDateLine: boolean }[] = [];
  const lines = text.split(/\n/);
  const dateKw = /(date|data|dated|issued)/i;

  const push = (y: number, m: number, d: number, line: string) => {
    if (isValidYmd(y, m, d)) candidates.push({ ymd: `${y}-${pad(m)}-${pad(d)}`, onDateLine: dateKw.test(line) });
  };

  for (const line of lines) {
    let m: RegExpExecArray | null;

    // yyyy-mm-dd
    const iso = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
    while ((m = iso.exec(line))) push(Number(m[1]), Number(m[2]), Number(m[3]), line);

    // dd/mm/yyyy (day-first, the local convention)
    const dmy = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g;
    while ((m = dmy.exec(line))) push(normalizeYear(Number(m[3])), Number(m[2]), Number(m[1]), line);

    // dd Mon yyyy  /  Mon dd, yyyy
    const dMonY = /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/g;
    while ((m = dMonY.exec(line))) {
      const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mon) push(Number(m[3]), mon, Number(m[1]), line);
    }
    const monDY = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g;
    while ((m = monDY.exec(line))) {
      const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (mon) push(Number(m[3]), mon, Number(m[2]), line);
    }
  }

  if (candidates.length === 0) return undefined;
  const preferred = candidates.find((c) => c.onDateLine);
  return (preferred ?? candidates[0]).ymd;
}

/** Total amount: the largest 2-decimal figure, favouring lines that mention a total/balance. */
export function parseAmount(text: string, kind: DocumentKind): number | undefined {
  const totalKw = kind === 'bank-statement'
    ? /(closing balance|balance|total)/i
    : /(total|amount due|balance due|grand total|amount payable|a pagar|total due|montante)/i;
  const tokenRe = /\d[\d.,  ]*\d|\d/g;

  const found: { value: number; hasDecimals: boolean; onTotal: boolean }[] = [];
  for (const line of text.split(/\n/)) {
    const onTotal = totalKw.test(line);
    const tokens = line.match(tokenRe);
    if (!tokens) continue;
    for (const t of tokens) {
      const cleaned = t.replace(/[  ]/g, '');
      const value = parseMoney(cleaned);
      if (value === undefined || value <= 0) continue;
      found.push({ value, hasDecimals: /[.,]\d{2}$/.test(cleaned), onTotal });
    }
  }
  const decimals = found.filter((f) => f.hasDecimals);
  const onTotalDecimals = decimals.filter((f) => f.onTotal);
  const pool = onTotalDecimals.length ? onTotalDecimals : decimals;
  if (pool.length === 0) return undefined;
  return Math.max(...pool.map((f) => f.value));
}

/** Invoice / statement number following a keyword or `#`. */
export function parseDocNumber(text: string): string | undefined {
  const re = /(?:invoice|inv|fatura|receipt|statement|ref(?:erence)?|no\.?|n[ºo°]|#)\s*[:#.\-]?\s*([A-Za-z0-9][A-Za-z0-9\-/]{2,})/gi;
  const isDate = (s: string) => /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(s);
  const cands: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) cands.push(m[1].trim());
  // A real invoice/statement number contains a digit; prefer those, skip dates.
  return cands.find((c) => /\d/.test(c) && !isDate(c)) ?? cands.find((c) => !isDate(c));
}

/** Supplier / bank name — best-effort: a headline-ish top line with letters. */
export function parseReference(text: string, kind: DocumentKind): string | undefined {
  const skip = /^(tax\s+)?(invoice|receipt|statement|bank\s+statement|quotation|credit\s+note|proforma)\s*$/i;
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  if (kind === 'bank-statement') {
    const bank = lines.find((l) => /\b(bank|fnb|standard|nedbank|bank\s?windhoek|absa)\b/i.test(l));
    if (bank) return bank.slice(0, 60);
  }
  for (const l of lines.slice(0, 8)) {
    const letters = (l.match(/[A-Za-z]/g) || []).length;
    if (letters >= 3 && !skip.test(l) && !/^\d/.test(l) && l.length <= 60) return l;
  }
  return undefined;
}

/** Parse all fields out of already-extracted text. Pure — safe to unit test. */
export function parseFields(text: string, kind: DocumentKind): ExtractedFields {
  const out: ExtractedFields = {};
  const reference = parseReference(text, kind);
  const docNumber = parseDocNumber(text);
  const docDate = parseDate(text);
  const amount = parseAmount(text, kind);
  if (reference) out.reference = reference;
  if (docNumber) out.docNumber = docNumber;
  if (docDate) out.docDate = docDate;
  if (amount !== undefined) out.amount = amount;
  return out;
}

// ---------------------------------------------------------------------------
// Text extraction (browser-only: pdf.js + tesseract.js, dynamically imported)
// ---------------------------------------------------------------------------

async function ocrImage(image: HTMLCanvasElement | File): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(image, 'eng');
  return data.text ?? '';
}

async function loadPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  return pdfjs.getDocument({ data: buf }).promise;
}

async function pdfToText(file: File): Promise<string> {
  const doc = await loadPdf(file);
  const pages = Math.min(doc.numPages, 2);
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += (content.items as { str?: string }[]).map((it) => it.str ?? '').join(' ') + '\n';
  }
  if (text.trim().length >= 20) return text; // digital PDF — text layer is enough

  // Scanned PDF — rasterize the first page and OCR it.
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return text;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return ocrImage(canvas);
}

/**
 * Extract the fields from an uploaded document. Never throws for content reasons —
 * on any failure it resolves to `{}` so the caller falls back to manual entry.
 */
export async function extractDocumentData(file: File, kind: DocumentKind): Promise<ExtractedFields> {
  try {
    const text = file.type === 'application/pdf' ? await pdfToText(file) : await ocrImage(file);
    return parseFields(text, kind);
  } catch {
    return {};
  }
}
