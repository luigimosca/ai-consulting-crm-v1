'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCentsToCurrency, parseInputToCents } from '@/lib/money';
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

        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
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
      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crea Nuovo Preventivo">
        <form onSubmit={handleCreateQuote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Lead / Azienda Cliente
            </label>
            <Select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="bg-slate-900 border-slate-800"
            >
              <option value="">Seleziona un Lead esistente (opzionale)</option>
              {leadsList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.companyName} ({l.city || l.sector})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Oggetto del Preventivo *
            </label>
            <Input
              required
              placeholder="Es. Sviluppo Assistente Virtuale & Automazione Prenotazioni"
              value={quoteTitle}
              onChange={(e) => setQuoteTitle(e.target.value)}
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Data Validità Offerta
            </label>
            <Input
              type="date"
              value={validUntilDate}
              onChange={(e) => setValidUntilDate(e.target.value)}
              className="bg-slate-900 border-slate-800"
            />
          </div>

          {/* Dynamic Line Items */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Voci del Preventivo
              </span>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="text-xs h-7">
                + Aggiungi Voce
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div key={idx} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                  <Input
                    required
                    placeholder="Descrizione prestazione/servizio"
                    value={it.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="bg-slate-950 text-xs flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Q.tà"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="bg-slate-950 text-xs w-16"
                  />
                  <div className="flex items-center gap-1 w-24">
                    <Input
                      type="text"
                      placeholder="€ Prezzo"
                      value={it.unitPriceInput}
                      onChange={(e) => handleItemChange(idx, 'unitPriceInput', e.target.value)}
                      className="bg-slate-950 text-xs"
                    />
                  </div>
                  <Select
                    value={it.costType}
                    onChange={(e) => handleItemChange(idx, 'costType', e.target.value)}
                    className="bg-slate-950 text-xs w-28"
                  >
                    <option value="one_time">Una Tantum</option>
                    <option value="recurring_monthly">Canone Mensile</option>
                    <option value="recurring_yearly">Canone Annuo</option>
                  </Select>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creazione in corso...' : 'Salva Preventivo in Bozza'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
