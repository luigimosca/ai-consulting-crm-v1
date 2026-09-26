'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  Workflow,
  Plus,
  Search,
  Layers,
  Flag,
  ListTodo,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  FileCode,
  Globe,
  TrendingUp,
  Megaphone,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Tutte le categorie' },
  { value: 'website', label: 'Sito Web & E-commerce' },
  { value: 'seo', label: 'SEO & Posizionamento' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'marketing', label: 'Marketing Strategico' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'active', label: 'Attivi' },
  { value: 'draft', label: 'Bozze' },
  { value: 'archived', label: 'Archiviati' },
];

export default function ProcessTemplatesCatalogPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Draft Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'website',
    description: '',
  });

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/process-templates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error loading process templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, statusFilter]);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Nome e codice identificativo sono obbligatori');
      return;
    }

    setIsSubmitting(true);
    try {
      // Definizione iniziale minima per la bozza
      const initialDefinition = {
        phases: [
          { id: 'p1_kickoff', name: '1. Avvio e Kickoff', description: 'Fase iniziale di allineamento', sortOrder: 1 },
          { id: 'p2_execution', name: '2. Esecuzione Operativa', description: 'Svolgimento attività principali', sortOrder: 2 },
          { id: 'p3_delivery', name: '3. Chiusura e Consegna', description: 'Verifica e consegna finale', sortOrder: 3 },
        ],
        milestones: [
          { id: 'ms_start', phaseId: 'p1_kickoff', title: 'Avvio Confermato', description: 'Perimetro concordato', sortOrder: 1 },
          { id: 'ms_done', phaseId: 'p3_delivery', title: 'Lavori Conclusi', description: 'Collaudo superato', sortOrder: 2 },
        ],
        tasks: [
          {
            id: 't_kickoff',
            phaseId: 'p1_kickoff',
            milestoneId: 'ms_start',
            title: 'Meeting di avvio e raccolta requisiti',
            description: 'Incontro iniziale con il cliente e definizione perimetro.',
            estimatedWorkDays: 1,
            estimatedHours: 4,
            suggestedRole: 'project_manager',
            priority: 'alta',
            requiresClientInput: true,
            requiresApproval: false,
            sortOrder: 1,
            checklist: [{ id: 'chk_1', text: 'Verbale di avvio condiviso' }],
          },
          {
            id: 't_exec_main',
            phaseId: 'p2_execution',
            title: 'Esecuzione attività chiave del modello',
            description: 'Svolgimento operativo dei deliverable previsti.',
            estimatedWorkDays: 3,
            estimatedHours: 16,
            suggestedRole: 'web_designer',
            priority: 'media',
            requiresClientInput: false,
            requiresApproval: false,
            sortOrder: 2,
            checklist: [{ id: 'chk_2', text: 'Deliverable prodotto in bozza' }],
          },
          {
            id: 't_delivery_qa',
            phaseId: 'p3_delivery',
            milestoneId: 'ms_done',
            title: 'Collaudo finale e consegna al cliente',
            description: 'Revisione finale e approvazione formale.',
            estimatedWorkDays: 1,
            estimatedHours: 4,
            suggestedRole: 'project_manager',
            priority: 'urgente',
            requiresClientInput: true,
            requiresApproval: true,
            sortOrder: 3,
            checklist: [{ id: 'chk_3', text: 'Accettazione cliente firmata' }],
          },
        ],
        dependencies: [
          { predecessorTaskId: 't_kickoff', successorTaskId: 't_exec_main', dependencyType: 'finish_to_start' },
          { predecessorTaskId: 't_exec_main', successorTaskId: 't_delivery_qa', dependencyType: 'finish_to_start' },
        ],
      };

      const res = await fetch('/api/process-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          definition: initialDefinition,
        }),
      });

      if (res.ok) {
        setIsNewModalOpen(false);
        setFormData({ name: '', code: '', category: 'website', description: '' });
        fetchTemplates();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Errore nella creazione del modello');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Errore di connessione');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'website':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1"><Globe className="h-3 w-3" /> Sito Web</Badge>;
      case 'seo':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1"><TrendingUp className="h-3 w-3" /> SEO</Badge>;
      case 'google_ads':
      case 'meta_ads':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1"><Megaphone className="h-3 w-3" /> Ads</Badge>;
      default:
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 gap-1"><Sparkles className="h-3 w-3" /> Marketing</Badge>;
    }
  };

  const totalActiveTemplates = templates.filter((t) => t.status === 'active').length;
  const totalStandardTasks = templates.reduce((sum, t) => sum + (t.tasksCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Modelli di Processo Operativi</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Catalogo standard per generare automaticamente fasi, milestone, compiti con durate lavorative, ruoli e dipendenze nei progetti.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsNewModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nuovo Modello di Processo</span>
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-950 border-slate-800 p-4 flex items-center gap-3.5 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Modelli a Catalogo</div>
            <div className="text-xl font-bold text-white mt-0.5">{templates.length} ({totalActiveTemplates} attivi)</div>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-4 flex items-center gap-3.5 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Attività Standard Catalogate</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalStandardTasks} compiti</div>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-4 flex items-center gap-3.5 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Immutabilità & Versioning</div>
            <div className="text-xl font-bold text-white mt-0.5">Attivo (v1 - vN)</div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per nome, codice o descrizione..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTemplates()}
            className="pl-9 bg-slate-900/80 border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-full sm:w-48"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-full sm:w-36"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Button variant="outline" size="sm" onClick={fetchTemplates} className="shrink-0">
            Filtra
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-xs">Caricamento modelli di processo...</span>
        </div>
      ) : templates.length === 0 ? (
        <Card className="bg-slate-950 border-slate-800 p-12 text-center">
          <Workflow className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">Nessun modello trovato</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Non ci sono modelli corrispondenti ai filtri impostati. Puoi creare un nuovo modello in bozza.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <Card
              key={tmpl.id}
              className="bg-slate-950 border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base leading-tight">{tmpl.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded">
                        {tmpl.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {formatCategoryBadge(tmpl.category)}
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          tmpl.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : tmpl.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tmpl.status === 'active' ? 'Attivo' : tmpl.status === 'draft' ? 'Bozza' : 'Archiviato'}
                      </Badge>
                      <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
                        v{tmpl.publishedVersionNumber || tmpl.currentVersionNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {tmpl.description || 'Nessuna descrizione specificata.'}
                </p>

                {/* Metrics Pill List */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-850 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Layers className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{tmpl.phasesCount} Fasi</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Flag className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{tmpl.milestonesCount} Milestone</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <ListTodo className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <span>{tmpl.tasksCount} Compiti</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>~{tmpl.estimatedWorkDays} gg lav.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {tmpl.creatorName ? `Creato da ${tmpl.creatorName}` : 'Standard Agenzia'}
                </span>

                <Link href={`/crm/process-templates/${tmpl.id}`}>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5 border-slate-700 hover:bg-slate-900">
                    <span>Visualizza & Modifica</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: NUOVO MODELLO DI PROCESSO */}
      <Dialog
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Crea Nuovo Modello di Processo"
        description="Definisci i parametri base del modello. Potrai successivamente configurare nel dettaglio fasi, compiti, checklist e dipendenze."
      >
        <form onSubmit={handleCreateDraft} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
              {formError}
            </div>
          )}

          <Input
            label="Nome del Modello *"
            placeholder="Es. Campagna Meta Ads – Lead Generation"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="bg-slate-900 border-slate-800"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Codice Identificativo Univoco *"
              placeholder="Es. META_ADS_LEAD_GEN"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              className="bg-slate-900 border-slate-800 font-mono text-xs"
            />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Categoria *</label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="bg-slate-900 border-slate-800 text-xs w-full"
              >
                {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Descrizione Operativa</label>
            <textarea
              rows={3}
              placeholder="Descrivi l'ambito di applicazione e i deliverable principali di questo modello..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isSubmitting ? 'Salvataggio...' : 'Crea Bozza Modello'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
