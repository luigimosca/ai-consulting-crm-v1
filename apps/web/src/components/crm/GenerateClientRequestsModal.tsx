'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Sparkles,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileText,
  KeyRound,
  Image,
  Globe,
  Share2,
  Calendar,
  CheckSquare,
  Square,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface GenerateClientRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  tasksList: any[];
  onSuccess: () => void;
}

export function GenerateClientRequestsModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  tasksList,
  onSuccess,
}: GenerateClientRequestsModalProps) {
  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('ONBOARDING_WEBSITE_MARKETING');
  const [targetDueDate, setTargetDueDate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({
    BRAND: true,
    CONTENUTI: true,
    ASSET: true,
    ACCESSI: true,
    STRATEGIA: true,
  });

  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedItemCodes, setSelectedItemCodes] = useState<Record<string, boolean>>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default due date (e.g. +14 days)
  useEffect(() => {
    if (isOpen && !targetDueDate) {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setTargetDueDate(d.toISOString().slice(0, 10));
      setStep('config');
      setPreviewData(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleGroupToggle = (grp: string) => {
    setSelectedGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const handleRunDryRunPreview = async () => {
    setIsLoadingPreview(true);
    setErrorMessage(null);

    const activeGroups = Object.keys(selectedGroups).filter((g) => selectedGroups[g]);
    if (activeGroups.length === 0) {
      setErrorMessage('Seleziona almeno una categoria da includere.');
      setIsLoadingPreview(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-client-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: selectedTemplateKey,
          selectedGroupCategories: activeGroups,
          defaultDueDate: targetDueDate || null,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la generazione dell\'anteprima');
      }

      setPreviewData(data);
      // Initialize selected item codes
      const itemSelection: Record<string, boolean> = {};
      if (Array.isArray(data.requests)) {
        for (const req of data.requests) {
          if (Array.isArray(req.items)) {
            for (const item of req.items) {
              itemSelection[item.itemCode] = true;
            }
          }
        }
      }
      setSelectedItemCodes(itemSelection);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore di connessione');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleToggleItemSelection = (code: string) => {
    setSelectedItemCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleConfirmGeneration = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    const activeGroups = Object.keys(selectedGroups).filter((g) => selectedGroups[g]);
    const excludedCodes = Object.keys(selectedItemCodes).filter((code) => !selectedItemCodes[code]);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-client-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: selectedTemplateKey,
          selectedGroupCategories: activeGroups,
          excludedItemCodes: excludedCodes,
          defaultDueDate: targetDueDate || null,
          dryRun: false,
          idempotencyKey: `gen_req_${projectId}_${selectedTemplateKey}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la creazione delle richieste');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la creazione delle richieste');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'BRAND':
        return <Globe className="h-4 w-4 text-blue-400" />;
      case 'CONTENUTI':
        return <FileText className="h-4 w-4 text-indigo-400" />;
      case 'ASSET':
        return <Image className="h-4 w-4 text-emerald-400" />;
      case 'ACCESSI':
        return <KeyRound className="h-4 w-4 text-amber-400" />;
      case 'STRATEGIA':
        return <Share2 className="h-4 w-4 text-purple-400" />;
      default:
        return <Layers className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-3xl w-full space-y-6 text-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Generatore Richieste Materiali & Accessi</span>
                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]">
                  Template Standard
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Genera automaticamente il pacchetto di richieste materiali, contenuti e accessi per &ldquo;{projectTitle}&rdquo;.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base font-bold p-1 rounded hover:bg-slate-900"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CONFIGURATION */}
        {step === 'config' && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Modello di Onboarding *</label>
                <Select
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="ONBOARDING_WEBSITE_MARKETING">
                    Onboarding Completo: Sito Web & Marketing (5 Categorie, 33 Richieste)
                  </option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Scadenza Richiesta di Default</label>
                <Input
                  type="date"
                  value={targetDueDate}
                  onChange={(e) => setTargetDueDate(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Categories Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 block">
                  Seleziona le Aree di Raccolta da Includere:
                </label>
                <span className="text-[11px] text-slate-400">
                  {Object.values(selectedGroups).filter(Boolean).length} di 5 categorie attive
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'BRAND',
                    title: '1. Brand & Identità Visiva',
                    desc: 'Logo vettoriale, palette colori, font, pay-off, linee guida',
                    icon: <Globe className="h-4 w-4 text-blue-400" />,
                  },
                  {
                    id: 'CONTENUTI',
                    title: '2. Contenuti & Copywriting',
                    desc: 'Testi pagine chi siamo, servizi, casi studio, privacy policy',
                    icon: <FileText className="h-4 w-4 text-indigo-400" />,
                  },
                  {
                    id: 'ASSET',
                    title: '3. Asset Multimediali',
                    desc: 'Foto alta risoluzione del team/sede, video corporate, brochure PDF',
                    icon: <Image className="h-4 w-4 text-emerald-400" />,
                  },
                  {
                    id: 'ACCESSI',
                    title: '4. Accessi & Piattaforme',
                    desc: 'Hosting/DNS, Google Analytics/GTM, Meta Business Manager, Search Console',
                    icon: <KeyRound className="h-4 w-4 text-amber-400" />,
                  },
                  {
                    id: 'STRATEGIA',
                    title: '5. Strategia & Obiettivi',
                    desc: 'Target audience, USP, competitor di riferimento, budget ADV stimato',
                    icon: <Share2 className="h-4 w-4 text-purple-400" />,
                  },
                ].map((g) => {
                  const isChecked = !!selectedGroups[g.id];
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleGroupToggle(g.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'bg-blue-950/30 border-blue-500/50 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          {g.icon}
                          <span>{g.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{g.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Linkage Info */}
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                <span>Collegamento Automatico alle Attività del Progetto</span>
              </div>
              <p className="text-slate-400">
                Il motore verificherà le attività operative esistenti in &ldquo;{projectTitle}&rdquo; (es. Configurazione DNS, Design Grafico, Setup Tracciamenti) e collegherà automaticamente le richieste pertinenti come bloccanti o informative.
              </p>
            </div>

            {/* Footer Step 1 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-800 text-xs">
                Annulla
              </Button>

              <Button
                type="button"
                onClick={handleRunDryRunPreview}
                disabled={isLoadingPreview}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5 text-xs shadow-md shadow-blue-500/20"
              >
                {isLoadingPreview ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Analisi e Generazione Anteprima...</span>
                  </>
                ) : (
                  <>
                    <span>Genera Anteprima Richieste</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DRY-RUN PREVIEW */}
        {step === 'preview' && previewData && (
          <div className="space-y-5 text-xs">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Richieste Generate</span>
                <span className="text-lg font-bold text-white">{previewData.totalRequests || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Elementi / Campi</span>
                <span className="text-lg font-bold text-blue-400">
                  {Object.values(selectedItemCodes).filter(Boolean).length} di {previewData.totalItems || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Task Bloccati Rilevati</span>
                <span className="text-lg font-bold text-amber-400">
                  {previewData.summary?.blockedTasksCount || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Idempotenza</span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 pt-1 block">Attiva (Sicura)</span>
              </div>
            </div>

            {/* List of Requests & Items */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {previewData.requests?.map((req: any, rIdx: number) => {
                const linkedTasks = req.taskLinks || [];
                return (
                  <div
                    key={req.requestKey || rIdx}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(req.category)}
                        <h4 className="font-bold text-slate-200 text-xs">{req.title}</h4>
                        <Badge variant="outline" className="bg-slate-800 text-[10px] text-slate-300">
                          {req.category}
                        </Badge>
                        {req.blocking && (
                          <Badge variant="outline" className="bg-rose-950/60 text-rose-300 border-rose-800 text-[9px]">
                            Bloccante
                          </Badge>
                        )}
                      </div>

                      {req.dueDate && (
                        <span className="text-[11px] font-mono text-slate-400">
                          Scadenza: {req.dueDate}
                        </span>
                      )}
                    </div>

                    {req.description && (
                      <p className="text-[11px] text-slate-400 leading-snug">{req.description}</p>
                    )}

                    {/* Linked Tasks Badge */}
                    {linkedTasks.length > 0 && (
                      <div className="p-2 bg-slate-950/70 border border-slate-850 rounded-lg space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400 block">
                          Attività collegate del progetto ({linkedTasks.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedTasks.map((tl: any, tlIdx: number) => {
                            const taskObj = tasksList.find((t) => t.id === tl.taskId);
                            return (
                              <span
                                key={tlIdx}
                                className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300 flex items-center gap-1"
                              >
                                <span className="font-semibold text-blue-400">{taskObj?.title || tl.taskId}</span>
                                <span className="text-slate-500">({tl.relationType === 'blocks' ? 'Blocca' : 'Informativo'})</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Items Checklist */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Campi & Materiali Richiesti ({req.items?.length || 0}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.items?.map((item: any) => {
                          const isSelected = selectedItemCodes[item.itemCode] !== false;
                          return (
                            <div
                              key={item.itemCode}
                              onClick={() => handleToggleItemSelection(item.itemCode)}
                              className={`p-2 rounded-lg border text-[11px] cursor-pointer transition-colors flex items-start gap-2 ${
                                isSelected
                                  ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                                  : 'bg-slate-950/30 border-slate-900 text-slate-600 line-through'
                              }`}
                            >
                              <div className="pt-0.5">
                                {isSelected ? (
                                  <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                                ) : (
                                  <Square className="h-3.5 w-3.5 text-slate-600" />
                                )}
                              </div>
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold truncate">{item.title}</span>
                                  <span className="text-[9px] uppercase px-1 rounded bg-slate-900 text-slate-400">
                                    {item.type}
                                  </span>
                                </div>
                                {item.isRequired && (
                                  <span className="text-[9px] text-rose-400 font-semibold block">
                                    * Obbligatorio
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Step 2 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('config')}
                className="border-slate-800 text-xs"
              >
                &larr; Modifica Categorie
              </Button>

              <Button
                type="button"
                onClick={handleConfirmGeneration}
                disabled={isGenerating}
                className="bg-gradient-to-r from-blue-600 to-rose-600 hover:from-blue-500 hover:to-rose-500 text-white font-semibold gap-1.5 text-xs shadow-md shadow-blue-500/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Creazione Richieste in corso...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Conferma e Crea Richieste per il Progetto</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
