'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { GenerateClientRequestsModal } from './GenerateClientRequestsModal';
import {
  Inbox,
  Plus,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  KeyRound,
  Image,
  Globe,
  Share2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Paperclip,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  Lock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Calendar,
} from 'lucide-react';

interface ClientRequestsTabProps {
  projectId: string;
  projectTitle: string;
  projectCode: string;
  tasksList: any[];
  documentsList: any[];
  onRefreshProject: () => void;
}

export function ClientRequestsTab({
  projectId,
  projectTitle,
  projectCode,
  tasksList,
  documentsList,
  onRefreshProject,
}: ClientRequestsTabProps) {
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [blockingOnly, setBlockingOnly] = useState(false);

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Expanded requests & Comments state
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [isInternalComment, setIsInternalComment] = useState<Record<string, boolean>>({});
  const [isSendingComment, setIsSendingComment] = useState<Record<string, boolean>>({});

  // Item Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormValues, setItemFormValues] = useState<Record<string, any>>({});
  const [isSavingItem, setIsSavingItem] = useState<Record<string, boolean>>({});

  // Add Item to existing request modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [targetRequestForNewItem, setTargetRequestForNewItem] = useState<string | null>(null);
  const [newItemForm, setNewItemForm] = useState({
    title: '',
    description: '',
    type: 'text',
    placeholder: '',
    isRequired: true,
    options: '',
  });

  // Manual Request Form State
  const [manualForm, setManualForm] = useState({
    title: '',
    description: '',
    category: 'CUSTOM',
    priority: 'media',
    dueDate: '',
    blocking: true,
    linkedTaskIds: [] as string[],
    items: [
      {
        title: '',
        description: '',
        type: 'text',
        placeholder: '',
        isRequired: true,
        options: '',
      },
    ],
  });

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/client-requests?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setRequestsList(data.requests || []);
        setSummaryData(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to load client requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [projectId]);

  // Status & Category Badges Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return (
          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>In Attesa Cliente</span>
          </Badge>
        );
      case 'partially_received':
        return (
          <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30 gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-blue-400" />
            <span>Parzialmente Ricevuto</span>
          </Badge>
        );
      case 'received':
        return (
          <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30 gap-1 text-[11px]">
            <FileText className="h-3 w-3 text-purple-400" />
            <span>Ricevuto</span>
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3 text-amber-400" />
            <span>Da Revisionare</span>
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Approvato</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30 gap-1 text-[11px]">
            <X className="h-3 w-3 text-rose-400" />
            <span>Integrazioni Richieste</span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-slate-900 text-slate-500 border-slate-800 text-[11px]">
            Annullato
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'BRAND':
        return <Globe className="h-3.5 w-3.5 text-blue-400" />;
      case 'CONTENUTI':
        return <FileText className="h-3.5 w-3.5 text-indigo-400" />;
      case 'ASSET':
        return <Image className="h-3.5 w-3.5 text-emerald-400" />;
      case 'ACCESSI':
        return <KeyRound className="h-3.5 w-3.5 text-amber-400" />;
      case 'STRATEGIA':
        return <Share2 className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Layers className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  // Actions
  const handleApproveRequest = async (requestId: string) => {
    if (!confirm('Confermi l\'approvazione completa di questa richiesta? Eventuali attività bloccate verranno sbloccate.')) {
      return;
    }
    try {
      const res = await fetch(`/api/client-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Richiesta verificata e approvata con successo.' }),
      });
      if (res.ok) {
        fetchRequests();
        onRefreshProject();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante l\'approvazione');
      }
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleOpenRejectModal = (requestId: string) => {
    setRejectingRequestId(requestId);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequestId || !rejectReason.trim()) {
      alert('Il motivo del rifiuto / richiesta integrazioni è obbligatorio.');
      return;
    }
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/client-requests/${rejectingRequestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setIsRejectModalOpen(false);
        setRejectingRequestId(null);
        setRejectReason('');
        fetchRequests();
        onRefreshProject();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante il rifiuto');
      }
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSendComment = async (requestId: string) => {
    const text = (newCommentText[requestId] || '').trim();
    if (!text) return;

    setIsSendingComment((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await fetch(`/api/client-requests/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          isInternal: !!isInternalComment[requestId],
        }),
      });

      if (res.ok) {
        setNewCommentText((prev) => ({ ...prev, [requestId]: '' }));
        fetchRequests();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante l\'invio del commento');
      }
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      setIsSendingComment((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleSaveItemValue = async (requestId: string, itemId: string, updates: any) => {
    setIsSavingItem((prev) => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetch(`/api/client-requests/${requestId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          ...updates,
        }),
      });

      if (res.ok) {
        setEditingItemId(null);
        fetchRequests();
        onRefreshProject();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante il salvataggio dell\'elemento');
      }
    } catch (err) {
      console.error('Item save failed:', err);
    } finally {
      setIsSavingItem((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleCreateManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) {
      alert('Il titolo della richiesta è obbligatorio.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/client-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualForm.title.trim(),
          description: manualForm.description.trim(),
          category: manualForm.category,
          priority: manualForm.priority,
          dueDate: manualForm.dueDate || null,
          blocking: manualForm.blocking,
          linkedTaskIds: manualForm.linkedTaskIds,
          items: manualForm.items.filter((it) => it.title.trim().length > 0),
        }),
      });

      if (res.ok) {
        setIsManualModalOpen(false);
        setManualForm({
          title: '',
          description: '',
          category: 'CUSTOM',
          priority: 'media',
          dueDate: '',
          blocking: true,
          linkedTaskIds: [],
          items: [{ title: '', description: '', type: 'text', placeholder: '', isRequired: true, options: '' }],
        });
        fetchRequests();
        onRefreshProject();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante la creazione della richiesta');
      }
    } catch (err) {
      console.error('Create request failed:', err);
    }
  };

  const handleCreateSingleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRequestForNewItem || !newItemForm.title.trim()) return;

    try {
      const res = await fetch(`/api/client-requests/${targetRequestForNewItem}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newItemForm.title.trim(),
          description: newItemForm.description.trim(),
          type: newItemForm.type,
          placeholder: newItemForm.placeholder.trim(),
          isRequired: newItemForm.isRequired,
          optionsJson: newItemForm.options
            ? JSON.stringify(newItemForm.options.split(',').map((o) => o.trim()).filter(Boolean))
            : null,
        }),
      });

      if (res.ok) {
        setIsAddItemModalOpen(false);
        setTargetRequestForNewItem(null);
        setNewItemForm({ title: '', description: '', type: 'text', placeholder: '', isRequired: true, options: '' });
        fetchRequests();
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante l\'aggiunta dell\'elemento');
      }
    } catch (err) {
      console.error('Add item failed:', err);
    }
  };

  // Filtered requests list
  const filteredRequests = requestsList.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && req.category !== categoryFilter) return false;
    if (blockingOnly && !req.blocking) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchDesc = req.description && req.description.toLowerCase().includes(q);
      const matchItem = req.items?.some((it: any) => it.title.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchItem) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-950 border-slate-800 p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block font-medium">Totale Richieste</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{summaryData?.totalRequests || 0}</span>
            <span className="text-[10px] text-slate-500 font-mono">({summaryData?.totalItems || 0} campi)</span>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block font-medium">In Attesa Cliente</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-300">{summaryData?.requestedCount || 0}</span>
            <span className="text-[10px] text-slate-500">aperti</span>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-3 space-y-1">
          <span className="text-[10px] text-amber-400 block font-medium">Da Revisionare</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-300">{summaryData?.underReviewCount || 0}</span>
            <span className="text-[10px] text-amber-500/80">richiede azione</span>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-3 space-y-1">
          <span className="text-[10px] text-emerald-400 block font-medium">Approvate</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-300">{summaryData?.approvedCount || 0}</span>
            <span className="text-[10px] text-emerald-500">completate</span>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-3 space-y-1">
          <span className="text-[10px] text-rose-400 block font-medium">Integrazioni Richieste</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-rose-300">{summaryData?.rejectedCount || 0}</span>
            <span className="text-[10px] text-rose-500">da correggere</span>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-3 space-y-1">
          <span className="text-[10px] text-rose-400 block font-medium">Attività Bloccate</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-rose-400">{summaryData?.blockedTasksCount || 0}</span>
            <span className="text-[10px] text-rose-500 font-mono">task CRM</span>
          </div>
        </Card>
      </div>

      {/* Action Bar & Filter Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cerca materiali, accessi, testi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-36"
            >
              <option value="all">Tutti gli stati</option>
              <option value="requested">In Attesa Cliente</option>
              <option value="partially_received">Parzialmente Ricevuto</option>
              <option value="received">Ricevuto</option>
              <option value="under_review">Da Revisionare</option>
              <option value="approved">Approvato</option>
              <option value="rejected">Integrazioni Richieste</option>
            </Select>

            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-36"
            >
              <option value="all">Tutte le categorie</option>
              <option value="BRAND">Brand & Logo</option>
              <option value="CONTENUTI">Contenuti & Testi</option>
              <option value="ASSET">Asset Multimediali</option>
              <option value="ACCESSI">Accessi & Hosting</option>
              <option value="STRATEGIA">Strategia & Marketing</option>
              <option value="CUSTOM">Personalizzate</option>
            </Select>

            <Button
              size="sm"
              onClick={() => setIsGenerateModalOpen(true)}
              className="text-xs gap-1.5 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-semibold shadow-md shadow-rose-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Genera da Onboarding</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuova Richiesta</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs pt-1 border-t border-slate-850">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={blockingOnly}
              onChange={(e) => setBlockingOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-800 text-rose-500"
            />
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-400" />
              <span>Solo Richieste Bloccanti per i Task</span>
            </span>
          </label>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs">Caricamento richieste materiali...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="bg-slate-950 border-slate-800 p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Nessuna richiesta trovata</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Non sono presenti richieste materiali corrispondenti ai filtri. Usa il generatore di onboarding per creare l&apos;intero set standard o creane una manualmente.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                size="sm"
                onClick={() => setIsGenerateModalOpen(true)}
                className="text-xs gap-1.5 bg-gradient-to-r from-rose-600 to-purple-600 text-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Genera Pacchetto Onboarding</span>
              </Button>
            </div>
          </Card>
        ) : (
          filteredRequests.map((req) => {
            const isExpanded = expandedRequestId === req.id;
            const items = req.items || [];
            const linkedTasks = req.taskLinks || [];
            const comments = req.comments || [];
            const isComplete = req.status === 'approved';

            return (
              <Card
                key={req.id}
                className={`bg-slate-950 border transition-all ${
                  req.status === 'approved'
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : req.status === 'rejected'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : req.status === 'under_review'
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="p-1 rounded bg-slate-900 border border-slate-800">
                          {getCategoryIcon(req.category)}
                        </div>
                        <h3 className="text-sm font-bold text-white">{req.title}</h3>
                        <Badge variant="outline" className="bg-slate-900 text-slate-300 text-[10px]">
                          {req.category}
                        </Badge>
                        {getStatusBadge(req.status)}
                        {req.blocking && (
                          <Badge variant="outline" className="bg-rose-950/80 text-rose-300 border-rose-700/80 gap-1 text-[10px]">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Bloccante
                          </Badge>
                        )}
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                          req.priority === 'urgente' ? 'bg-rose-950 text-rose-300' :
                          req.priority === 'alta' ? 'bg-amber-950 text-amber-300' :
                          'bg-slate-900 text-slate-400'
                        }`}>
                          {req.priority}
                        </span>
                      </div>

                      {req.description && (
                        <p className="text-xs text-slate-300 leading-relaxed">{req.description}</p>
                      )}

                      {/* Rejection reason banner */}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                          <strong className="font-semibold flex items-center gap-1 text-rose-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Motivo Integrazione Richiesta:
                          </strong>
                          <p className="pl-4">{req.rejectionReason}</p>
                        </div>
                      )}

                      {/* Linked Tasks Info */}
                      {linkedTasks.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[10px] text-slate-400 font-semibold">Attività collegate:</span>
                          {linkedTasks.map((tl: any) => {
                            const taskObj = tasksList.find((t) => t.id === tl.taskId);
                            return (
                              <span
                                key={tl.id}
                                className={`text-[10px] px-2 py-0.5 rounded border font-mono flex items-center gap-1 ${
                                  tl.relationType === 'blocks'
                                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span>{taskObj?.title || tl.taskId}</span>
                                <span className="text-[9px] opacity-75">
                                  ({tl.relationType === 'blocks' ? 'Bloccata' : 'Informativa'})
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Review Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {req.status !== 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(req.id)}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approva</span>
                        </Button>
                      )}

                      {req.status !== 'rejected' && req.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRejectModal(req.id)}
                          className="text-xs gap-1.5 border-rose-800/80 text-rose-400 hover:bg-rose-950/40"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Richiedi Modifiche</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                        className="text-xs gap-1 text-slate-400 hover:text-white"
                      >
                        <span>{items.length} Campi ({comments.length} note)</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Quick Item Progress Strip */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-850">
                    <div className="flex items-center gap-3">
                      <span>
                        Campi ricevuti:{' '}
                        <strong className="text-slate-200">
                          {items.filter((it: any) => it.status === 'submitted' || it.status === 'approved').length} di {items.length}
                        </strong>
                      </span>
                      {req.dueDate && (
                        <span>
                          • Scadenza: <strong className="text-amber-300 font-mono">{req.dueDate}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRequestForNewItem(req.id);
                          setIsAddItemModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Aggiungi Campo</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* EXPANDED SECTION: ITEMS DETAILS & COMMENTS */}
                {isExpanded && (
                  <div className="border-t border-slate-850 p-4 sm:p-5 bg-slate-900/40 space-y-6">
                    {/* ITEMS LIST */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Dettaglio Campi e Materiali Richiesti</span>
                        <span className="text-[10px] text-slate-400 lowercase font-normal">
                          {items.filter((it: any) => it.status === 'approved').length}/{items.length} approvati
                        </span>
                      </h4>

                      <div className="space-y-3">
                        {items.map((item: any) => {
                          const isEditing = editingItemId === item.id;
                          const currentVal = itemFormValues[item.id] !== undefined ? itemFormValues[item.id] : (item.valueText || '');

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
                                item.status === 'approved'
                                  ? 'bg-emerald-950/20 border-emerald-500/30'
                                  : item.status === 'rejected'
                                  ? 'bg-rose-950/20 border-rose-500/30'
                                  : item.status === 'submitted'
                                  ? 'bg-amber-950/20 border-amber-500/30'
                                  : 'bg-slate-950 border-slate-800'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-200">{item.title}</span>
                                    <Badge variant="outline" className="text-[9px] uppercase px-1 bg-slate-900 text-slate-400">
                                      {item.type}
                                    </Badge>
                                    {item.isRequired && (
                                      <span className="text-[10px] text-rose-400 font-semibold">* Obbligatorio</span>
                                    )}
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                      item.status === 'approved' ? 'bg-emerald-950 text-emerald-300' :
                                      item.status === 'rejected' ? 'bg-rose-950 text-rose-300' :
                                      item.status === 'submitted' ? 'bg-amber-950 text-amber-300' :
                                      'bg-slate-800 text-slate-400'
                                    }`}>
                                      {item.status === 'approved' ? 'Approvato' :
                                       item.status === 'rejected' ? 'Rifiutato' :
                                       item.status === 'submitted' ? 'Consegnato dal Cliente' :
                                       'In Attesa'}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <p className="text-[11px] text-slate-400">{item.description}</p>
                                  )}
                                </div>

                                {/* Item level actions */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.status !== 'approved' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleSaveItemValue(req.id, item.id, { status: 'approved' })}
                                      className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-950/40"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Approva Campo
                                    </Button>
                                  )}
                                  {item.status !== 'rejected' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleSaveItemValue(req.id, item.id, { status: 'rejected' })}
                                      className="h-6 px-2 text-[10px] text-rose-400 hover:bg-rose-950/40"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Rifiuta
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Value Display / Editor based on type */}
                              <div className="pt-1">
                                {item.type === 'access' || item.type === 'credentials' ? (
                                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 text-xs">
                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                      <span className="font-semibold text-amber-300 flex items-center gap-1">
                                        <Lock className="h-3 w-3" />
                                        Accesso Piattaforma / Servizio
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        (Protezione GDPR: credenziali in chiaro non consentite)
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                      <div>
                                        <label className="text-slate-500 block text-[10px]">Piattaforma/Servizio</label>
                                        <Input
                                          placeholder="es. Google Search Console, Hosting..."
                                          value={itemFormValues[`${item.id}_svc`] ?? (item.accountService || '')}
                                          onChange={(e) => setItemFormValues({ ...itemFormValues, [`${item.id}_svc`]: e.target.value })}
                                          className="bg-slate-950 border-slate-800 text-xs h-7 mt-0.5"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-slate-500 block text-[10px]">Email Delegata / Account</label>
                                        <Input
                                          placeholder="es. agency@domain.it"
                                          value={itemFormValues[`${item.id}_email`] ?? (item.targetEmail || '')}
                                          onChange={(e) => setItemFormValues({ ...itemFormValues, [`${item.id}_email`]: e.target.value })}
                                          className="bg-slate-950 border-slate-800 text-xs h-7 mt-0.5"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-slate-500 block text-[10px]">Livello / Ruolo Accesso</label>
                                        <Input
                                          placeholder="es. Amministratore / Editor"
                                          value={itemFormValues[`${item.id}_lvl`] ?? (item.requiredLevel || '')}
                                          onChange={(e) => setItemFormValues({ ...itemFormValues, [`${item.id}_lvl`]: e.target.value })}
                                          className="bg-slate-950 border-slate-800 text-xs h-7 mt-0.5"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end pt-1">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSaveItemValue(req.id, item.id, {
                                            accountService: itemFormValues[`${item.id}_svc`] ?? item.accountService,
                                            targetEmail: itemFormValues[`${item.id}_email`] ?? item.targetEmail,
                                            requiredLevel: itemFormValues[`${item.id}_lvl`] ?? item.requiredLevel,
                                            status: 'submitted',
                                          })
                                        }
                                        disabled={isSavingItem[item.id]}
                                        className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                                      >
                                        Salva Accesso
                                      </Button>
                                    </div>
                                  </div>
                                ) : item.type === 'file' ? (
                                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 text-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="space-y-0.5">
                                        <span className="font-semibold text-slate-300 block">Documento / File Allegato</span>
                                        {item.documentId ? (
                                          <div className="flex items-center gap-1.5 text-blue-400">
                                            <Paperclip className="h-3.5 w-3.5" />
                                            <span className="font-mono text-[11px]">Doc #{item.documentId}</span>
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-slate-500 italic">Nessun file collegato al momento</span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={item.documentId || ''}
                                          onChange={(e) =>
                                            handleSaveItemValue(req.id, item.id, {
                                              documentId: e.target.value || null,
                                              status: e.target.value ? 'submitted' : item.status,
                                            })
                                          }
                                          className="bg-slate-950 border-slate-800 text-xs h-7 w-48"
                                        >
                                          <option value="">Collega documento del progetto...</option>
                                          {documentsList.map((d: any) => (
                                            <option key={d.id} value={d.id}>
                                              {d.title || d.fileName}
                                            </option>
                                          ))}
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <textarea
                                      rows={2}
                                      placeholder={item.placeholder || 'Inserisci testo o risposta del cliente...'}
                                      value={currentVal}
                                      onChange={(e) => setItemFormValues({ ...itemFormValues, [item.id]: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none"
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSaveItemValue(req.id, item.id, {
                                            valueText: currentVal,
                                            status: currentVal.trim().length > 0 ? 'submitted' : item.status,
                                          })
                                        }
                                        disabled={isSavingItem[item.id]}
                                        className="h-6 text-[11px] bg-slate-800 hover:bg-slate-700 text-white"
                                      >
                                        Salva Testo
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COMMENTS & AUDIT TRAIL */}
                    <div className="space-y-3 pt-3 border-t border-slate-850">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                        <span>Note Interne & Comunicazioni con il Cliente ({comments.length})</span>
                      </h4>

                      {/* Comments Feed */}
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/60 rounded-lg">
                            Nessuna nota o commento presente.
                          </div>
                        ) : (
                          comments.map((cm: any) => (
                            <div
                              key={cm.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                cm.isInternal
                                  ? 'bg-amber-950/15 border-amber-500/20 text-amber-200/90'
                                  : 'bg-slate-950 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span>{cm.authorRole || 'Team'}</span>
                                  {cm.isInternal ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[9px] py-0">
                                      <Lock className="h-2 w-2 mr-1" />
                                      Nota Interna
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[9px] py-0">
                                      <Eye className="h-2 w-2 mr-1" />
                                      Visibile al Cliente
                                    </Badge>
                                  )}
                                </div>
                                <span className="font-mono text-slate-500">{cm.createdAt?.slice(0, 16).replace('T', ' ')}</span>
                              </div>
                              <p className="text-[11px] whitespace-pre-line">{cm.message}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* New Comment Input */}
                      <div className="space-y-2 pt-2">
                        <textarea
                          rows={2}
                          placeholder="Aggiungi una nota interna o un chiarimento..."
                          value={newCommentText[req.id] || ''}
                          onChange={(e) => setNewCommentText({ ...newCommentText, [req.id]: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
                            <input
                              type="checkbox"
                              checked={isInternalComment[req.id] ?? true}
                              onChange={(e) => setIsInternalComment({ ...isInternalComment, [req.id]: e.target.checked })}
                              className="rounded bg-slate-900 border-slate-800 text-amber-500"
                            />
                            <span className="flex items-center gap-1 text-[11px]">
                              <Lock className="h-3 w-3 text-amber-400" />
                              <span>Nota riservata al team interno (non visibile al cliente)</span>
                            </span>
                          </label>

                          <Button
                            size="sm"
                            onClick={() => handleSendComment(req.id)}
                            disabled={isSendingComment[req.id] || !(newCommentText[req.id] || '').trim()}
                            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Invia Nota</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL: GENERATE ONBOARDING REQUESTS */}
      <GenerateClientRequestsModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        projectId={projectId}
        projectTitle={projectTitle}
        tasksList={tasksList}
        onSuccess={() => {
          fetchRequests();
          onRefreshProject();
        }}
      />

      {/* MODAL: REJECT REQUEST WITH MANDATORY REASON */}
      {isRejectModalOpen && (
        <Dialog isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} size="md">
          <div className="p-5 space-y-4 text-slate-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Richiedi Integrazioni / Rifiuta</h3>
                  <p className="text-[11px] text-slate-400">Specifica al cliente le informazioni mancanti.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-300 block">
                Motivo del Rifiuto / Specifiche da integrare *
              </label>
              <textarea
                required
                rows={4}
                placeholder="es. Il logo caricato non è in formato vettoriale (.svg o .ai), oppure la delega all'account Google Analytics non è stata ancora confermata..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-rose-500 outline-none"
              />
              <p className="text-[10px] text-slate-500">
                Questo messaggio verrà salvato nello storico della richiesta e notificato al cliente.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRejectModalOpen(false)}
                className="border-slate-800 text-xs"
              >
                Annulla
              </Button>

              <Button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs gap-1.5"
              >
                {isRejecting ? 'Invio in corso...' : 'Conferma Richiesta Integrazioni'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: MANUAL REQUEST CREATION */}
      {isManualModalOpen && (
        <Dialog isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} size="2xl">
          <div className="p-5 space-y-4 text-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nuova Richiesta Materiali Manuale</h3>
                  <p className="text-[11px] text-slate-400">Crea una richiesta su misura per questo progetto.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateManualRequest} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Titolo Richiesta *</label>
                <Input
                  required
                  placeholder="es. Materiale Fotografico Sede & Team"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Descrizione / Istruzioni per il Cliente</label>
                <textarea
                  rows={2}
                  placeholder="Istruzioni dettagliate su cosa fornire, formati accettati, ecc."
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Categoria</label>
                  <Select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="BRAND">Brand & Logo</option>
                    <option value="CONTENUTI">Contenuti & Testi</option>
                    <option value="ASSET">Asset Multimediali</option>
                    <option value="ACCESSI">Accessi & Hosting</option>
                    <option value="STRATEGIA">Strategia & Marketing</option>
                    <option value="CUSTOM">Personalizzato</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Priorità</label>
                  <Select
                    value={manualForm.priority}
                    onChange={(e) => setManualForm({ ...manualForm, priority: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Scadenza Richiesta</label>
                  <Input
                    type="date"
                    value={manualForm.dueDate}
                    onChange={(e) => setManualForm({ ...manualForm, dueDate: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Blocking flag & Tasks selector */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={manualForm.blocking}
                    onChange={(e) => setManualForm({ ...manualForm, blocking: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-rose-500"
                  />
                  <span>Richiesta Bloccante per le attività del progetto</span>
                </label>

                <div className="space-y-1">
                  <label className="text-slate-400 block text-[11px]">
                    Collega ad Attività del Progetto:
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-950 rounded-lg border border-slate-800">
                    {tasksList.map((t: any) => {
                      const isLinked = manualForm.linkedTaskIds.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManualForm({ ...manualForm, linkedTaskIds: [...manualForm.linkedTaskIds, t.id] });
                              } else {
                                setManualForm({
                                  ...manualForm,
                                  linkedTaskIds: manualForm.linkedTaskIds.filter((id) => id !== t.id),
                                });
                              }
                            }}
                            className="rounded bg-slate-900 border-slate-800"
                          />
                          <span className="font-mono text-blue-400">[{t.status}]</span>
                          <span>{t.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Items builder */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 block uppercase tracking-wider text-[11px]">
                    Campi e File da Richiedere
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setManualForm({
                        ...manualForm,
                        items: [
                          ...manualForm.items,
                          { title: '', description: '', type: 'text', placeholder: '', isRequired: true, options: '' },
                        ],
                      })
                    }
                    className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Aggiungi Altro Campo</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {manualForm.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <Input
                            placeholder="Nome del materiale (es. Logo Vettoriale)"
                            value={it.title}
                            onChange={(e) => {
                              const updated = [...manualForm.items];
                              updated[idx].title = e.target.value;
                              setManualForm({ ...manualForm, items: updated });
                            }}
                            className="bg-slate-950 border-slate-800 text-xs"
                          />
                        </div>
                        <div>
                          <Select
                            value={it.type}
                            onChange={(e) => {
                              const updated = [...manualForm.items];
                              updated[idx].type = e.target.value;
                              setManualForm({ ...manualForm, items: updated });
                            }}
                            className="bg-slate-950 border-slate-800 text-xs w-full"
                          >
                            <option value="text">Testo / Risposta</option>
                            <option value="file">File / Documento</option>
                            <option value="access">Accesso / Delega</option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsManualModalOpen(false)}
                  className="border-slate-800 text-xs"
                >
                  Annulla
                </Button>

                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs">
                  Crea Richiesta
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: ADD SINGLE ITEM TO EXISTING REQUEST */}
      {isAddItemModalOpen && (
        <Dialog isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} size="md">
          <div className="p-5 space-y-4 text-slate-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Aggiungi Campo alla Richiesta</h3>
            </div>

            <form onSubmit={handleCreateSingleItem} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Titolo Campo / Materiale *</label>
                <Input
                  required
                  placeholder="es. Foto Team alta risoluzione"
                  value={newItemForm.title}
                  onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Tipo di Elemento</label>
                <Select
                  value={newItemForm.type}
                  onChange={(e) => setNewItemForm({ ...newItemForm, type: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="text">Testo Libero</option>
                  <option value="file">File / Allegato</option>
                  <option value="access">Accesso Delegato</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Descrizione / Istruzioni</label>
                <Input
                  placeholder="Istruzioni specifiche per questo campo"
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={newItemForm.isRequired}
                  onChange={(e) => setNewItemForm({ ...newItemForm, isRequired: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-800 text-rose-500"
                />
                <span>Campo Obbligatorio</span>
              </label>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="border-slate-800 text-xs"
                >
                  Annulla
                </Button>

                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs">
                  Aggiungi Campo
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
