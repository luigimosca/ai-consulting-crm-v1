'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCentsToCurrency, parseInputToCents, calcLineTotal, calcQuoteTotals, formatDiscountDisplay } from '@/lib/money';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  XCircle,
  Eye,
  Trash2,
} from 'lucide-react';

export default function QuotesListPage() {
  const [quotesList, setQuotesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New Quote Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [quoteTitle, setQuoteTitle] = useState('');
  const [validUntilDate, setValidUntilDate] = useState('');
  const [items, setItems] = useState<any[]>([
    {
      description: 'Audit & Setup Architettura AI Personalizzata',
      quantity: 1,
      unitPriceInput: '2500',
      discountPercent: 0,
      costType: 'one_time',
    },
    {
      description: 'Sviluppo & Integrazione Chatbot RAG / Process Automation',
      quantity: 1,
      unitPriceInput: '3500',
      discountPercent: 0,
      costType: 'one_time',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      let url = `/api/quotes?t=${Date.now()}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuotesList(data.quotes || []);
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeadsList(data.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchLeads();
  }, [statusFilter]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unitPriceInput: '1000',
        discountPercent: 0,
        costType: 'one_time',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const calculatedTotals = useMemo(() => {
    const formatted = items.map((it) => ({
      quantity: Number(it.quantity) || 1,
      unitPrice: parseInputToCents(it.unitPriceInput),
      discountPercent: Number(it.discountPercent) || 0,
      taxRate: 22.0,
    }));
    return calcQuoteTotals(formatted);
  }, [items]);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTitle.trim() || items.length === 0) return;

    setIsSubmitting(true);
    try {
      const formattedItems = items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: parseInputToCents(it.unitPriceInput),
        discountPercent: Number(it.discountPercent) || 0,
        costType: it.costType,
      }));

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId || null,
          title: quoteTitle,
          validUntil: validUntilDate || null,
          items: formattedItems,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setQuoteTitle('');
        setSelectedLeadId('');
        fetchQuotes();
      }
    } catch (err) {
      console.error('Error creating quote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bozza':
        return <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-700">Bozza</Badge>;
      case 'in_approvazione_interna':
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">In Approvazione Interna</Badge>;
      case 'approvato_internamente':
        return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">Approvato Internamente</Badge>;
      case 'inviato':
        return <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30">Inviato al Cliente</Badge>;
      case 'accettato':
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Accettato Formale</Badge>;
      case 'rifiutato':
        return <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30">Rifiutato</Badge>;
      case 'scaduto':
        return <Badge variant="outline" className="bg-slate-700/50 text-slate-400 border-slate-600">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Preventivi & Proposte</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {quotesList.length} Totali
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestione del ciclo commerciale: bozze, revisioni immutabili, approvazioni e conversione in commessa.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4" />
          <span>Nuovo Preventivo</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per codice, titolo o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchQuotes()}
            className="pl-9 bg-slate-900/80 border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-full md:w-56"
          >
            <option value="all">Tutti gli stati</option>
            <option value="bozza">Bozza</option>
            <option value="in_approvazione_interna">In Approvazione Interna</option>
            <option value="approvato_internamente">Approvato Internamente</option>
            <option value="inviato">Inviato al Cliente</option>
            <option value="accettato">Accettato Formale</option>
            <option value="rifiutato">Rifiutato</option>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchQuotes} className="shrink-0">
            Filtra
          </Button>
        </div>
      </div>

      {/* Quotes Table */}
      <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Codice</th>
                <th className="py-3.5 px-4">Titolo & Cliente</th>
                <th className="py-3.5 px-4">Stato</th>
                <th className="py-3.5 px-4">Importo Totale</th>
                <th className="py-3.5 px-4">Versione</th>
                <th className="py-3.5 px-4">Creato Da</th>
                <th className="py-3.5 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Caricamento preventivi in corso...
                  </td>
                </tr>
              ) : quotesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nessun preventivo trovato. Clicca su &quot;Nuovo Preventivo&quot; per iniziare.
                  </td>
                </tr>
              ) : (
                quotesList.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {q.quoteNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{q.title}</div>
                      {q.leadCompanyName && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{q.leadCompanyName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {formatCentsToCurrency(q.totalAmount, q.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        v{q.currentVersionNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {q.creatorName || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/crm/quotes/${q.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Dettaglio</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create Quote */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crea Nuovo Preventivo"
        description="Definisci le informazioni commerciali, inserisci le prestazioni e visualizza il riepilogo in tempo reale."
        size="4xl"
      >
        <form onSubmit={handleCreateQuote} className="space-y-5">
          {/* General info fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Lead / Azienda Cliente
              </label>
              <Select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs"
              >
                <option value="">Seleziona un Lead esistente (opzionale)</option>
                {leadsList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.companyName} {l.city ? `(${l.city})` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data Validità Offerta
              </label>
              <Input
                type="date"
                value={validUntilDate}
                onChange={(e) => setValidUntilDate(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Oggetto del Preventivo / Titolo Proposta *
              </label>
              <Input
                required
                placeholder="Es. Sviluppo Assistente Virtuale AI & Automazione Processi"
                value={quoteTitle}
                onChange={(e) => setQuoteTitle(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Voci del Preventivo & Prestazioni
                </h3>
                <p className="text-[11px] text-slate-400">
                  Componi le righe con tariffe e sconti. Il conteggio economico è aggiornato in tempo reale.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItem}
                className="text-xs h-7 gap-1 bg-slate-800 hover:bg-slate-700 border-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Aggiungi Voce</span>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase">
                      <th className="py-2.5 px-3 min-w-[200px]">Descrizione Servizio / Deliverable</th>
                      <th className="py-2.5 px-2 w-20 text-center">Q.tà</th>
                      <th className="py-2.5 px-2 w-32 text-right">Prezzo Unit.</th>
                      <th className="py-2.5 px-2 w-24 text-center">Sconto</th>
                      <th className="py-2.5 px-2 w-36">Tipo Costo</th>
                      <th className="py-2.5 px-3 w-32 text-right">Totale Voce</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((it, idx) => {
                      const qty = Number(it.quantity) || 1;
                      const unitCents = parseInputToCents(it.unitPriceInput);
                      const disc = Number(it.discountPercent) || 0;
                      const rowTotalCents = calcLineTotal(qty, unitCents, disc);

                      return (
                        <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-2">
                            <Input
                              required
                              placeholder="Es. Setup & Integrazione Agente AI"
                              value={it.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="bg-slate-900 text-xs border-slate-800 focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="bg-slate-900 text-xs text-center border-slate-800"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="text"
                              prefix="€"
                              placeholder="0,00"
                              value={it.unitPriceInput}
                              onChange={(e) => handleItemChange(idx, 'unitPriceInput', e.target.value)}
                              className="bg-slate-900 text-xs text-right font-mono border-slate-800"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              suffix="%"
                              placeholder="0"
                              value={it.discountPercent || ''}
                              onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                              className="bg-slate-900 text-xs text-center font-mono border-slate-800"
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={it.costType}
                              onChange={(e) => handleItemChange(idx, 'costType', e.target.value)}
                              className="bg-slate-900 text-xs border-slate-800"
                            >
                              <option value="one_time">Una Tantum</option>
                              <option value="recurring_monthly">Canone Mensile</option>
                              <option value="recurring_yearly">Canone Annuo</option>
                            </Select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-100">
                            {formatCentsToCurrency(rowTotalCents)}
                          </td>
                          <td className="p-2 text-center">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded hover:bg-slate-800"
                                title="Rimuovi riga"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Financial Summary Breakdown in Modal */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              * IVA calcolata automaticamente al 22% su base imponibile netta
            </div>

            <div className="w-full sm:w-80 bg-slate-950 rounded-xl border border-slate-800 p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Imponibile Netto:</span>
                <span className="font-mono font-medium text-slate-200">
                  {formatCentsToCurrency(calculatedTotals.subtotal)}
                </span>
              </div>
              {calculatedTotals.discountTotal > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Sconti Applicati:</span>
                  <span className="font-mono font-medium">
                    {formatDiscountDisplay(calculatedTotals.discountTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>IVA (22%):</span>
                <span className="font-mono font-medium text-slate-200">
                  {formatCentsToCurrency(calculatedTotals.taxTotal)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                <span className="text-white">Totale Preventivo:</span>
                <span className="font-mono text-blue-400">
                  {formatCentsToCurrency(calculatedTotals.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-slate-800"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 font-semibold"
            >
              {isSubmitting ? 'Salvataggio in corso...' : 'Salva Preventivo in Bozza'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

