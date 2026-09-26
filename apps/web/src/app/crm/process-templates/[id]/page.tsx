'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  Workflow,
  ArrowLeft,
  Layers,
  Flag,
  ListTodo,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Share2,
  GitBranch,
  FileCheck,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  Globe,
  TrendingUp,
  Megaphone,
} from 'lucide-react';
import { SUGGESTED_ROLES_TAXONOMY, type ProcessTemplateDefinition } from '@ai-crm/ai';

export default function ProcessTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [templateData, setTemplateData] = useState<any>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishChangelog, setPublishChangelog] = useState('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Edit metadata modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'website',
    status: 'active',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchTemplate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/process-templates/${id}`);
      if (!res.ok) {
        router.push('/crm/process-templates');
        return;
      }
      const data = await res.json();
      setTemplateData(data);

      // Default to active version or first version
      if (!selectedVersionId) {
        if (data.activeVersion) {
          setSelectedVersionId(data.activeVersion.id);
        } else if (data.versions && data.versions.length > 0) {
          setSelectedVersionId(data.versions[0].id);
        }
      }

      if (data.template) {
        setEditForm({
          name: data.template.name || '',
          description: data.template.description || '',
          category: data.template.category || 'website',
          status: data.template.status || 'active',
        });
      }
    } catch (err) {
      console.error('Error fetching process template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  if (isLoading || !templateData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Caricamento modello di processo...</p>
      </div>
    );
  }

  const { template, versions = [] } = templateData;
  const currentVersion = versions.find((v: any) => v.id === selectedVersionId) || versions[0] || null;
  const definition: ProcessTemplateDefinition = currentVersion?.definition || { phases: [], milestones: [], tasks: [], dependencies: [] };

  const handlePublishNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError(null);
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/process-templates/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changelog: publishChangelog.trim() || 'Aggiornamento versione operativa',
          definition: definition,
        }),
      });

      if (res.ok) {
        setIsPublishModalOpen(false);
        setPublishChangelog('');
        await fetchTemplate();
      } else {
        const err = await res.json();
        setPublishError(err.error || 'Errore durante la pubblicazione della versione');
      }
    } catch (err: any) {
      setPublishError(err?.message || 'Errore di connessione');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/process-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        await fetchTemplate();
      }
    } catch (err) {
      console.error('Failed to update template:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getRoleLabel = (roleKey?: string) => {
    if (!roleKey) return 'Generico';
    const found = SUGGESTED_ROLES_TAXONOMY.find((r) => r.key === roleKey);
    return found ? found.label : roleKey;
  };

  const totalEstimatedHours = definition.tasks?.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) || 0;
  const totalWorkDays = currentVersion?.estimatedWorkDays || 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/crm/process-templates" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Catalogo Modelli</span>
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">{template.name}</span>
          <span>/</span>
          <span className="font-mono text-blue-400">v{currentVersion?.versionNumber || 1}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs gap-1.5 border-slate-700"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Modifica Dati</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setPublishError(null);
              setIsPublishModalOpen(true);
            }}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Pubblica Nuova Versione</span>
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <Card className="bg-slate-900/90 border-slate-800 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-lg">
              <Workflow className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white">{template.name}</h1>
                <span className="font-mono font-bold text-sm bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded border border-blue-500/30">
                  {template.code}
                </span>
                <Badge
                  variant="outline"
                  className={
                    template.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs'
                  }
                >
                  {template.status === 'active' ? 'Attivo' : 'Bozza'}
                </Badge>
              </div>

              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed pt-1">
                {template.description || 'Nessuna descrizione specificata per questo modello.'}
              </p>
            </div>
          </div>

          {/* Version Switcher */}
          <div className="w-full md:w-64 space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-blue-400" />
              <span>Versione Visualizzata</span>
            </label>
            <Select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="bg-slate-900 border-slate-700 text-xs w-full font-mono"
            >
              {versions.map((v: any) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} ({v.status === 'published' ? 'Pubblicata' : 'Bozza'}) - {v.createdAt?.slice(0, 10)}
                </option>
              ))}
            </Select>
            {currentVersion && (
              <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                <span>Stato: <strong className="text-slate-200 capitalize">{currentVersion.status}</strong></span>
                {currentVersion.changelog && <span className="truncate max-w-[120px]" title={currentVersion.changelog}>{currentVersion.changelog}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Fasi Sequenziali</span>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>{definition.phases?.length || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Milestone Chiave</span>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-emerald-400" />
              <span>{definition.milestones?.length || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Attività Standard</span>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <ListTodo className="h-4 w-4 text-purple-400" />
              <span>{definition.tasks?.length || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Durata Stimata</span>
            <div className="text-base font-bold text-amber-400 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>~{totalWorkDays} gg lav.</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Ore Lavoro Totali</span>
            <div className="text-base font-bold text-slate-200 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{totalEstimatedHours}h stimate</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Breakdown: Phases and Tasks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Architettura Fasi, Compiti e Milestone</h2>
            <p className="text-xs text-slate-400">
              Visualizzazione ordinata della pipeline operativa e delle dipendenze finish-to-start (DAG).
            </p>
          </div>
        </div>

        {definition.phases?.length === 0 ? (
          <Card className="bg-slate-950 border-slate-800 p-8 text-center text-slate-400 text-xs">
            Nessuna fase definita in questa versione del modello.
          </Card>
        ) : (
          <div className="space-y-6">
            {definition.phases
              ?.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((phase, pIdx) => {
                const phaseTasks = definition.tasks?.filter((t) => t.phaseId === phase.id) || [];
                const phaseMilestones = definition.milestones?.filter((m) => m.phaseId === phase.id) || [];

                return (
                  <Card key={phase.id} className="bg-slate-950 border-slate-800 overflow-hidden shadow-lg">
                    {/* Phase Header */}
                    <div className="bg-slate-900/80 px-5 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold font-mono">
                          {pIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{phase.name}</h3>
                          {phase.description && (
                            <p className="text-[11px] text-slate-400">{phase.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {phaseMilestones.map((ms) => (
                          <Badge
                            key={ms.id}
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]"
                          >
                            <Flag className="h-3 w-3" />
                            <span>Milestone: {ms.title}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Phase Tasks List */}
                    <div className="divide-y divide-slate-850">
                      {phaseTasks.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 italic">
                          Nessun compito assegnato direttamente a questa fase.
                        </div>
                      ) : (
                        phaseTasks
                          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                          .map((task) => {
                            // Find predecessors
                            const predecessors = definition.dependencies
                              ?.filter((d) => d.successorTaskId === task.id)
                              ?.map((d) => {
                                const predTask = definition.tasks?.find((t) => t.id === d.predecessorTaskId);
                                return predTask?.title || d.predecessorTaskId;
                              }) || [];

                            return (
                              <div key={task.id} className="p-4 space-y-2.5 hover:bg-slate-900/30 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-xs font-bold text-slate-200">{task.title}</h4>
                                      <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                        {task.id}
                                      </span>
                                      {task.requiresClientInput && (
                                        <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                                          Input Cliente Richiesto
                                        </Badge>
                                      )}
                                      {task.requiresApproval && (
                                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                          Approvazione Formale
                                        </Badge>
                                      )}
                                    </div>

                                    {task.description && (
                                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-4xl">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 gap-1 text-[10px]">
                                      <Users className="h-3 w-3" />
                                      <span>Ruolo: {getRoleLabel(task.suggestedRole)}</span>
                                    </Badge>

                                    <Badge variant="outline" className="bg-slate-900 text-slate-300 border-slate-800 text-[10px] font-mono">
                                      {task.estimatedWorkDays} gg ({task.estimatedHours}h)
                                    </Badge>

                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      task.priority === 'urgente' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                                      task.priority === 'alta' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                      'bg-slate-900 text-slate-400 border border-slate-800'
                                    }`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>

                                {/* Predecessors & Checklist */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                                  {predecessors.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <Share2 className="h-3 w-3 text-amber-400 shrink-0" />
                                      <span>Dipende da: <strong className="text-slate-300">{predecessors.join(', ')}</strong></span>
                                    </div>
                                  )}

                                  {task.checklist && task.checklist.length > 0 && (
                                    <div className="space-y-1 sm:col-span-2 bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                        Checklist Deliverable ({task.checklist.length} punti):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {task.checklist.map((c) => (
                                          <div key={c.id} className="flex items-center gap-1.5 text-slate-300 text-[10px]">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                            <span>{c.text}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* MODAL: PUBLISH NEW VERSION */}
      <Dialog
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Pubblica Nuova Versione del Modello"
        description="Verrà creato un nuovo snapshot immutabile (vX). I progetti già avviati manterranno la versione storica applicata senza subire modifiche."
      >
        <form onSubmit={handlePublishNewVersion} className="space-y-4 text-xs">
          {publishError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
              {publishError}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Garanzia di Immutabilità & Continuità Operativa</span>
            </div>
            <p>
              Tutti i progetti attivi che hanno applicato la versione precedente rimarranno invariati. La nuova versione sarà disponibile per le future applicazioni ai progetti.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Note di Rilascio / Changelog *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Es. Aggiunta fase di collaudo accessibilità e aggiornamento durate lavorative..."
              value={publishChangelog}
              onChange={(e) => setPublishChangelog(e.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPublishModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPublishing || !publishChangelog.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isPublishing ? 'Pubblicazione in corso...' : 'Conferma e Pubblica v' + ((versions[0]?.versionNumber || 0) + 1)}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: EDIT METADATA */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifica Informazioni Modello"
        description="Aggiorna i metadati descrittivi del catalogo."
      >
        <form onSubmit={handleSaveMetadata} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Nome Modello *</label>
            <Input
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Categoria *</label>
            <Select
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs w-full"
            >
              <option value="website">Sito Web & E-commerce</option>
              <option value="seo">SEO & Posizionamento</option>
              <option value="google_ads">Google Ads</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="marketing">Marketing Strategico</option>
            </Select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Stato</label>
            <Select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs w-full"
            >
              <option value="active">Attivo (Disponibile nei progetti)</option>
              <option value="draft">Bozza (In lavorazione)</option>
              <option value="archived">Archiviato (Disattivato)</option>
            </Select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Descrizione</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingEdit}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isSavingEdit ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
