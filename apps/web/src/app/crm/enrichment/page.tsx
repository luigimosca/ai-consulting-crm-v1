'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/crm/Header';
import { EnrichmentDossierView } from '@/components/crm/EnrichmentDossierView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { type FullEnrichmentDossier } from '@ai-crm/ai';
import {
  Sparkles,
  Globe,
  Search,
  RefreshCw,
  Cpu,
  Layers,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShoppingBag,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  Check,
  ExternalLink,
  MapPin,
  ListFilter
} from 'lucide-react';

export default function EnrichmentPage() {
  const [domainInput, setDomainInput] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [dossier, setDossier] = useState<FullEnrichmentDossier | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-select state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'ecommerce' | 'showcase'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'nuovo' | 'arricchito'>('nuovo');

  // Real-time batch enrichment logs
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    currentLeadName: string;
  }>({ current: 0, total: 0, currentLeadName: '' });
  const [bulkLogs, setBulkLogs] = useState<
    { id: string; name: string; success: boolean; score?: number; platform?: string | null; error?: string }[]
  >([]);
  const [bulkCompleted, setBulkCompleted] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/leads?t=${Date.now()}`);
      const data = await res.json();
      if (data.leads) {
        setLeadsList(data.leads);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leadsList.filter((lead) => {
    if (!lead) return false;
    const matchesSector = filterSector === 'all' || lead.sector === filterSector;
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    let matchesType = true;
    if (filterType === 'ecommerce') {
      matchesType = Boolean(lead.isEcommerce || lead.sector === 'ecommerce');
    } else if (filterType === 'showcase') {
      matchesType = !lead.isEcommerce && lead.sector !== 'ecommerce';
    }
    return matchesSector && matchesStatus && matchesType;
  });

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.includes(l.id));
  const someFilteredSelected = filteredLeads.some((l) => selectedLeadIds.includes(l.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredLeads.map((l) => l.id));
      setSelectedLeadIds(selectedLeadIds.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedLeadIds, ...filteredLeads.map((l) => l.id)]);
      setSelectedLeadIds(Array.from(newIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((i) => i !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleSelectAllUnenriched = () => {
    const unenriched = leadsList.filter((l) => l.status === 'nuovo' || l.score === 0).map((l) => l.id);
    setSelectedLeadIds(unenriched);
  };

  // Single Lead / Domain Enrichment
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput && !selectedLeadId) return;

    setIsLoading(true);
    setErrorMessage(null);
    setBulkLogs([]);
    setBulkCompleted(false);

    try {
      const selectedLead = leadsList.find((l) => l.id === selectedLeadId);

      const res = await fetch('/api/enrichment/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId || undefined,
          companyName: selectedLead?.companyName || domainInput.replace(/^https?:\/\//, '').split('.')[0],
          website: domainInput || selectedLead?.website,
          sector: selectedLead?.sector,
          city: selectedLead?.city,
          address: selectedLead?.address,
          phone: selectedLead?.phone,
          email: selectedLead?.email,
          notes: selectedLead?.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore durante l\'arricchimento del lead');
      }

      setDossier(data.dossier);
      fetchLeads();
    } catch (err: any) {
      console.error('Enrichment error:', err);
      setErrorMessage(err?.message || 'Impossibile completare l\'analisi di arricchimento');
    } finally {
      setIsLoading(false);
    }
  };

  // Batch Multi-Lead Sequential Enrichment
  const handleRunBatchEnrichment = async () => {
    const targetIds = selectedLeadIds.length > 0 
      ? selectedLeadIds 
      : filteredLeads.filter((l) => l.status === 'nuovo').slice(0, 15).map((l) => l.id);

    if (targetIds.length === 0) {
      alert('Nessun lead selezionato o disponibile per l\'arricchimento.');
      return;
    }

    const leadsToEnrich = leadsList.filter((l) => targetIds.includes(l.id));
    if (leadsToEnrich.length === 0) return;

    setIsBulkLoading(true);
    setErrorMessage(null);
    setBulkLogs([]);
    setBulkCompleted(false);
    setBulkProgress({
      current: 0,
      total: leadsToEnrich.length,
      currentLeadName: leadsToEnrich[0].companyName,
    });

    const logs: typeof bulkLogs = [];

    for (let i = 0; i < leadsToEnrich.length; i++) {
      const lead = leadsToEnrich[i];
      setBulkProgress({
        current: i + 1,
        total: leadsToEnrich.length,
        currentLeadName: lead.companyName,
      });

      try {
        const res = await fetch('/api/enrichment/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            companyName: lead.companyName,
            website: lead.website,
            sector: lead.sector,
            city: lead.city,
            phone: lead.phone,
            email: lead.email,
            source: lead.source,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          logs.push({
            id: lead.id,
            name: lead.companyName,
            success: true,
            score: data.dossier?.commercialScore || 85,
            platform: data.dossier?.websiteAnalysis?.cms || (data.dossier?.websiteAnalysis?.isEcommerce ? 'E-commerce' : null),
          });
          setBulkLogs([...logs]);
        } else {
          logs.push({
            id: lead.id,
            name: lead.companyName,
            success: false,
            error: data.error || 'Errore analisi',
          });
          setBulkLogs([...logs]);
        }
      } catch (err: any) {
        logs.push({
          id: lead.id,
          name: lead.companyName,
          success: false,
          error: err?.message || 'Connessione fallita',
        });
        setBulkLogs([...logs]);
      }
    }

    setIsBulkLoading(false);
    setBulkCompleted(true);
    fetchLeads();
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const selected = leadsList.find((l) => l.id === leadId);
    if (selected) {
      setDomainInput(selected.website || '');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <Header
        title="Modulo di Lead Enrichment Reale (Open Data, E-commerce & Web Analysis)"
        description="Analisi automatica e massiva di siti web, piattaforme e-commerce (Shopify, WooCommerce, PrestaShop), recapiti verificati, canali social e maturità digitale."
      />

      {/* Action Bar & Pipeline Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-white text-xs block">Motore AI di Enrichment a 6 Adapter:</span>
            <span className="text-[11px] text-slate-400">
              Scraper Locale &bull; Rilevatore E-commerce &bull; Analisi Stack CMS &bull; Contatti Pubblici &bull; Reputazione Maps &bull; Scoring Vendita
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Aggiorna Dati</span>
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={handleRunBatchEnrichment}
            isLoading={isBulkLoading}
            className="gap-2 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>
              {selectedLeadIds.length > 0 
                ? `⚡ Arricchisci i ${selectedLeadIds.length} Selezionati in Batch` 
                : '⚡ Arricchisci Lead Nuovi in Batch (Auto)'}
            </span>
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Batch Processing Live Progress Box */}
      {(isBulkLoading || bulkCompleted) && (
        <Card className="bg-slate-900 border-blue-900/40 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isBulkLoading ? (
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              )}
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isBulkLoading
                    ? `Arricchimento Massivo in Corso: ${bulkProgress.current} di ${bulkProgress.total}`
                    : `Arricchimento Batch Completato con Successo!`}
                </h4>
                <p className="text-xs text-slate-400">
                  {isBulkLoading
                    ? `In scansione: ${bulkProgress.currentLeadName}`
                    : `${bulkLogs.filter((l) => l.success).length} lead analizzati con successo.`}
                </p>
              </div>
            </div>

            <span className="text-sm font-black text-blue-400">
              {bulkProgress.total > 0
                ? Math.round((bulkProgress.current / bulkProgress.total) * 100)
                : 0}%
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{
                width: `${
                  bulkProgress.total > 0
                    ? (bulkProgress.current / bulkProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pt-2">
            {bulkLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {log.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200 truncate">{log.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {log.platform && (
                    <span className="text-[10px] text-purple-300 bg-purple-950 px-1 py-0.5 rounded border border-purple-800/80">
                      {log.platform}
                    </span>
                  )}
                  {log.success && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      {log.score}/100
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grid: Multi-Select Lead Picker vs Single Lead Analyzer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Select Leads List for Batch Enrichment */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                <span>Seleziona Lead per Arricchimento di Massa</span>
              </h3>
              <p className="text-xs text-slate-400">
                Seleziona i lead desiderati con le checkbox per analizzarli tutti contemporaneamente.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {selectedLeadIds.length} selezionati / {filteredLeads.length} totali
            </span>
          </div>

          {/* Filter sub-bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              {allFilteredSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
              ) : someFilteredSelected ? (
                <MinusSquare className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Square className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>Tutti</span>
            </button>

            <button
              type="button"
              onClick={handleSelectAllUnenriched}
              className="text-slate-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800/60"
            >
              Solo non arricchiti ({leadsList.filter((l) => l.status === 'nuovo').length})
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-7 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-300"
            >
              <option value="all">Tutti i tipi</option>
              <option value="ecommerce">🛍️ Solo E-commerce</option>
              <option value="showcase">🏢 Solo Vetrina</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-7 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-300"
            >
              <option value="all">Tutti gli stati</option>
              <option value="nuovo">Nuovi</option>
              <option value="arricchito">Già Arricchiti</option>
            </select>
          </div>

          {/* Leads Checklist Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nessun lead corrispondente ai filtri.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const isEcom = Boolean(lead.isEcommerce || lead.sector === 'ecommerce');
                return (
                  <div
                    key={lead.id}
                    onClick={() => handleToggleSelectOne(lead.id)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-950/30' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectOne(lead.id);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-600" />
                        )}
                      </button>

                      <div className="truncate">
                        <span className="font-semibold text-white text-xs block truncate">
                          {lead.companyName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {lead.city && <span>{lead.city}</span>}
                          {lead.website && (
                            <span className="font-mono text-blue-400 truncate max-w-[150px]">
                              {lead.website.replace(/^https?:\/\//, '')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEcom ? (
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded">
                          🛍️ {lead.ecommercePlatform || 'E-commerce'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          🏢 Vetrina
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          lead.status === 'arricchito'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {lead.status === 'arricchito' ? `Score: ${lead.score}` : 'Nuovo'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Single Lead / Manual URL Analyzer */}
        <div className="space-y-4">
          <Card className="bg-slate-900/90 border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-400" />
              <span>Analisi Singola Lead / Dominio</span>
            </h3>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Seleziona dal CRM
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleziona o inserisci sotto --</option>
                  {leadsList.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.companyName} ({lead.city || 'Italia'})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Dominio o URL Sito Web *"
                placeholder="es. theroofpompei.com o fisiozone.it"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                required={!selectedLeadId}
                className="text-xs"
              />

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>SSRF Safe &bull; Timeout 8s &bull; Rilevatore E-commerce</span>
              </div>

              <Button
                type="submit"
                variant="glow"
                size="md"
                isLoading={isLoading}
                className="w-full gap-2 text-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>Avvia Analisi Completa</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Dossier Result View */}
      {dossier && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Dossier Completo di Arricchimento
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">{dossier.companyName}</h2>
              {dossier.domain && (
                <a
                  href={dossier.domain.startsWith('http') ? dossier.domain : `https://${dossier.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5 font-mono"
                >
                  <span>{dossier.domain}</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <EnrichmentDossierView dossier={dossier} />
        </div>
      )}
    </div>
  );
}
