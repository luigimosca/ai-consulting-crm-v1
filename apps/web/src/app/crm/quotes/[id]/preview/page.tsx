'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { formatCentsToCurrency } from '@/lib/money';
import { Printer, ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function QuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [lead, setLead] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [sender, setSender] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quotes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setQuote(data.quote);
          setItems(data.items || []);
          setLead(data.lead || null);
          setCompany(data.company || null);
          setSender(data.senderSettings || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading || !quote) {
    return <div className="p-12 text-center text-slate-400">Caricamento anteprima preventivo...</div>;
  }

  const clientName = lead?.companyName || company?.name || 'Spett.le Cliente';
  const clientAddress = lead?.address || company?.address || '';
  const clientCity = lead?.city || company?.city || '';
  const clientVat = company?.vatId || '';
  const clientEmail = lead?.email || company?.email || '';
  const clientPhone = lead?.phone || company?.phone || '';

  // Active logo determination
  const logoChoice = sender?.quoteLogoChoice || 'primary';
  const logoDocId =
    logoChoice === 'dark'
      ? sender?.logoDarkDocumentId
      : logoChoice === 'primary'
      ? sender?.logoDocumentId
      : null;

  const brandDisplayName = sender?.brandName || sender?.legalName || 'AI Agency';
  const legalDisplayName = sender?.legalName
    ? sender?.legalForm
      ? `${sender.legalName} ${sender.legalForm}`
      : sender.legalName
    : '';

  const addressLine = [
    sender?.legalAddress,
    sender?.postalCode && sender?.city ? `${sender.postalCode} ${sender.city}` : sender?.city,
    sender?.province ? `(${sender.province})` : null,
    sender?.country && sender.country !== 'IT' ? sender.country : null,
  ]
    .filter(Boolean)
    .join(', ');

  const taxLine = [
    sender?.vatId ? `P.IVA ${sender.vatId}` : null,
    sender?.fiscalCode && sender.fiscalCode !== sender.vatId ? `C.F. ${sender.fiscalCode}` : null,
    sender?.sdiCode ? `SDI: ${sender.sdiCode}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const contactLine = [
    sender?.adminEmail ? `Email: ${sender.adminEmail}` : null,
    sender?.pec ? `PEC: ${sender.pec}` : null,
    sender?.phone ? `Tel: ${sender.phone}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      {/* Non-printable top action bar */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2 text-xs">
          <ArrowLeft className="h-4 w-4" />
          <span>Torna al Preventivo</span>
        </Button>

        <Button size="sm" onClick={() => window.print()} className="gap-2 text-xs bg-blue-600 hover:bg-blue-500">
          <Printer className="h-4 w-4" />
          <span>Stampa o Salva PDF</span>
        </Button>
      </div>

      {/* Printable Sheet (A4 Styled) */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 print:shadow-none print:rounded-none print:p-8 print:max-w-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-8 gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-3">
              {logoDocId ? (
                <img
                  src={`/api/documents/${logoDocId}/download`}
                  alt={brandDisplayName}
                  className="h-10 max-h-12 w-auto object-contain max-w-[180px]"
                />
              ) : (
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: sender?.primaryColor || '#2563eb' }}
                >
                  {brandDisplayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                  {brandDisplayName}
                </span>
                {legalDisplayName && legalDisplayName !== brandDisplayName && (
                  <span className="text-xs font-semibold text-slate-600 block">
                    {legalDisplayName}
                  </span>
                )}
              </div>
            </div>

            {sender?.tagline && (
              <p className="text-xs text-slate-600 font-medium italic pt-0.5">
                {sender.tagline}
              </p>
            )}

            {addressLine && (
              <p className="text-xs text-slate-500">
                {addressLine}
              </p>
            )}

            {taxLine && (
              <p className="text-xs text-slate-500 font-mono">
                {taxLine}
              </p>
            )}

            {contactLine && (
              <p className="text-xs text-slate-500">
                {contactLine}
              </p>
            )}

            {sender?.quoteHeaderNotes && (
              <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 italic">
                {sender.quoteHeaderNotes}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1 shrink-0">
            <div className="text-2xl font-black font-mono text-blue-600">{quote.quoteNumber}</div>
            <div className="text-xs font-semibold text-slate-600">Versione {quote.currentVersionNumber}</div>
            <div className="text-xs text-slate-500">
              Data Emissione: {new Date(quote.createdAt).toLocaleDateString('it-IT')}
            </div>
            {quote.validUntil && (
              <div className="text-xs text-slate-500 font-medium">
                Validità Offerta: {new Date(quote.validUntil).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
        </div>

        {/* Client Box */}
        <div className="my-8 p-5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Destinatario Proposta
            </span>
            <h2 className="text-base font-bold text-slate-900">{clientName}</h2>
            {clientAddress && <p className="text-xs text-slate-600 mt-0.5">{clientAddress}, {clientCity}</p>}
            {clientVat && <p className="text-xs text-slate-600">P.IVA / C.F.: {clientVat}</p>}
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5 self-end sm:self-auto">
            {clientEmail && <div>Email: {clientEmail}</div>}
            {clientPhone && <div>Tel: {clientPhone}</div>}
          </div>
        </div>

        {/* Object / Title */}
        <div className="mb-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Oggetto della Proposta
          </span>
          <h3 className="text-lg font-bold text-slate-900">{quote.title}</h3>
        </div>

        {/* Table Items */}
        <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Descrizione Servizio / Deliverable</th>
                <th className="py-3 px-3 text-center w-16">Q.tà</th>
                <th className="py-3 px-4 text-right w-28">Prezzo Unit.</th>
                <th className="py-3 px-3 text-center w-20">Sconto</th>
                <th className="py-3 px-4 text-right w-32">Importo Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-medium">
                    <div>{it.description}</div>
                    {it.costType === 'recurring_monthly' && (
                      <span className="text-[10px] text-blue-600 font-semibold uppercase block mt-0.5">Canone Mensile Ricorrente</span>
                    )}
                    {it.costType === 'recurring_yearly' && (
                      <span className="text-[10px] text-indigo-600 font-semibold uppercase block mt-0.5">Canone Annuo Ricorrente</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono">{it.quantity}</td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatCentsToCurrency(it.unitPrice)}</td>
                  <td className="py-3.5 px-3 text-center font-mono">{it.discountPercent > 0 ? `${it.discountPercent}%` : '-'}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatCentsToCurrency(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end mb-8">
          <div className="w-full sm:w-80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Totale Imponibile:</span>
              <span className="font-mono font-medium">{formatCentsToCurrency(quote.subtotal)}</span>
            </div>

            {quote.discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Sconto Complessivo:</span>
                <span className="font-mono font-medium">-{formatCentsToCurrency(quote.discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>IVA ({quote.taxRate || 22}%):</span>
              <span className="font-mono font-medium">{formatCentsToCurrency(quote.taxTotal)}</span>
            </div>

            <div className="pt-2 border-t-2 border-slate-900 flex justify-between text-sm font-bold text-slate-900">
              <span>TOTALE DOVUTO:</span>
              <span className="font-mono text-base text-blue-600">
                {formatCentsToCurrency(quote.totalAmount, quote.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="border-t border-slate-200 pt-6 space-y-3 text-xs text-slate-600 mb-12">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Condizioni e Termini di Fornitura</h4>
          <p>
            <strong>Modalità di Pagamento:</strong>{' '}
            {quote.paymentTerms || sender?.quoteDefaultTerms || '30% all\'avvio, 40% al rilascio beta, 30% al collaudo finale'}
          </p>
          {sender?.quotePaymentInstructions && (
            <p>
              <strong>Coordinate Bancarie / Istruzioni:</strong> {sender.quotePaymentInstructions}
            </p>
          )}
          <p>
            <strong>Tempi di Rilascio:</strong> {quote.deliveryTerms || '30 giorni lavorativi dall\'accettazione formale'}
          </p>
          {quote.notes && <p><strong>Note Particolari:</strong> {quote.notes}</p>}
          {sender?.quoteFooterText && (
            <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 whitespace-pre-line">
              {sender.quoteFooterText}
            </div>
          )}
        </div>

        {/* Signatures Box */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs text-slate-700">
          <div className="space-y-12">
            <span className="font-semibold block">
              Per {sender?.legalName || sender?.brandName || 'AI Agency'}
            </span>
            <div className="border-b border-slate-400 w-48"></div>
            <span className="text-[10px] text-slate-400 block">Firma del Legale Rappresentante</span>
          </div>

          <div className="space-y-12 text-right">
            <span className="font-semibold block">Per Accettazione il Cliente</span>
            <div className="border-b border-slate-400 w-48 ml-auto"></div>
            <span className="text-[10px] text-slate-400 block">Firma e Timbro per Accettazione Formale</span>
          </div>
        </div>
      </div>
    </div>
  );
}
