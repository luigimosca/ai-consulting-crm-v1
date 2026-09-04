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
} from 'lucide-react';

export default function EnrichmentPage() {
  const [domainInput, setDomainInput] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [dossier, setDossier] = useState<FullEnrichmentDossier | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bulkStats, setBulkStats] = useState<{ processed: number; errors: number } | null>(null);

  useEffect(() => {
    fetch('/api/leads')
      .then((res) => res.json())
      .then((data) => {
        if (data.leads) setLeadsList(data.leads);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput && !selectedLeadId) return;

    setIsLoading(true);
    setErrorMessage(null);
    setBulkStats(null);

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
    } catch (err: any) {
      console.error('Enrichment error:', err);
      setErrorMessage(err?.message || 'Impossibile completare l\'analisi di arricchimento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkEnrich = async () => {
    if (!confirm('Vuoi avviare l\'arricchimento automatico per i lead importati ancora da analizzare?')) return;

    setIsBulkLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/enrichment/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unEnrichedOnly: true, limit: 15 }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkStats({ processed: data.processedCount || 0, errors: data.errorsCount || 0 });
        // Ricarica la lista lead
        const leadsRes = await fetch('/api/leads');
        const leadsData = await leadsRes.json();
        if (leadsData.leads) setLeadsList(leadsData.leads);
      }
    } catch (err: any) {
      console.error('Bulk enrichment error:', err);
      setErrorMessage(err?.message || 'Errore durante l\'arricchimento massivo');
    } finally {
      setIsBulkLoading(false);
    }
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
        title="Modulo di Lead Enrichment Reale (Open Data & Web Analysis)"
        description="Arricchisci i lead acquisiti da OpenStreetMap con analisi reale del sito web, stack tecnologico (CMS, e-commerce, chatbot, booking, WhatsApp), contatti verificabili, P.IVA e segnali di crescita."
      />

      {/* Action Bar & Bulk Run */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-white text-xs block">Pipeline a 6 Adapter Operativi:</span>
            <span className="text-[11px] text-slate-400">
              OSM &bull; Website Analyzer &bull; Dati Societari &bull; Directory &bull; Reputazione &bull; Crescita
            </span>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkEnrich}
          isLoading={isBulkLoading}
          className="gap-2 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Arricchisci Lead Nuovi in Batch</span>
        </Button>
      </div>

      {bulkStats && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 p-4 rounded-xl text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              Arricchimento massivo completato con successo: <strong>{bulkStats.processed}</strong> lead analizzati ({bulkStats.errors} errori).
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Tool Card */}
      <Card className="bg-slate-900/90 border-slate-800 p-6 shadow-xl space-y-4">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Seleziona un Lead dal CRM
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectLead(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Seleziona o inserisci manualmente sotto --</option>
                {leadsList.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.companyName} ({lead.city || 'Italia'}) - {lead.status}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Dominio o URL Sito Web *"
              placeholder="es. theroofpompei.com o https://pizzeriabellavista.it"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              required={!selectedLeadId}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>Protezione SSRF attiva &bull; Timeout 8s &bull; Scansione subpage controllata</span>
            </div>

            <Button
              type="submit"
              variant="glow"
              size="md"
              isLoading={isLoading}
              className="gap-2 px-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>Avvia Arricchimento Lead</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Dossier Result View */}
      {dossier && (
        <div className="space-y-6">
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
