import jsPDF from 'jspdf';
import { Sale, Customer, BusinessSettings } from '../types';

const money = (v: number) => `N$ ${v.toFixed(2)}`;
const bizName = (s: BusinessSettings) => s.businessName || 'Butchery Control';

/** Normalise a local phone to WhatsApp's international digits (Namibia default: 0xx → 264xx). */
export function waNumber(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = '264' + digits.slice(1);
  return digits;
}

/** Plain-text receipt used for WhatsApp / SMS bodies. */
export function formatSaleText(sale: Sale, settings: BusinessSettings): string {
  const lines: string[] = [];
  lines.push(`*${bizName(settings)}*`);
  lines.push(`Receipt #${sale.id}`);
  lines.push(new Date(sale.date).toLocaleString());
  lines.push('');
  sale.items.forEach((i) => {
    lines.push(`${i.product.name}  ${i.quantity}${i.product.unit} x ${i.product.price.toFixed(2)} = ${money(i.subtotal)}`);
  });
  lines.push('');
  lines.push(`TOTAL: ${money(sale.total)}`);
  lines.push(`Payment: ${sale.paymentType}${sale.customerName ? ` (${sale.customerName})` : ''}`);
  if (settings.receiptFooter) {
    lines.push('');
    lines.push(settings.receiptFooter);
  }
  return lines.join('\n');
}

/** PDF receipt for download. */
export function buildSalePdf(sale: Sale, settings: BusinessSettings): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const left = 40;
  let y = 48;
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.text(bizName(settings), left, y);
  y += 18;
  doc.setFontSize(9).setFont('helvetica', 'normal');
  settings.businessAddress.split('\n').forEach((l) => { doc.text(l, left, y); y += 12; });
  if (settings.businessPhone) { doc.text(settings.businessPhone, left, y); y += 12; }
  y += 6;
  doc.setFont('helvetica', 'bold').text(`Receipt #${sale.id}`, left, y);
  doc.setFont('helvetica', 'normal').text(new Date(sale.date).toLocaleString(), 220, y);
  y += 10;
  doc.line(left, y, 380, y); y += 16;

  doc.setFontSize(10);
  sale.items.forEach((i) => {
    doc.text(i.product.name, left, y);
    doc.text(`${i.quantity}${i.product.unit} x ${i.product.price.toFixed(2)}`, 220, y);
    doc.text(money(i.subtotal), 300, y);
    y += 14;
  });
  y += 4;
  doc.line(left, y, 380, y); y += 18;
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('TOTAL', left, y);
  doc.text(money(sale.total), 300, y);
  y += 18;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(`Payment: ${sale.paymentType}${sale.customerName ? ` — ${sale.customerName}` : ''}`, left, y);
  y += 24;
  if (settings.receiptFooter) doc.text(settings.receiptFooter, left, y);
  return doc;
}

/** Plain-text account statement for WhatsApp / SMS. */
export function formatStatementText(customer: Customer, sales: Sale[], settings: BusinessSettings): string {
  const lines: string[] = [];
  lines.push(`*${bizName(settings)}* — Account Statement`);
  lines.push(customer.name);
  lines.push(new Date().toLocaleDateString());
  lines.push('');
  const credit = sales.filter((s) => s.customerId === customer.id && s.paymentType === 'Credit' && s.status !== 'Voided');
  credit.forEach((s) => lines.push(`${new Date(s.date).toLocaleDateString()}  #${s.id}  ${money(s.total)}`));
  (customer.charges ?? []).forEach((c) => lines.push(`${new Date(c.date).toLocaleDateString()}  Interest  ${money(c.amount)}`));
  (customer.payments ?? []).forEach((p) => lines.push(`${new Date(p.date).toLocaleDateString()}  Payment  -${money(p.amount)}`));
  lines.push('');
  lines.push(`*Outstanding balance: ${money(customer.balance)}*`);
  return lines.join('\n');
}

/** PDF account statement for download. */
export function buildStatementPdf(customer: Customer, sales: Sale[], settings: BusinessSettings): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 48;
  let y = 56;
  doc.setFontSize(18).setFont('helvetica', 'bold').text(bizName(settings), left, y);
  y += 22;
  doc.setFontSize(12).setFont('helvetica', 'normal').text('Account Statement', left, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(customer.name, left, y);
  doc.text(new Date().toLocaleDateString(), 460, y);
  y += 8;
  doc.line(left, y, 548, y); y += 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Date', left, y); doc.text('Description', 130, y); doc.text('Amount', 480, y);
  y += 6; doc.line(left, y, 548, y); y += 16;
  doc.setFont('helvetica', 'normal');

  const rows: { date: Date; desc: string; amount: number }[] = [];
  sales.filter((s) => s.customerId === customer.id && s.paymentType === 'Credit' && s.status !== 'Voided')
    .forEach((s) => rows.push({ date: new Date(s.date), desc: `Credit sale #${s.id}`, amount: s.total }));
  (customer.charges ?? []).forEach((c) => rows.push({ date: new Date(c.date), desc: 'Interest charge', amount: c.amount }));
  (customer.payments ?? []).forEach((p) => rows.push({ date: new Date(p.date), desc: `Payment (${p.method})`, amount: -p.amount }));
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  rows.forEach((r) => {
    doc.text(r.date.toLocaleDateString(), left, y);
    doc.text(r.desc, 130, y);
    doc.text(`${r.amount < 0 ? '-' : ''}${money(Math.abs(r.amount))}`, 480, y);
    y += 15;
    if (y > 780) { doc.addPage(); y = 56; }
  });
  y += 6; doc.line(left, y, 548, y); y += 20;
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('Outstanding balance', left, y);
  doc.text(money(customer.balance), 480, y);
  return doc;
}
