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
import { formatCentsToCurrency } from '@/lib/money';
import {
  Briefcase,
  ArrowLeft,
  Building2,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Clock,
  User,
  Plus,
  FileText,
  ShieldCheck,
  Eye,
  Paperclip,
  Activity,
} from 'lucide-react';

export default function CommessaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [orderData, setOrderData] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [approvalsList, setApprovalsList] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status changer
  const [currentStatus, setCurrentStatus] = useState('da_avviare');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // New Project Modal
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [newProjectBudgetHours, setNewProjectBudgetHours] = useState('40');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}?t=${Date.now()}`);
      if (!res.ok) {
        router.push('/crm/commesse');
        return;
      }
      const data = await res.json();
      setOrderData(data.order);
      setCurrentStatus(data.order.status);
      setManager(data.manager || null);
      setLead(data.lead || null);
      setCompany(data.company || null);
      setQuote(data.quote || null);
      setProjectsList(data.projects || []);
      setDocumentsList(data.documents || []);
      setApprovalsList(data.approvals || []);
      setActivityLogs(data.activityLogs || []);

      try {
        setDeliverables(JSON.parse(data.order.deliverablesSnapshotJson || '[]'));
      } catch {
        setDeliverables([]);
      }
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCurrentStatus(newStatus);
        fetchOrder();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    setIsCreatingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          title: newProjectTitle,
          description: newProjectDesc,
          dueDate: newProjectDueDate || null,
          budgetHours: Number(newProjectBudgetHours) || 0,
        }),
      });

      if (res.ok) {
        setIsNewProjectModalOpen(false);
        setNewProjectTitle('');
        setNewProjectDesc('');
        fetchOrder();
      }
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsCreatingProject(false);
    }
  };

  if (isLoading || !orderData) {
    return <div className="p-12 text-center text-slate-400">Caricamento commessa in corso...</div>;
  }

  const clientName = lead?.companyName || company?.name || 'Cliente';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/crm/commesse" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="font-mono font-bold text-lg text-indigo-400">{orderData.code}</span>
            <Badge variant="outline" className="text-xs uppercase">
              {orderData.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <h1 className="text-2xl font-bold text-white mt-2">{orderData.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Cliente: <strong className="text-slate-200">{clientName}</strong></span>
            </span>
            {quote && (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <Link href={`/crm/quotes/${quote.id}`} className="text-blue-400 hover:underline">
                  Preventivo Originario: {quote.quoteNumber}
                </Link>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Avvio: {orderData.startDate || 'N/D'}</span>
            </span>
          </div>
        </div>

        {/* Quick Actions & Status Control */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 px-2 font-medium">Stato Commessa:</span>
            <Select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className="bg-slate-950 border-slate-700 text-xs w-44"
            >
              <option value="da_avviare">Da Avviare</option>
              <option value="attiva">Attiva / In Corso</option>
              <option value="sospesa">Sospesa</option>
              <option value="completata">Completata</option>
              <option value="annullata">Annullata</option>
            </Select>
          </div>

          <Button onClick={() => setIsNewProjectModalOpen(true)} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            <span>Nuovo Progetto</span>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Projects & Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Projects */}
          <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-900/40 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-blue-400" />
                <CardTitle className="text-sm font-bold text-slate-200">
                  Progetti Operativi ({projectsList.length})
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsNewProjectModalOpen(true)} className="text-xs h-7 gap-1">
                <Plus className="h-3 w-3" />
                <span>Aggiungi Progetto</span>
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {projectsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nessun progetto creato per questa commessa. Crea un progetto per iniziare a pianificare attività e milestone.
                </div>
              ) : (
                projectsList.map((prj) => (
                  <div
                    key={prj.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{prj.code}</span>
                        <h4 className="text-sm font-bold text-slate-100">{prj.title}</h4>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {prj.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{prj.description || 'Nessuna descrizione'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Responsabile: <strong className="text-slate-300">{prj.managerName || 'Admin'}</strong></span>
                        {prj.dueDate && <span>Scadenza: {prj.dueDate}</span>}
                      </div>
                    </div>

                    {/* Progress Bar & CTA */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Avanzamento</span>
                          <span className="text-slate-200 font-bold">{prj.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${prj.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <Link href={`/crm/projects/${prj.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Apri</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Deliverables Snapshot */}
          <Card className="bg-slate-950 border-slate-800 p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
              Snapshot Prestazioni & Voci Contrattuali Concordate
            </h3>

            <div className="space-y-2">
              {deliverables.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">{item.description}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Q.tà: {item.quantity} • {item.costType === 'one_time' ? 'Una Tantum' : 'Canone Ricorrente'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-100">
                    {formatCentsToCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Financials & History */}
        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
              Budget & Valore Concordato
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Valore Contrattuale:</span>
                <span className="text-lg font-mono font-bold text-indigo-400">
                  {formatCentsToCurrency(orderData.agreedValue, orderData.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Responsabile:</span>
                <span className="text-slate-200 font-medium">{manager?.name || 'Admin'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Data Avvio:</span>
                <span className="text-slate-200">{orderData.startDate || 'N/D'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Scadenza Prevista:</span>
                <span className="text-slate-200">{orderData.dueDate || 'N/D'}</span>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="bg-slate-950 border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Storico Attività
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              {activityLogs.map((log) => (
                <div key={log.id} className="p-2 rounded bg-slate-900/60 border border-slate-850">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-blue-400 uppercase">{log.action.replace(/_/g, ' ')}</span>
                    <span>{new Date(log.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">Eseguito da {log.userName || 'Admin'}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: New Project */}
      <Dialog isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Crea Nuovo Progetto">
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Titolo del Progetto *</label>
            <Input
              required
              placeholder="Es. Sviluppo Modulo AI & RAG"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Descrizione & Obiettivi</label>
            <textarea
              rows={3}
              placeholder="Dettagli e obiettivi operativi del progetto..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Data Scadenza Prevista</label>
              <Input
                type="date"
                value={newProjectDueDate}
                onChange={(e) => setNewProjectDueDate(e.target.value)}
                className="bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Stima Budget Ore</label>
              <Input
                type="number"
                min="1"
                value={newProjectBudgetHours}
                onChange={(e) => setNewProjectBudgetHours(e.target.value)}
                className="bg-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewProjectModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isCreatingProject} className="bg-blue-600 hover:bg-blue-500 text-white">
              {isCreatingProject ? 'Creazione...' : 'Crea Progetto'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
