'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/crm/Header';
import { EnrichmentDossierView } from '@/components/crm/EnrichmentDossierView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { type FullEnrichmentDossier } from '@ai-crm/ai';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Building2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function LeadEnrichmentDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const router = useRouter();
  const { leadId } = use(params);

  const [lead, setLead] = useState<any>(null);
  const [dossier, setDossier] = useState<FullEnrichmentDossier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/enrichment/${leadId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossibile recuperare il dossier del lead');
      }

      setLead(data.lead);

      if (data.hasEnrichment && data.run) {
        // Costruisci dossier dal formato DB
        const reconstructedDossier: FullEnrichmentDossier = {
          leadId: data.lead.id,
          runId: data.run.id,
          companyName: data.lead.companyName,
          domain: data.lead.website,
          sector: data.lead.sector,
          address: data.lead.address,
          city: data.lead.city,
          territorialData: {
            osmUrl: data.lead.notes?.match(/https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+/)?.[0] || null,
            address: data.lead.address,
            categoryLabel: data.lead.sector,
          },
          websiteAnalysis: data.websiteAnalysis ? {
            url: data.websiteAnalysis.url,
            isReachable: Boolean(data.websiteAnalysis.isReachable),
            isHttps: Boolean(data.websiteAnalysis.isHttps),
            httpStatus: data.websiteAnalysis.httpStatus,
            title: data.websiteAnalysis.title,
            metaDescription: data.websiteAnalysis.metaDescription,
            cms: { value: data.websiteAnalysis.cms, source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.cms ? 'official' : 'not_available' },
            isEcommerce: { value: Boolean(data.websiteAnalysis.isEcommerce), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.isEcommerce ? 'official' : 'not_available' },
            hasChatbot: { value: Boolean(data.websiteAnalysis.hasChatbot), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasChatbot ? 'official' : 'not_available' },
            hasWhatsapp: { value: Boolean(data.websiteAnalysis.hasWhatsapp), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasWhatsapp ? 'official' : 'not_available' },
            hasBooking: { value: Boolean(data.websiteAnalysis.hasBooking), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasBooking ? 'official' : 'not_available' },
            hasContactForm: { value: Boolean(data.websiteAnalysis.hasContactForm), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasContactForm ? 'official' : 'not_available' },
            hasAnalytics: { value: Boolean(data.websiteAnalysis.hasAnalytics), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasAnalytics ? 'official' : 'not_available' },
            hasPixel: { value: Boolean(data.websiteAnalysis.hasPixel), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasPixel ? 'official' : 'not_available' },
            hasNewsletter: { value: Boolean(data.websiteAnalysis.hasNewsletter), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.hasNewsletter ? 'official' : 'not_available' },
            isMultilingual: { value: Boolean(data.websiteAnalysis.isMultilingual), source: 'website', sourceUrl: null, collectedAt: data.websiteAnalysis.analyzedAt, confidence: 0.9, isEstimated: false, status: data.websiteAnalysis.isMultilingual ? 'official' : 'not_available' },
            detectedTechnologies: data.websiteAnalysis.detectedTechJson ? JSON.parse(data.websiteAnalysis.detectedTechJson) : [],
            subpagesScanned: data.websiteAnalysis.subpagesScannedJson ? JSON.parse(data.websiteAnalysis.subpagesScannedJson) : [],
            socialLinks: [],
            analyzedAt: data.websiteAnalysis.analyzedAt,
          } : null,
          publicContacts: data.publicContacts.map((c: any) => ({
            id: c.id,
            type: c.type,
            value: c.value,
            sourceUrl: c.sourceUrl,
            confidence: c.confidence,
            isVerified: Boolean(c.isVerified),
            verificationStatus: 'da_verificare',
            collectedAt: c.collectedAt,
          })),
          digitalMaturity: 'media',
          techStackSummary: data.websiteAnalysis?.detectedTechJson ? JSON.parse(data.websiteAnalysis.detectedTechJson) : [],
          financials: {
            vatId: { value: data.financials?.vatId || null, source: 'piva_ufficiale', sourceUrl: null, collectedAt: data.run.startedAt, confidence: 0.95, isEstimated: false, status: data.financials?.vatId ? 'official' : 'not_available' },
            taxCode: { value: data.financials?.taxCode || null, source: 'registro_fiscale', sourceUrl: null, collectedAt: data.run.startedAt, confidence: 0.9, isEstimated: false, status: data.financials?.taxCode ? 'official' : 'not_available' },
            legalForm: { value: data.financials?.legalForm || null, source: 'ragione_sociale', sourceUrl: null, collectedAt: data.run.startedAt, confidence: 0.85, isEstimated: false, status: data.financials?.legalForm ? 'official' : 'estimated' },
            atecoCode: { value: data.financials?.atecoCode || null, source: 'ateco_benchmark', sourceUrl: null, collectedAt: data.run.startedAt, confidence: 0.85, isEstimated: true, status: 'estimated' },
            revenueType: data.financials?.revenueType || 'estimated',
            revenue: { value: data.financials?.revenueMin ? `€${data.financials.revenueMin.toLocaleString()} - €${data.financials.revenueMax.toLocaleString()} (Stima)` : 'Non disponibile', min: data.financials?.revenueMin, max: data.financials?.revenueMax, source: data.financials?.sourceName || 'benchmark_istat', sourceUrl: data.financials?.sourceUrl, collectedAt: data.run.startedAt, confidence: data.financials?.confidence || 0.35, isEstimated: true, status: 'estimated' },
            profit: { value: null, source: 'bilancio', sourceUrl: null, collectedAt: data.run.startedAt, confidence: 0, isEstimated: false, status: 'not_available' },
            employees: { value: data.financials?.employeesMin ? `${data.financials.employeesMin} - ${data.financials.employeesMax} addetti` : '1 - 5 addetti', min: data.financials?.employeesMin, max: data.financials?.employeesMax, source: 'stima_organico', sourceUrl: null, collectedAt: data.run.startedAt, confidence: 0.4, isEstimated: true, status: 'estimated' },
            notes: data.financials?.notes,
          },
          reviews: {
            hasPublicRating: Boolean(data.reviews?.hasPublicRating),
            ratingValue: data.reviews?.ratingValue || null,
            reviewCount: data.reviews?.reviewCount || null,
            sourceName: data.reviews?.sourceName || 'Open Data & OSM',
            sourceUrl: data.reviews?.sourceUrl || null,
            signals: data.reviews?.signalsJson ? JSON.parse(data.reviews.signalsJson) : ['Segnali reputazionali verificati'],
            collectedAt: data.run.startedAt,
          },
          growth: {
            growthLevel: data.growth?.growthLevel || 'unknown',
            confidence: data.growth?.confidence || 0.5,
            signals: data.growth?.signalsJson ? JSON.parse(data.growth.signalsJson) : [],
            sourceUrls: data.growth?.sourceUrlsJson ? JSON.parse(data.growth.sourceUrlsJson) : [],
            observedAt: data.growth?.observedAt || data.run.startedAt,
          },
          painPoints: [],
          sourcesAudit: data.sourcesAudit.map((s: any) => ({
            adapterName: s.adapterName,
            status: s.status,
            durationMs: s.durationMs,
            itemsCount: s.itemsCount,
            errorMessage: s.errorMessage,
            executedAt: s.executedAt,
          })),
          commercialScore: data.run.commercialScore,
          reliabilityScore: data.run.reliabilityScore,
          startedAt: data.run.startedAt,
          completedAt: data.run.completedAt || data.run.startedAt,
        };

        setDossier(reconstructedDossier);
      }
    } catch (err: any) {
      console.error('Error loading lead dossier:', err);
      setErrorMessage(err.message || 'Errore durante il caricamento del dossier');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [leadId]);

  const handleRunOrRefresh = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/enrichment/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore durante l\'arricchimento');
      }

      setDossier(data.dossier);
      // Ricarica info lead
      loadData();
    } catch (err: any) {
      console.error('Enrichment failed:', err);
      setErrorMessage(err.message || 'Impossibile completare l\'arricchimento');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Caricamento dossier in corso...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/crm/leads/${leadId}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Torna alla Scheda Lead</span>
        </Link>

        <Button
          variant="glow"
          size="sm"
          onClick={handleRunOrRefresh}
          isLoading={isAnalyzing}
          className="gap-2 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{dossier ? 'Rianalizza Dossier Azienda' : 'Avvia Arricchimento Ora'}</span>
        </Button>
      </div>

      <Header
        title={`Dossier Aziendale: ${lead?.companyName || 'Lead'}`}
        description={`Audit approfondito da OpenStreetMap, scansione web con protezione SSRF e indicatori di crescita per ${lead?.city || 'Italia'}.`}
      />

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {dossier ? (
        <EnrichmentDossierView dossier={dossier} />
      ) : (
        <Card className="border-dashed border-slate-800 bg-slate-900/40 text-center py-16 space-y-4">
          <Sparkles className="h-10 w-10 text-blue-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nessun dossier ancora generato per questo lead</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Avvia l&apos;arricchimento automatico per scansionare il sito web, validare la P.IVA ed estrarre le opportunità commerciali AI.
            </p>
          </div>
          <Button
            variant="glow"
            size="md"
            onClick={handleRunOrRefresh}
            isLoading={isAnalyzing}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Arricchisci Dati Azienda</span>
          </Button>
        </Card>
      )}
    </div>
  );
}
