'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import {
  FolderKanban,
  Search,
  Briefcase,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Building2,
  Sparkles,
  ShieldCheck,
  Layers,
  Filter,
} from 'lucide-react';

export default function ProjectsListPage() {
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  const [newProjectForm, setNewProjectForm] = useState({
    projectType: 'client' as 'internal' | 'presales' | 'client',
    title: '',
    description: '',
    orderId: '',
    leadId: '',
    companyId: '',
    managerId: '',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    budgetHours: 40,
    status: 'pianificato',
  });

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      let url = `/api/projects?t=${Date.now()}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (typeFilter !== 'all') url += `&projectType=${typeFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [ordRes, leadRes, compRes, usrRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/leads'),
        fetch('/api/companies'),
        fetch('/api/users'),
      ]);

      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrdersList(data.orders || []);
      }
      if (leadRes.ok) {
        const data = await leadRes.json();
        setLeadsList(data.leads || []);
      }
      if (compRes.ok) {
        const data = await compRes.json();
        setCompaniesList(data.companies || []);
      }
      if (usrRes.ok) {
        const data = await usrRes.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load project form dependencies:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.title.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        projectType: newProjectForm.projectType,
        title: newProjectForm.title.trim(),
        description: newProjectForm.description || undefined,
        managerId: newProjectForm.managerId || undefined,
        startDate: newProjectForm.startDate || undefined,
        dueDate: newProjectForm.dueDate || undefined,
        budgetHours: Number(newProjectForm.budgetHours) || 0,
        status: newProjectForm.status,
      };

      if (newProjectForm.projectType === 'client') {
        if (newProjectForm.orderId) payload.orderId = newProjectForm.orderId;
        if (newProjectForm.companyId) payload.companyId = newProjectForm.companyId;
        if (newProjectForm.leadId) payload.leadId = newProjectForm.leadId;
      } else if (newProjectForm.projectType === 'presales') {
        if (newProjectForm.leadId) payload.leadId = newProjectForm.leadId;
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsNewProjectModalOpen(false);
        setNewProjectForm({
          projectType: 'client',
          title: '',
          description: '',
          orderId: '',
          leadId: '',
          companyId: '',
          managerId: '',
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: '',
          budgetHours: 40,
          status: 'pianificato',
        });
        fetchProjects();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Errore nella creazione del progetto');
      }
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pianificato':
        return <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-700">Pianificato</Badge>;
      case 'in_corso':
        return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">In Corso</Badge>;
      case 'in_pausa':
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">In Pausa</Badge>;
      case 'completato':
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completato</Badge>;
      case 'annullato':
        return <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30">Annullato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'internal':
        return (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
            <ShieldCheck className="h-3 w-3" />
            <span>Interno</span>
          </Badge>
        );
      case 'presales':
        return (
          <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30 gap-1 text-[11px]">
            <Sparkles className="h-3 w-3" />
            <span>Pre-vendita</span>
          </Badge>
        );
      case 'client':
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30 gap-1 text-[11px]">
            <Building2 className="h-3 w-3" />
            <span>Cliente</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Progetti Operativi</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {projectsList.length} Progetti
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Visione unificata per progetti Clienti, Pre-vendita (POC) e Iniziative Interne (R&D).
          </p>
        </div>

        <Button
          onClick={() => setIsNewProjectModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          <span>Nuovo Progetto</span>
        </Button>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setTypeFilter('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0',
            typeFilter === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Tutti i Progetti</span>
        </button>
        <button
          onClick={() => setTypeFilter('client')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0',
            typeFilter === 'client'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          )}
        >
          <Building2 className="h-3.5 w-3.5 text-blue-400" />
          <span>Progetti Clienti</span>
        </button>
        <button
          onClick={() => setTypeFilter('presales')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0',
            typeFilter === 'presales'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>Pre-vendita / POC</span>
        </button>
        <button
          onClick={() => setTypeFilter('internal')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0',
            typeFilter === 'internal'
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Interni / R&D</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per codice, titolo, commessa o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
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
            <option value="pianificato">Pianificato</option>
            <option value="in_corso">In Corso</option>
            <option value="in_pausa">In Pausa</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchProjects} className="shrink-0">
            Filtra
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Codice</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Titolo & Riferimenti</th>
                <th className="py-3.5 px-4">Stato</th>
                <th className="py-3.5 px-4">Avanzamento</th>
                <th className="py-3.5 px-4">Responsabile</th>
                <th className="py-3.5 px-4">Scadenza</th>
                <th className="py-3.5 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Caricamento progetti in corso...
                  </td>
                </tr>
              ) : projectsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nessun progetto trovato con i filtri selezionati. Clicca &quot;Nuovo Progetto&quot; per iniziare.
                  </td>
                </tr>
              ) : (
                projectsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {p.code}
                    </td>
                    <td className="py-3.5 px-4">
                      {getTypeBadge(p.projectType)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{p.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {p.orderCode && (
                          <div className="flex items-center gap-1 text-indigo-400">
                            <Briefcase className="h-3 w-3" />
                            <span>Commessa: {p.orderCode}</span>
                          </div>
                        )}
                        {(p.companyName || p.leadCompanyName) && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Building2 className="h-3 w-3 text-slate-500" />
                            <span>{p.companyName || p.leadCompanyName}</span>
                          </div>
                        )}
                        {p.projectType === 'internal' && !p.orderCode && !p.companyName && (
                          <span className="text-emerald-400/80 text-[11px]">Iniziativa Interna</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{p.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${p.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {p.managerName || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {p.dueDate || 'N/D'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/crm/projects/${p.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Hub Progetto</span>
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

      {/* Modal: Nuovo Progetto */}
      <Dialog
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Crea Nuovo Progetto"
        description="Seleziona la tipologia di progetto e compila i dettagli operativi."
        size="3xl"
      >
        <form onSubmit={handleCreateProject} className="space-y-5">
          {/* Project Type Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipologia di Progetto *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setNewProjectForm({ ...newProjectForm, projectType: 'client' })}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  newProjectForm.projectType === 'client'
                    ? 'border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  <span className="text-white">Progetto Cliente</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Lavori contrattuali, commesse o progetti diretti per clienti.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectForm({ ...newProjectForm, projectType: 'presales' })}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  newProjectForm.projectType === 'presales'
                    ? 'border-purple-500 bg-purple-500/15 text-white ring-1 ring-purple-500'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-white">Pre-vendita / POC</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Demo tecniche, proof-of-concept e studi prima della firma.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectForm({ ...newProjectForm, projectType: 'internal' })}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  newProjectForm.projectType === 'internal'
                    ? 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-white">Interno / R&D</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Sviluppo tool interni, formazione o R&D aziendale.
                </p>
              </button>
            </div>
          </div>

          {/* Conditional Entity Linking */}
          {newProjectForm.projectType === 'client' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Commessa Collegata (opzionale se non ancora creata)
                </label>
                <Select
                  value={newProjectForm.orderId}
                  onChange={(e) => {
                    const selOrder = ordersList.find((o) => o.id === e.target.value);
                    setNewProjectForm({
                      ...newProjectForm,
                      orderId: e.target.value,
                      leadId: selOrder?.leadId || newProjectForm.leadId,
                      companyId: selOrder?.companyId || newProjectForm.companyId,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-xs"
                >
                  <option value="">Nessuna commessa (progetto cliente diretto)</option>
                  {ordersList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} - {o.title} {o.leadCompanyName ? `(${o.leadCompanyName})` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Azienda Cliente o Lead *
                </label>
                <Select
                  value={newProjectForm.companyId || (newProjectForm.leadId ? `lead_${newProjectForm.leadId}` : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('lead_')) {
                      setNewProjectForm({ ...newProjectForm, leadId: val.replace('lead_', ''), companyId: '' });
                    } else {
                      setNewProjectForm({ ...newProjectForm, companyId: val, leadId: '' });
                    }
                  }}
                  className="bg-slate-900 border-slate-700 text-xs"
                >
                  <option value="">Seleziona Cliente...</option>
                  <optgroup label="Aziende">
                    {companiesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.sector || 'Azienda'})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Lead CRM">
                    {leadsList.map((l) => (
                      <option key={l.id} value={`lead_${l.id}`}>
                        {l.companyName} ({l.city || l.sector})
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </div>
            </div>
          )}

          {newProjectForm.projectType === 'presales' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Lead / Opportunità Collegata (Opzionale)
              </label>
              <Select
                value={newProjectForm.leadId}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, leadId: e.target.value })}
                className="bg-slate-900 border-slate-700 text-xs"
              >
                <option value="">Nessun lead associato</option>
                {leadsList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.companyName} ({l.city || l.sector})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Common Project Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Titolo del Progetto *
              </label>
              <Input
                required
                placeholder="Es. Sviluppo Assistente AI WhatsApp & Automazione Prenotazioni"
                value={newProjectForm.title}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descrizione & Obiettivi
              </label>
              <textarea
                rows={2}
                placeholder="Dettagli operativi, deliverables previsti, vincoli tecnici..."
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project Manager
                </label>
                <Select
                  value={newProjectForm.managerId}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, managerId: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-xs"
                >
                  <option value="">Seleziona Manager...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data Inizio
                </label>
                <Input
                  type="date"
                  value={newProjectForm.startDate}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scadenza Prevista
                </label>
                <Input
                  type="date"
                  value={newProjectForm.dueDate}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, dueDate: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Budget Ore Stimate
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newProjectForm.budgetHours}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, budgetHours: Number(e.target.value) })}
                  className="bg-slate-950 border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stato Iniziale
                </label>
                <Select
                  value={newProjectForm.status}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, status: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-xs"
                >
                  <option value="pianificato">Pianificato</option>
                  <option value="in_corso">In Corso</option>
                  <option value="in_pausa">In Pausa</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="border-slate-800"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 font-semibold"
            >
              {isSubmitting ? 'Creazione in corso...' : 'Crea Progetto'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

