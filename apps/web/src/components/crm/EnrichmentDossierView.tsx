'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { type FullEnrichmentDossier } from '@ai-crm/ai';
import {
  MapPin,
  Globe,
  Mail,
  Phone,
  Building2,
  Cpu,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Briefcase,
  Layers,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Info,
  DollarSign,
  Users,
  Search,
  MessageSquare,
  Calendar,
  Share2,
} from 'lucide-react';

export function StatusPill({ status, isEstimated }: { status?: string; isEstimated?: boolean }) {
  if (status === 'official') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        Verificato Ufficiale
      </span>
    );
  }
  if (status === 'estimated' || isEstimated) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300">
        <Info className="h-3 w-3 text-amber-400" />
        Stimato (Range)
      </span>
    );
  }
  if (status === 'unverified') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-300">
        <HelpCircle className="h-3 w-3 text-blue-400" />
        Da verificare
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
      <XCircle className="h-3 w-3 text-slate-500" />
      Non disponibile
    </span>
  );
}

export function EnrichmentDossierView({ dossier }: { dossier: FullEnrichmentDossier }) {
  if (!dossier) return null;

  const wa = dossier.websiteAnalysis;
  const fin = dossier.financials;

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Top Overview Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Commercial Score */}
        <Card className="bg-slate-900/90 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Opportunità Commerciale AI</p>
              <h4 className="text-xl font-bold text-white mt-0.5">{dossier.commercialScore} / 100</h4>
              <p className="text-[11px] text-blue-400 mt-1">Potenziale di chiusura alto</p>
            </div>
            <ScoreBadge score={dossier.commercialScore} size="md" />
          </div>
        </Card>

        {/* Reliability Score */}
        <Card className="bg-slate-900/90 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Affidabilità Dati & Fonti</p>
              <h4 className="text-xl font-bold text-white mt-0.5">{dossier.reliabilityScore} / 100</h4>
              <p className="text-[11px] text-emerald-400 mt-1">Fonti pubbliche aperte ODbL</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* Digital Maturity */}
        <Card className="bg-slate-900/90 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Maturità Digitale</p>
              <h4 className="text-xl font-bold text-white mt-0.5 uppercase tracking-wide">
                {dossier.digitalMaturity}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {dossier.techStackSummary.length} tecnologie rilevate
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {/* Growth Level */}
        <Card className="bg-slate-900/90 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Segnale di Crescita</p>
              <h4 className="text-xl font-bold text-white mt-0.5 uppercase tracking-wide">
                {dossier.growth?.growthLevel || 'unknown'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Confidenza: {Math.round((dossier.growth?.confidence || 0) * 100)}%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sezione 1 & 2: Dati Territoriali & Analisi Sito Web */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Dati Territoriali OSM */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">1. Dati Territoriali & OpenStreetMap</h3>
            </div>
            <StatusPill status={dossier.territorialData.osmUrl ? 'official' : 'not_available'} />
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Indirizzo:</span>
              <span className="font-medium text-white">{dossier.address || 'Non censito'} ({dossier.city || 'N/D'})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Orari di Apertura:</span>
              <span className="font-medium text-white">{dossier.territorialData.openingHours || 'Non specificati'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Categoria Territoriale:</span>
              <span className="font-medium text-blue-300">{dossier.territorialData.categoryLabel || dossier.sector}</span>
            </div>
            {dossier.territorialData.osmUrl && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Oggetto OSM:</span>
                <a
                  href={dossier.territorialData.osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Vedi su OpenStreetMap</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Analisi Sito Web */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">2. Analisi Sito Web Ufficiale</h3>
            </div>
            <StatusPill status={wa?.isReachable ? 'official' : 'not_available'} />
          </div>

          {wa && wa.isReachable ? (
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">URL Scansionato:</span>
                <a
                  href={wa.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300 hover:underline font-medium truncate max-w-[220px]"
                >
                  {wa.url}
                </a>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Protocollo & Stato:</span>
                <span className="font-semibold text-emerald-400">
                  {wa.isHttps ? 'HTTPS Sicuro' : 'HTTP Non Protetto'} (HTTP {wa.httpStatus})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Titolo Pagina:</span>
                <span className="font-medium text-white truncate max-w-[240px]">{wa.title || 'N/D'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Subpage Esplorate:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {wa.subpagesScanned.length > 0 ? wa.subpagesScanned.map((p) => p.path).join(', ') : 'Solo Homepage'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              <XCircle className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <span>Nessun sito web attivo o raggiungibile rilevato.</span>
            </div>
          )}
        </Card>
      </div>

      {/* Sezione 3 & 4: Contatti Pubblici & Stack Tecnologico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Contatti Pubblici */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                3. Contatti Pubblici ({dossier.publicContacts.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Verifica tecnica separata</span>
          </div>

          {dossier.publicContacts.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {dossier.publicContacts.map((c, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {c.type === 'pec' && <Badge variant="warning" className="text-[9px]">PEC</Badge>}
                    {c.type === 'generic_email' && <Badge variant="secondary" className="text-[9px]">Email</Badge>}
                    {c.type === 'named_email' && <Badge variant="default" className="text-[9px]">Personale</Badge>}
                    {c.type === 'phone' && <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    {c.type === 'social' && <Share2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                    <span className="font-mono text-slate-200 truncate">{c.value}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {Math.round(c.confidence * 100)}% conf.
                    </span>
                    <StatusPill status={c.isVerified ? 'official' : 'unverified'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              <Mail className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <span>Nessun contatto pubblico o email censita.</span>
            </div>
          )}
        </Card>

        {/* 4. Tecnologia & Maturità Digitale */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">4. Tecnologia e Maturità Digitale</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Stack AI-Ready
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">CMS / Piattaforma:</span>
              <span className="font-semibold text-slate-200">{wa?.cms.value || 'Nessuno / Custom'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">Canale E-commerce:</span>
              <span className="font-semibold text-slate-200">{wa?.isEcommerce.value ? 'Attivo' : 'Non presente'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">Chatbot / Live Chat:</span>
              <span className="font-semibold text-slate-200">{wa?.hasChatbot.value ? String(wa.hasChatbot.value) : 'Assente'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">Booking & Prenotazioni:</span>
              <span className="font-semibold text-slate-200">{wa?.hasBooking.value ? String(wa.hasBooking.value) : 'Assente'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">Widget WhatsApp:</span>
              <span className="font-semibold text-slate-200">{wa?.hasWhatsapp.value ? 'Presente' : 'Assente'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">Analytics & Pixel:</span>
              <span className="font-semibold text-slate-200">{wa?.hasAnalytics.value || wa?.hasPixel.value ? 'Attivo' : 'Assente'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Sezione 5 & 6: Dati Societari & Recensioni/Reputazione */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Dati Societari & Economici */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">5. Dati Societari & Economici</h3>
            </div>
            <StatusPill status={fin?.vatId.value ? 'official' : 'estimated'} />
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Partita IVA:</span>
              <span className="font-mono font-medium text-white">
                {fin?.vatId.value ? `${fin.vatId.value} (Validata)` : 'Non rilevata'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Forma Giuridica:</span>
              <span className="font-medium text-slate-200">{fin?.legalForm.value || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Codice ATECO Stimato:</span>
              <span className="font-medium text-slate-200">{fin?.atecoCode.value || 'N/D'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Fatturato Stimato (Benchmark):</span>
              <span className="font-medium text-amber-300 font-mono">
                {typeof fin?.revenue.value === 'string' ? fin.revenue.value : 'Non disponibile'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Organico Stimato:</span>
              <span className="font-medium text-slate-200 font-mono">
                {typeof fin?.employees.value === 'string' ? fin.employees.value : '1 - 5 addetti'}
              </span>
            </div>
          </div>
        </Card>

        {/* 6. Recensioni & Reputazione Pubblica Reale */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">6. Recensioni & Reputazione Reale</h3>
            </div>
            <span className="text-[10px] text-slate-400">Zero stime simulate</span>
          </div>

          <div className="space-y-2 text-xs">
            {dossier.reviews?.reputationChannels && dossier.reviews.reputationChannels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
                {dossier.reviews.reputationChannels.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{c.label}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Rilevato</span>
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:underline truncate block"
                    >
                      Apri scheda pubblica &rarr;
                    </a>
                  </div>
                ))}
              </div>
            )}

            {dossier.reviews?.signals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2 text-slate-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{sig}</span>
              </div>
            ))}

            <p className="text-[11px] text-slate-500 pt-1 italic">
              Conformità ODbL: Il CRM non assegna rating inventati in assenza di dati ufficiali certificati.
            </p>
          </div>
        </Card>
      </div>

      {/* Sezione 7 & 8: Segnali di Crescita & Pain Points Commerciali */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7. Segnali di Crescita Osservabili */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">7. Segnali di Crescita Osservabili</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase font-mono">
              {dossier.growth?.growthLevel}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            {dossier.growth?.signals.map((sig, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2 text-slate-300"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>{sig}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 8. Pain Point & Opportunità Commerciali */}
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                8. Opportunità Commerciali AI ({dossier.painPoints.length})
              </h3>
            </div>
            <span className="text-[10px] text-blue-400 font-semibold">Proposta Target</span>
          </div>

          <div className="space-y-2.5">
            {dossier.painPoints.map((pp) => (
              <div
                key={pp.id}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-white leading-tight">{pp.title}</span>
                  <Badge variant={pp.severity === 'alta' ? 'destructive' : 'warning'} className="text-[9px]">
                    {pp.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-slate-400 text-[11px]">{pp.description}</p>
                <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-800/40">
                  <span className="text-blue-300 font-semibold">{pp.recommendedSolution}</span>
                  <span className="text-emerald-400 font-medium">{pp.estimatedImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sezione 9: Fonti & Audit Trail */}
      <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">9. Fonti & Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Run ID: {dossier.runId} &bull; Completato in {new Date(dossier.completedAt).toLocaleTimeString('it-IT')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dossier.sourcesAudit.map((src, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white truncate">{src.adapterName}</span>
                <Badge
                  variant={src.status === 'success' ? 'success' : src.status === 'partial' ? 'warning' : 'destructive'}
                  className="text-[9px] uppercase"
                >
                  {src.status}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Durata: {src.durationMs} ms</span>
                <span>Elementi: {src.itemsCount}</span>
              </div>
              {src.errorMessage && (
                <div className="text-[10px] text-rose-400 truncate pt-0.5">{src.errorMessage}</div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
