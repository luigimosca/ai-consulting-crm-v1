'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCentsToCurrency, parseInputToCents, calcLineTotal } from '@/lib/money';
import {
  FileText,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Plus,
  Printer,
  ShieldCheck,
  Briefcase,
  History,
  FileCheck,
  FileBadge,
  Sparkles,
  Check,
} from 'lucide-react';

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [quoteData, setQuoteData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [approvalsList, setApprovalsList] = useState<any[]>([]);
  const [orderRecord, setOrderRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'versions' | 'approvals'>('editor');

  // Modals
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptForm, setAcceptForm] = useState({
    decidedBy: '',
    decidedAt: new Date().toISOString().slice(0, 10),
    method: 'email_confirmation' as const,
    evidenceNotes: '',
    comment: '',
  });

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    createInitialProject: true,
    initialProjectTitle: '',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  });

  const [isInternalApproveModalOpen, setIsInternalApproveModalOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'approvata' | 'rifiutata'>('approvata');
  const [approvalComment, setApprovalComment] = useState('');

  const fetchQuote = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quotes/${id}?t=${Date.now()}`);
      if (!res.ok) {
        router.push('/crm/quotes');
        return;
      }
      const data = await res.json();
      setQuoteData(data.quote);
      setItems(
        (data.items || []).map((it: any) => ({
          ...it,
          unitPriceInput: (it.unitPrice / 100).toString(),
        }))
      );
      setVersions(data.versions || []);
      setApprovalsList(data.approvals || []);
      setOrderRecord(data.order || null);

      if (data.quote) {
        setConvertForm((prev) => ({
          ...prev,
          initialProjectTitle: `Progetto: ${data.quote.title}`,
          dueDate: data.quote.validUntil || '',
        }));
      }
    } catch (err) {
      console.error('Failed to load quote detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const isEditable = quoteData?.status === 'bozza';

  const handleAddItem = () => {
    if (!isEditable) return;
    setItems([
      ...items,
      {
        id: `temp_${Date.now()}`,
        description: '',
        quantity: 1,
        unitPriceInput: '1000',
        unitPrice: 100000,
        discountPercent: 0,
        taxRate: 22.0,
        costType: 'one_time',
        lineTotal: 100000,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (!isEditable || items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    if (!isEditable) return;
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'unitPriceInput' || field === 'quantity' || field === 'discountPercent') {
      const unitCents = parseInputToCents(updated[index].unitPriceInput);
      const qty = Number(updated[index].quantity) || 1;
      const disc = Number(updated[index].discountPercent) || 0;
      updated[index].unitPrice = unitCents;
      updated[index].lineTotal = calcLineTotal(qty, unitCents, disc);
    }

    setItems(updated);
  };

  const handleSaveChanges = async () => {
    if (!isEditable) return;
    setIsSaving(true);
    try {
      const formattedItems = items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: parseInputToCents(it.unitPriceInput),
        discountPercent: Number(it.discountPercent) || 0,
        costType: it.costType,
        taxRate: Number(it.taxRate) || 22.0,
        notes: it.notes || null,
      }));

      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quoteData.title,
          validUntil: quoteData.validUntil,
          paymentTerms: quoteData.paymentTerms,
          deliveryTerms: quoteData.deliveryTerms,
          notes: quoteData.notes,
          items: formattedItems,
        }),
      });

      if (res.ok) {
        await fetchQuote();
      }
    } catch (err) {
      console.error('Failed to save changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_approval' }),
      });
      if (res.ok) fetchQuote();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInternalApprovalDecision = async () => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide_internal_approval',
          decision: approvalDecision,
          comment: approvalComment,
        }),
      });
      if (res.ok) {
        setIsInternalApproveModalOpen(false);
        fetchQuote();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendClient = async () => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_client' }),
      });
      if (res.ok) fetchQuote();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptForm.decidedBy.trim() || !acceptForm.evidenceNotes.trim()) return;

    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_client',
          ...acceptForm,
        }),
      });
      if (res.ok) {
        setIsAcceptModalOpen(false);
        fetchQuote();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'convert_to_order',
          createInitialProject: convertForm.createInitialProject,
          initialProjectTitle: convertForm.initialProjectTitle,
          startDate: convertForm.startDate,
          dueDate: convertForm.dueDate,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsConvertModalOpen(false);
        if (data.order?.id) {
          router.push(`/crm/commesse/${data.order.id}`);
        } else {
          fetchQuote();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNewVersion = async () => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'new_version' }),
      });
      if (res.ok) fetchQuote();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !quoteData) {
    return <div className="p-12 text-center text-slate-400">Caricamento preventivo in corso...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/crm/quotes" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="font-mono font-bold text-lg text-blue-400">{quoteData.quoteNumber}</span>
            <Badge variant="outline" className="text-xs uppercase">
              {quoteData.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
              v{quoteData.currentVersionNumber}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white mt-2">{quoteData.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Data creazione: {new Date(quoteData.createdAt).toLocaleDateString('it-IT')} • Valido fino a: {quoteData.validUntil || 'Non specificata'}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/crm/quotes/${id}/preview`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Printer className="h-4 w-4" />
              <span>Anteprima / Stampa PDF</span>
            </Button>
          </Link>

          {/* Workflow Stage Buttons */}
          {quoteData.status === 'bozza' && (
            <>
              <Button size="sm" variant="outline" onClick={handleSaveChanges} disabled={isSaving} className="text-xs">
                {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
              <Button size="sm" onClick={handleRequestApproval} className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white">
                <ShieldCheck className="h-4 w-4" />
                <span>Richiedi Approvazione Interna</span>
              </Button>
            </>
          )}

          {quoteData.status === 'in_approvazione_interna' && (
            <Button size="sm" onClick={() => setIsInternalApproveModalOpen(true)} className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white">
              <ShieldCheck className="h-4 w-4" />
              <span>Revisione & Approvazione (Admin)</span>
            </Button>
          )}

          {quoteData.status === 'approvato_internamente' && (
            <Button size="sm" onClick={handleSendClient} className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white">
              <Send className="h-4 w-4" />
              <span>Segna come Inviato al Cliente</span>
            </Button>
          )}

          {quoteData.status === 'inviato' && (
            <Button size="sm" onClick={() => setIsAcceptModalOpen(true)} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              <CheckCircle2 className="h-4 w-4" />
              <span>Registra Accettazione Formale</span>
            </Button>
          )}

          {quoteData.status === 'accettato' && !orderRecord && (
            <Button size="sm" onClick={() => setIsConvertModalOpen(true)} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20">
              <Briefcase className="h-4 w-4" />
              <span>Crea Commessa Operativa</span>
            </Button>
          )}

          {orderRecord && (
            <Link href={`/crm/commesse/${orderRecord.id}`}>
              <Button size="sm" className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                <Briefcase className="h-4 w-4" />
                <span>Vai alla Commessa ({orderRecord.code})</span>
              </Button>
            </Link>
          )}

          {quoteData.status !== 'bozza' && (
            <Button size="sm" variant="outline" onClick={handleCreateNewVersion} className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              <span>Crea Nuova Versione</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('editor')}
          className={`pb-2.5 px-1 border-b-2 transition-colors ${
            activeTab === 'editor' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Dettagli & Voci Preventivo
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`pb-2.5 px-1 border-b-2 transition-colors ${
            activeTab === 'versions' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Storico Versioni Immutabili ({versions.length})
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-2.5 px-1 border-b-2 transition-colors ${
            activeTab === 'approvals' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Registro Approvazioni & Evidenze ({approvalsList.length})
        </button>
      </div>

      {/* Tab 1: Editor */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Line Items Table */}
            <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-900/40 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-200">Voci & Deliverables Contrattuali</CardTitle>
                {isEditable && (
                  <Button size="sm" variant="outline" onClick={handleAddItem} className="text-xs h-7">
                    + Aggiungi Voce
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 font-semibold uppercase">
                        <th className="py-2.5 px-3">Descrizione</th>
                        <th className="py-2.5 px-2 w-16 text-center">Q.tà</th>
                        <th className="py-2.5 px-2 w-28 text-right">Prezzo Unit.</th>
                        <th className="py-2.5 px-2 w-20 text-center">Sconto %</th>
                        <th className="py-2.5 px-2 w-28 text-right">Totale Rigo</th>
                        {isEditable && <th className="py-2.5 px-2 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {items.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-900/30">
                          <td className="p-2.5">
                            {isEditable ? (
                              <Input
                                value={it.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                className="bg-slate-900 text-xs"
                                placeholder="Descrizione voce"
                              />
                            ) : (
                              <span className="font-medium text-slate-200">{it.description}</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isEditable ? (
                              <Input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="bg-slate-900 text-xs text-center"
                              />
                            ) : (
                              <span>{it.quantity}</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {isEditable ? (
                              <Input
                                value={it.unitPriceInput}
                                onChange={(e) => handleItemChange(idx, 'unitPriceInput', e.target.value)}
                                className="bg-slate-900 text-xs text-right font-mono"
                              />
                            ) : (
                              <span>{formatCentsToCurrency(it.unitPrice)}</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isEditable ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={it.discountPercent}
                                onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                                className="bg-slate-900 text-xs text-center"
                              />
                            ) : (
                              <span>{it.discountPercent}%</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-100">
                            {formatCentsToCurrency(it.lineTotal)}
                          </td>
                          {isEditable && (
                            <td className="p-2 text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card className="bg-slate-950 border-slate-800 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Condizioni Contrattuali & Pagamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Termini di Pagamento</label>
                  {isEditable ? (
                    <Input
                      value={quoteData.paymentTerms || ''}
                      onChange={(e) => setQuoteData({ ...quoteData, paymentTerms: e.target.value })}
                      className="bg-slate-900 text-xs"
                    />
                  ) : (
                    <p className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200">{quoteData.paymentTerms}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tempi di Consegna & Rilascio</label>
                  {isEditable ? (
                    <Input
                      value={quoteData.deliveryTerms || ''}
                      onChange={(e) => setQuoteData({ ...quoteData, deliveryTerms: e.target.value })}
                      className="bg-slate-900 text-xs"
                    />
                  ) : (
                    <p className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200">{quoteData.deliveryTerms}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Totals & Summary */}
          <div className="space-y-6">
            <Card className="bg-slate-950 border-slate-800 p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                Riepilogo Finanziario (Server-Calculated)
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Imponibile Lordo:</span>
                  <span className="font-mono font-medium text-slate-200">{formatCentsToCurrency(quoteData.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Sconti Applicati:</span>
                  <span className="font-mono font-medium text-rose-400">-{formatCentsToCurrency(quoteData.discountTotal)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>IVA ({quoteData.taxRate || 22}%):</span>
                  <span className="font-mono font-medium text-slate-200">{formatCentsToCurrency(quoteData.taxTotal)}</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Totale Preventivo:</span>
                  <span className="text-lg font-mono font-bold text-blue-400">
                    {formatCentsToCurrency(quoteData.totalAmount, quoteData.currency)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Commercial Status Card */}
            <Card className="bg-slate-950 border-slate-800 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Stato Avanzamento
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span className="text-slate-300">Bozza & Computo Voci</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${quoteData.status !== 'bozza' ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                  <span className="text-slate-300">Approvazione Interna</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${quoteData.status === 'inviato' || quoteData.status === 'accettato' ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                  <span className="text-slate-300">Invio al Cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${quoteData.status === 'accettato' ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                  <span className="text-slate-300">Accettazione Formale</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${orderRecord ? 'bg-indigo-500' : 'bg-slate-700'}`}></span>
                  <span className="text-slate-300">Commessa Generata</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Version History */}
      {activeTab === 'versions' && (
        <Card className="bg-slate-950 border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Registro Snapshot Versioni Immutabili</h3>
          <div className="space-y-3">
            {versions.map((v) => (
              <div key={v.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400">Versione {v.versionNumber}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {v.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Congelato il {new Date(v.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-slate-100">{formatCentsToCurrency(v.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: Approvals Log */}
      {activeTab === 'approvals' && (
        <Card className="bg-slate-950 border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Registro Approvazioni & Evidenze Formali</h3>
          <div className="space-y-3">
            {approvalsList.length === 0 ? (
              <p className="text-xs text-slate-400">Nessuna approvazione registrata finora.</p>
            ) : (
              approvalsList.map((app) => (
                <div key={app.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={app.approvalType === 'internal' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}>
                        {app.approvalType === 'internal' ? 'Approvazione Interna' : 'Accettazione Cliente'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-200 uppercase">{app.status}</span>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(app.createdAt).toLocaleString('it-IT')}</span>
                  </div>

                  <p className="text-xs text-slate-300">{app.comment || 'Nessun commento'}</p>

                  {app.evidenceNotes && (
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs text-slate-300">
                      <span className="font-semibold text-slate-400 block mb-0.5">Evidenza Formale / Dati Ricezione:</span>
                      {app.evidenceNotes}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-1">
                    <span>Richiesto da: {app.requesterName || 'Admin'}</span>
                    {app.decidedBy && <span>Deciso da: {app.decidedBy}</span>}
                    {app.method && <span>Metodo: {app.method}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Modal: Client Acceptance */}
      <Dialog isOpen={isAcceptModalOpen} onClose={() => setIsAcceptModalOpen(false)} title="Registra Accettazione del Cliente">
        <form onSubmit={handleRecordAcceptance} className="space-y-4 text-xs">
          <p className="text-slate-400">
            Per conformità operativa, l&apos;accettazione formale richiede l&apos;indicazione del referente cliente e dell&apos;evidenza dell&apos;accettazione.
          </p>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Nome Referente Cliente che ha Accettato *</label>
            <Input
              required
              placeholder="Es. Mario Rossi (Amministratore Delegato)"
              value={acceptForm.decidedBy}
              onChange={(e) => setAcceptForm({ ...acceptForm, decidedBy: e.target.value })}
              className="bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Data Accettazione</label>
              <Input
                type="date"
                value={acceptForm.decidedAt}
                onChange={(e) => setAcceptForm({ ...acceptForm, decidedAt: e.target.value })}
                className="bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Metodo Accettazione *</label>
              <Select
                value={acceptForm.method}
                onChange={(e) => setAcceptForm({ ...acceptForm, method: e.target.value as any })}
                className="bg-slate-900"
              >
                <option value="email_confirmation">Conferma via Email PEC/Ordinaria</option>
                <option value="signed_document">Documento / Preventivo Firmato</option>
                <option value="verbal_with_notes">Verbale di accordo telefonico/di persona</option>
                <option value="portal_action">Approvazione su Portale / Chatbot</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Evidenza Formale & Riferimenti *</label>
            <textarea
              required
              rows={3}
              placeholder="Es. Email ricevuta il 26/09 alle 10:45 da mario.rossi@azienda.it con allegato timbrato e firmato."
              value={acceptForm.evidenceNotes}
              onChange={(e) => setAcceptForm({ ...acceptForm, evidenceNotes: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAcceptModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Salva Accettazione Formale
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Convert To Commessa */}
      <Dialog isOpen={isConvertModalOpen} onClose={() => setIsConvertModalOpen(false)} title="Genera Commessa Operativa">
        <form onSubmit={handleConvertToOrder} className="space-y-4 text-xs">
          <p className="text-slate-400">
            La commessa congela il valore concordato ({formatCentsToCurrency(quoteData.totalAmount)}) e crea il contenitore operativo per i progetti e le attività dell&apos;agenzia.
          </p>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
            <label className="flex items-center gap-2 text-slate-200 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={convertForm.createInitialProject}
                onChange={(e) => setConvertForm({ ...convertForm, createInitialProject: e.target.checked })}
                className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>Crea automaticamente un Progetto Iniziale da Template</span>
            </label>

            {convertForm.createInitialProject && (
              <Input
                placeholder="Titolo Progetto Iniziale"
                value={convertForm.initialProjectTitle}
                onChange={(e) => setConvertForm({ ...convertForm, initialProjectTitle: e.target.value })}
                className="bg-slate-950 mt-2"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Data Inizio Commessa</label>
              <Input
                type="date"
                value={convertForm.startDate}
                onChange={(e) => setConvertForm({ ...convertForm, startDate: e.target.value })}
                className="bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Data Scadenza Prevista</label>
              <Input
                type="date"
                value={convertForm.dueDate}
                onChange={(e) => setConvertForm({ ...convertForm, dueDate: e.target.value })}
                className="bg-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsConvertModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Conferma e Crea Commessa
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Internal Approval Decision */}
      <Dialog isOpen={isInternalApproveModalOpen} onClose={() => setIsInternalApproveModalOpen(false)} title="Revisione & Approvazione Interna (Admin)">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Esito Decisione *</label>
            <Select
              value={approvalDecision}
              onChange={(e) => setApprovalDecision(e.target.value as any)}
              className="bg-slate-900"
            >
              <option value="approvata">Approva Preventivo (Pronto per invio al cliente)</option>
              <option value="rifiutata">Richiedi Revisione (Torna in Bozza)</option>
            </Select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Note / Commento del Revisore</label>
            <textarea
              rows={3}
              placeholder="Inserisci eventuali note sulla marginalità, pricing o condizioni..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsInternalApproveModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleInternalApprovalDecision} className="bg-blue-600 hover:bg-blue-500 text-white">
              Registra Decisione
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
