import type jsPDF from 'jspdf';
import { Printer, MessageCircle, MessageSquare, FileDown } from 'lucide-react';
import { waNumber } from '../lib/invoice';

interface InvoiceActionsProps {
  /** Recipient phone (WhatsApp/SMS disabled when empty). */
  phone?: string;
  /** Text body sent via WhatsApp / SMS. */
  message: string;
  /** Builds the PDF to download. */
  pdf: () => jsPDF;
  /** Download filename (without extension). */
  filename: string;
  /** Optional custom print handler (defaults to window.print). */
  onPrint?: () => void;
}

const btn =
  'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer border';

export default function InvoiceActions({ phone, message, pdf, filename, onPrint }: InvoiceActionsProps) {
  const num = phone ? waNumber(phone) : '';

  const sendWhatsApp = () => {
    if (!num) return;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
  };
  const sendSms = () => {
    if (!phone) return;
    window.open(`sms:${phone.replace(/\s/g, '')}?body=${encodeURIComponent(message)}`, '_self');
  };
  const download = () => pdf().save(`${filename}.pdf`);

  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={onPrint ?? (() => window.print())} className={`${btn} bg-white text-black border-gray-300 hover:bg-gray-100`}>
        <Printer className="w-4 h-4" /> Print
      </button>
      <button
        onClick={sendWhatsApp}
        disabled={!num}
        className={`${btn} bg-[#10B981] text-white border-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <MessageCircle className="w-4 h-4" /> WhatsApp
      </button>
      <button
        onClick={sendSms}
        disabled={!phone}
        className={`${btn} bg-[#222] text-white border-[#333] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <MessageSquare className="w-4 h-4" /> SMS
      </button>
      <button onClick={download} className={`${btn} bg-[#D42C2C] text-white border-[#D42C2C] hover:bg-[#B91C1C]`}>
        <FileDown className="w-4 h-4" /> PDF
      </button>
    </div>
  );
}
