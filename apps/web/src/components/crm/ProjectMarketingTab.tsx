'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  Megaphone,
  Plus,
  BarChart3,
  TrendingUp,
  Target,
  Globe,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Check,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Layers,
  Search,
  ExternalLink,
  DollarSign,
  MousePointerClick,
  Percent,
  Calculator,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface ProjectMarketingTabProps {
  projectId: string;
  projectTitle: string;
  projectCode: string;
  isManagerOrEditor: boolean;
  currentUserRole?: string;
  onRefreshProject?: () => void;
}

const CHANNELS_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  google_search: {
    label: 'Google Search Ads',
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  google_performance_max: {
    label: 'Google Performance Max',
    icon: Sparkles,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  google_display_remarketing: {
    label: 'Google Display & Remarketing',
    icon: Layers,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  meta_ads_lead_generation: {
    label: 'Meta Ads (Lead Gen)',
    icon: Megaphone,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
  },
  meta_ads_conversions: {
    label: 'Meta Ads (Conversioni & Vendite)',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  meta_ads_brand_awareness: {
    label: 'Meta Ads (Brand Awareness & Video)',
    icon: Eye,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  local_seo_google_maps: {
    label: 'Local SEO & Google Maps Promo',
    icon: Globe,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
  },
  email_marketing_retention: {
    label: 'Email Marketing & Retention',
    icon: MessageSquare,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  other_channel: {
    label: 'Altro Canale Pubblicitario',
    icon: Target,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
  draft: { label: 'Bozza Strategica', variant: 'secondary' },
  in_planning: { label: 'In Pianificazione', variant: 'warning' },
  pending_client_approval: { label: 'In Approvazione Cliente', variant: 'warning' },
  active: { label: 'Attiva in Esecuzione', variant: 'success' },
  paused: { label: 'In Pausa', variant: 'secondary' },
  completed: { label: 'Completata', variant: 'default' },
  cancelled: { label: 'Annullata', variant: 'destructive' },
};

const APPROVAL_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: 'Bozza Copy',
    color: 'text-slate-400',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
  },
  internal_review: {
    label: 'Revisione Interna',
    color: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-700/50',
  },
  client_approval_requested: {
    label: 'Inviata al Cliente',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-700/50',
  },
  approved: {
    label: 'Approvata',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700/50',
  },
  changes_requested: {
    label: 'Modifiche Richieste',
    color: 'text-rose-400',
    bg: 'bg-rose-950/40',
    border: 'border-rose-700/50',
  },
};

export function ProjectMarketingTab({
  projectId,
  projectTitle,
  projectCode,
  isManagerOrEditor,
  currentUserRole,
  onRefreshProject,
}: ProjectMarketingTabProps) {
  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Selected Campaign Detail Modal / View
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'creatives' | 'kpi_reports' | 'settings'>('creatives');

  // Modals state
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
  const [isNewCreativeModalOpen, setIsNewCreativeModalOpen] = useState(false);
  const [isNewKpiReportModalOpen, setIsNewKpiReportModalOpen] = useState(false);
  const [isUtmBuilderModalOpen, setIsUtmBuilderModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State: Campaign
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    channel: 'google_search',
    objective: 'Generazione Lead qualificati',
    monthlyBudgetCents: 50000, // 500 €
    currency: 'EUR',
    startDate: '',
    endDate: '',
    status: 'draft',
    targetGeography: 'Italia',
    targetLanguages: 'Italiano',
    targetKeywords: [] as string[],
    rawKeywordsText: '',
    platformAccountId: '',
    assignedOperatorId: '',
  });

  // Form State: Creative
  const [creativeForm, setCreativeForm] = useState({
    variantName: 'Variante A - Offerta Lancio',
    format: 'search_responsive_ad',
    headlinesText: "Consulenza Strategica AI\nIncrementa i Tuoi Clienti\nRichiedi Demo Gratuita\nSoluzioni Personalizzate",
    descriptionsText: "Sfrutta l'intelligenza artificiale per ottimizzare i processi aziendali.\nPrenota subito una sessione con i nostri esperti dedicati.",
    primaryBodyCopy: "Hai un'impresa e vuoi automatizzare il marketing e le vendite con l'AI? Scopri il nostro ecosistema su misura.",
    callToAction: 'Richiedi Disponibilità',
    destinationUrl: 'https://ai-consulting.agency/promo',
    autoBuildUtm: true,
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'promo_q4',
    utmTerm: '',
    utmContent: 'ad_var_a',
  });

  // Form State: KPI Report
  const [kpiForm, setKpiForm] = useState({
    periodMonth: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    spendEuro: 500,
    impressions: 12500,
    clicks: 450,
    conversionsCount: 28,
    conversionValueEuro: 2800,
    sourceType: 'manual_entry',
    executiveSummary: 'Ottima performance con CTR del 3.6% e CPA a 17.85€. Incremento conversioni +15% su mobile.',
    optimizationsPlanned: 'Aggiunta estensioni di chiamata e rotazione annunci responsive con nuovi titoli.',
  });

  // Form State: Standalone UTM Builder
  const [utmBuilderForm, setUtmBuilderForm] = useState({
    baseUrl: 'https://ai-consulting.agency/offerta',
    source: 'google',
    medium: 'cpc',
    campaign: 'lead_generation_2026',
    term: 'consulenza_ai',
    content: 'banner_top',
  });
  const [generatedUtmUrl, setGeneratedUtmUrl] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, campaignsRes, accountsRes, usersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/marketing-overview`),
        fetch(`/api/projects/${projectId}/client-campaigns`),
        fetch(`/api/platform-accounts?projectId=${projectId}`),
        fetch('/api/users'),
      ]);

      if (overviewRes.ok) {
        const d = await overviewRes.json();
        setOverview(d.data);
      }
      if (campaignsRes.ok) {
        const d = await campaignsRes.json();
        setCampaigns(d.data || []);
      }
      if (accountsRes.ok) {
        const d = await accountsRes.json();
        setPlatformAccounts(d.data || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsersList(d.users || []);
      }
    } catch (err) {
      console.error('Failed loading marketing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const keywords = campaignForm.rawKeywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/projects/${projectId}/client-campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignForm.name,
          channel: campaignForm.channel,
          objective: campaignForm.objective,
          monthlyBudgetCents: Math.round(campaignForm.monthlyBudgetCents),
          currency: campaignForm.currency,
          startDate: campaignForm.startDate || null,
          endDate: campaignForm.endDate || null,
          status: campaignForm.status,
          targetGeography: campaignForm.targetGeography,
          targetLanguages: campaignForm.targetLanguages,
          targetKeywords: keywords,
          platformAccountId: campaignForm.platformAccountId || null,
          assignedOperatorId: campaignForm.assignedOperatorId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore creazione campagna');

      setIsNewCampaignModalOpen(false);
      setSuccessMessage('Campagna sponsorizzata creata con successo!');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
      if (onRefreshProject) onRefreshProject();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (camp: any) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/client-campaigns/${camp.id}`);
      if (res.ok) {
        const d = await res.json();
        setSelectedCampaign(d.data);
      } else {
        setSelectedCampaign(camp);
      }
    } catch {
      setSelectedCampaign(camp);
    }
  };

  const handleCreateCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const headlines = creativeForm.headlinesText
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);

    const descriptions = creativeForm.descriptionsText
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/client-campaigns/${selectedCampaign.id}/creatives`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantName: creativeForm.variantName,
            format: creativeForm.format,
            headlines,
            descriptions,
            primaryBodyCopy: creativeForm.primaryBodyCopy,
            callToAction: creativeForm.callToAction,
            destinationUrl: creativeForm.destinationUrl,
            autoBuildUtm: creativeForm.autoBuildUtm,
            utmSource: creativeForm.utmSource,
            utmMedium: creativeForm.utmMedium,
            utmCampaign: creativeForm.utmCampaign,
            utmTerm: creativeForm.utmTerm,
            utmContent: creativeForm.utmContent,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore creazione creatività');

      setIsNewCreativeModalOpen(false);
      setSuccessMessage('Variante creativa salvata con tracciamento UTM.');
      setTimeout(() => setSuccessMessage(null), 3000);
      handleOpenDetail(selectedCampaign);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCreativeApproval = async (
    creativeId: string,
    newStatus: string,
    feedbackNotes?: string
  ) => {
    if (!selectedCampaign) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/client-campaigns/${selectedCampaign.id}/creatives/${creativeId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvalStatus: newStatus,
            feedbackNotes: feedbackNotes || null,
          }),
        }
      );

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Errore aggiornamento approvazione');
        return;
      }

      handleOpenDetail(selectedCampaign);
      loadData();
    } catch (err) {
      console.error('Error updating approval:', err);
    }
  };

  const handleCreateKpiReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/client-campaigns/${selectedCampaign.id}/kpi-reports`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            periodMonth: kpiForm.periodMonth,
            spendCents: Math.round(kpiForm.spendEuro * 100),
            impressions: Number(kpiForm.impressions),
            clicks: Number(kpiForm.clicks),
            conversionsCount: Number(kpiForm.conversionsCount),
            conversionValueCents: Math.round(kpiForm.conversionValueEuro * 100),
            sourceType: kpiForm.sourceType,
            executiveSummary: kpiForm.executiveSummary,
            optimizationsPlanned: kpiForm.optimizationsPlanned,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore registrazione report KPI');

      setIsNewKpiReportModalOpen(false);
      setSuccessMessage('Report KPI mensile registrato con successo.');
      setTimeout(() => setSuccessMessage(null), 3000);
      handleOpenDetail(selectedCampaign);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateUtmUrl = async () => {
    try {
      const res = await fetch('/api/marketing/utm-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utmBuilderForm),
      });
      const json = await res.json();
      if (res.ok && json.data?.trackedUrl) {
        setGeneratedUtmUrl(json.data.trackedUrl);
      } else {
        alert(json.error || 'Errore generazione link');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterChannel !== 'all' && c.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 font-bold px-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-indigo-400" />
            <span>Marketing & Ads Hub Cliente</span>
          </h3>
          <p className="text-xs text-slate-400">
            Campagne sponsorizzate su Google & Meta Ads, copywriting creatività, tracciamento UTM e reportistica KPI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsUtmBuilderModalOpen(true);
              handleGenerateUtmUrl();
            }}
            className="text-xs gap-1.5 bg-blue-950/40 text-blue-300 border-blue-800/80 hover:bg-blue-900/50"
          >
            <LinkIcon className="h-3.5 w-3.5 text-blue-400" />
            <span>Generatore UTM</span>
          </Button>

          {isManagerOrEditor && (
            <Button
              size="sm"
              onClick={() => setIsNewCampaignModalOpen(true)}
              className="text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuova Campagna Sponsorizzata</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Aggregate Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="bg-slate-950 border-slate-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-indigo-400" />
              Budget Allocato / Mese
            </span>
            <div className="text-lg font-bold text-white font-mono">
              €{(overview.totalAllocatedBudgetCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] text-slate-400">
              {overview.activeCampaignsCount} attive su {overview.totalCampaignsCount} totali
            </span>
          </Card>

          <Card className="bg-slate-950 border-slate-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              Spesa Cumulata Registrata
            </span>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              €{(overview.totalSpendCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] text-slate-400">Dati KPI rendicontati</span>
          </Card>

          <Card className="bg-slate-950 border-slate-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <MousePointerClick className="h-3 w-3 text-blue-400" />
              Click & Impression
            </span>
            <div className="text-lg font-bold text-white font-mono">
              {overview.totalClicks.toLocaleString('it-IT')}
            </div>
            <span className="text-[10px] text-slate-400">
              {overview.totalImpressions.toLocaleString('it-IT')} visualizzazioni (CTR: {overview.ctrPercentage}%)
            </span>
          </Card>

          <Card className="bg-slate-950 border-slate-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Calculator className="h-3 w-3 text-amber-400" />
              CPC Medio
            </span>
            <div className="text-lg font-bold text-amber-400 font-mono">
              €{overview.cpcAverageEuro.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-400">Costo medio per click</span>
          </Card>

          <Card className="bg-slate-950 border-slate-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Target className="h-3 w-3 text-purple-400" />
              Conversioni & Lead
            </span>
            <div className="text-lg font-bold text-purple-400 font-mono">
              {overview.totalConversions}
            </div>
            <span className="text-[10px] text-slate-400">
              CPA medio: €{overview.cpaEuro.toFixed(2)}
            </span>
          </Card>

          <Card className="bg-slate-950 border-slate-800 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-teal-400" />
              ROAS / Ritorno Ads
            </span>
            <div className="text-lg font-bold text-teal-400 font-mono">
              {overview.roasRatio > 0 ? `${overview.roasRatio}x` : 'N/D'}
            </div>
            <span className="text-[10px] text-slate-400">
              Valore: €{(overview.totalConversionValueCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </span>
          </Card>
        </div>
      )}

      {/* Campaigns Filters & List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-48"
            >
              <option value="all">Tutti i Canali Ads</option>
              {Object.entries(CHANNELS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-44"
            >
              <option value="all">Tutti gli Stati</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>

          <span className="text-xs text-slate-400">
            {filteredCampaigns.length} campagne sponsorizzate
          </span>
        </div>

        {/* Campaigns Table / Cards */}
        <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
          {filteredCampaigns.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <Megaphone className="h-10 w-10 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400 max-w-sm mx-auto">
                Nessuna campagna pubblicitaria attiva o pianificata. Crea la prima campagna per gestire copy, creatività e KPI report.
              </div>
              {isManagerOrEditor && (
                <Button
                  size="sm"
                  onClick={() => setIsNewCampaignModalOpen(true)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Crea Campagna
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Canale & Nome Campagna</th>
                    <th className="py-3 px-4">Stato</th>
                    <th className="py-3 px-4">Budget / Mese</th>
                    <th className="py-3 px-4">Creatività & Copy</th>
                    <th className="py-3 px-4">Account / Delega</th>
                    <th className="py-3 px-4">Ultimo Report KPI</th>
                    <th className="py-3 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredCampaigns.map((camp) => {
                    const ch = CHANNELS_CONFIG[camp.channel] || CHANNELS_CONFIG.other_channel;
                    const st = STATUS_CONFIG[camp.status] || STATUS_CONFIG.draft;
                    const ChannelIcon = ch.icon;

                    return (
                      <tr
                        key={camp.id}
                        className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                        onClick={() => handleOpenDetail(camp)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-lg ${ch.bg} ${ch.border} border ${ch.color} shrink-0`}>
                              <ChannelIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-white hover:text-indigo-300 transition-colors">
                                {camp.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span>{ch.label}</span>
                                {camp.targetGeography && (
                                  <>
                                    <span>•</span>
                                    <span>{camp.targetGeography}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          €{(camp.monthlyBudgetCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                          <span className="text-[10px] text-slate-400 block font-sans">al mese</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-slate-200 font-medium">
                              {camp.creativesCount} {camp.creativesCount === 1 ? 'variante' : 'varianti'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {camp.platformAccount ? (
                            <div className="text-slate-300">
                              <span className="font-medium block">{camp.platformAccount.accountName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {camp.platformAccount.externalId || 'N/D'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Non associato</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {camp.latestKpiReport ? (
                            <div>
                              <span className="font-mono text-emerald-400 font-semibold block">
                                €{(camp.latestKpiReport.spendCents / 100).toFixed(0)} spesi ({camp.latestKpiReport.periodMonth})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {camp.latestKpiReport.conversionsCount} lead • CTR {camp.latestKpiReport.ctrPercentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Nessun report</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(camp);
                            }}
                            className="text-xs h-7 px-2.5 bg-slate-900 border-slate-750 text-indigo-300 hover:bg-indigo-950/40"
                          >
                            Dettagli & Copy
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* CAMPAIGN DETAIL MODAL (CREATIVES STUDIO + KPI REPORTS)                    */}
      {/* ========================================================================= */}
      {selectedCampaign && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedCampaign(null)}
          title={`Campagna: ${selectedCampaign.name}`}
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Top Details & Header Summary */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_CONFIG[selectedCampaign.status]?.variant || 'default'}>
                    {STATUS_CONFIG[selectedCampaign.status]?.label || selectedCampaign.status}
                  </Badge>
                  <span className="text-xs text-slate-300 font-mono">
                    Budget: €{(selectedCampaign.monthlyBudgetCents / 100).toLocaleString('it-IT')} / mese
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {selectedCampaign.assignedOperator && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                      Operatore: <strong className="text-slate-200">{selectedCampaign.assignedOperator.name}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <div>
                  <strong className="text-slate-400">Obiettivo:</strong> {selectedCampaign.objective}
                </div>
                {selectedCampaign.targetKeywords?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <strong className="text-slate-400">Target Keyword:</strong>
                    {selectedCampaign.targetKeywords.map((kw: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-300 font-mono"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs inside Campaign Detail */}
            <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveDetailTab('creatives')}
                className={`px-4 py-2 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
                  activeDetailTab === 'creatives'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Creatività & Copywriting ({selectedCampaign.creatives?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab('kpi_reports')}
                className={`px-4 py-2 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
                  activeDetailTab === 'kpi_reports'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span>Report KPI Mensili ({selectedCampaign.kpiReports?.length || 0})</span>
              </button>
            </div>

            {/* TAB: CREATIVES STUDIO */}
            {activeDetailTab === 'creatives' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Varianti Copy & Annunci</h4>
                    <p className="text-[11px] text-slate-400">
                      Bozze di testo, preview realistica annunci e link tracciati UTM.
                    </p>
                  </div>

                  {isManagerOrEditor && (
                    <Button
                      size="sm"
                      onClick={() => setIsNewCreativeModalOpen(true)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi Annuncio / Variante
                    </Button>
                  )}
                </div>

                {(!selectedCampaign.creatives || selectedCampaign.creatives.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    Nessun annuncio o creatività inserita per questa campagna.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCampaign.creatives.map((cr: any) => {
                      const appConfig = APPROVAL_STATUS_CONFIG[cr.approvalStatus] || APPROVAL_STATUS_CONFIG.draft;

                      return (
                        <Card key={cr.id} className="bg-slate-950 border-slate-800 p-4 space-y-4">
                          {/* Creative Header & Status Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-bold text-white">{cr.variantName}</span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${appConfig.bg} ${appConfig.color} ${appConfig.border}`}>
                                {appConfig.label}
                              </span>
                            </div>

                            {/* Approval action buttons for Project Manager / Admin */}
                            <div className="flex items-center gap-2">
                              {cr.approvalStatus !== 'approved' && isManagerOrEditor && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateCreativeApproval(cr.id, 'approved')}
                                    className="text-[11px] h-7 bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Approva Annuncio
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const reason = prompt('Inserisci le modifiche richieste per il copy:');
                                      if (reason) handleUpdateCreativeApproval(cr.id, 'changes_requested', reason);
                                    }}
                                    className="text-[11px] h-7 text-rose-300 border-rose-800/80 hover:bg-rose-950/40"
                                  >
                                    Richiedi Modifiche
                                  </Button>
                                </>
                              )}
                              {cr.approvalStatus === 'approved' && cr.approvedAt && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Approvato il {cr.approvedAt.slice(0, 10)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Live Visual Ad Preview Mockup */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Google Search Mockup */}
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                                <Search className="h-3 w-3 text-blue-400" />
                                Anteprima Google Search Ad
                              </div>

                              <div className="p-3 bg-white text-slate-900 rounded-lg shadow-sm font-sans space-y-1">
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <span className="font-bold text-slate-800">Sponsorizzato</span>
                                  <span>•</span>
                                  <span className="truncate">{cr.destinationUrl.replace('https://', '')}</span>
                                </div>
                                <div className="text-blue-700 hover:underline font-medium text-xs cursor-pointer line-clamp-1">
                                  {cr.headlines?.length > 0 ? cr.headlines.join(' | ') : 'Titolo Annuncio Accattivante'}
                                </div>
                                <div className="text-slate-600 text-[11px] line-clamp-2">
                                  {cr.descriptions?.length > 0 ? cr.descriptions.join(' ') : 'Descrizione persuasiva con call to action diretta per massimizzare il CTR.'}
                                </div>
                              </div>
                            </div>

                            {/* Right: Meta Sponsored Feed Mockup */}
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                                <Megaphone className="h-3 w-3 text-indigo-400" />
                                Anteprima Meta Ads (Feed & Reels)
                              </div>

                              <div className="p-3 bg-slate-850 text-slate-100 rounded-lg border border-slate-750 font-sans space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                                    AI
                                  </div>
                                  <div className="text-[11px]">
                                    <div className="font-bold">{projectTitle}</div>
                                    <div className="text-[9px] text-slate-400">Sponsorizzato</div>
                                  </div>
                                </div>

                                <div className="text-xs text-slate-200">
                                  {cr.primaryBodyCopy || 'Testo principale persuasivo dell\'annuncio per catturare l\'attenzione del pubblico target.'}
                                </div>

                                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between gap-2">
                                  <div className="truncate">
                                    <div className="text-[10px] text-slate-400 uppercase truncate">
                                      {cr.destinationUrl.replace('https://', '').split('/')[0]}
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                      {cr.headlines?.[0] || 'Richiedi Informazioni'}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 rounded bg-slate-700 text-white font-semibold text-[11px] shrink-0 pointer-events-none"
                                  >
                                    {cr.callToAction || 'Scopri di più'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Tracked UTM URL with Copy Button */}
                          {cr.trackedUrl && (
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs truncate">
                                <LinkIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <span className="text-slate-400 shrink-0">Link Tracciato UTM:</span>
                                <span className="font-mono text-indigo-300 truncate text-[11px]">
                                  {cr.trackedUrl}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(cr.trackedUrl, cr.id)}
                                className="text-xs h-7 px-2.5 gap-1 shrink-0"
                              >
                                {copiedText === cr.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span>Copiato</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copia</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          )}

                          {cr.feedbackNotes && (
                            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-1">
                              <strong>Note di revisione:</strong> {cr.feedbackNotes}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: KPI REPORTS */}
            {activeDetailTab === 'kpi_reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Rendicontazione Mensile & Performance</h4>
                    <p className="text-[11px] text-slate-400">
                      Metriche di spesa, click, conversioni con calcolo automatico CTR, CPC, CPA e ROAS.
                    </p>
                  </div>

                  {isManagerOrEditor && (
                    <Button
                      size="sm"
                      onClick={() => setIsNewKpiReportModalOpen(true)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Registra Report Mese
                    </Button>
                  )}
                </div>

                {(!selectedCampaign.kpiReports || selectedCampaign.kpiReports.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    Nessun report di spesa e conversione registrato per questa campagna.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCampaign.kpiReports.map((report: any) => (
                      <Card key={report.id} className="bg-slate-950 border-slate-800 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">
                              Periodo: {report.periodMonth}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {report.sourceType === 'manual_entry' ? 'Inserimento Manuale' : report.sourceType}
                            </span>
                          </div>

                          <div className="text-xs font-mono font-bold text-emerald-400">
                            Spesa: €{(report.spendCents / 100).toLocaleString('it-IT')}
                          </div>
                        </div>

                        {/* Calculated Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-400">Impression & Click</span>
                            <div className="font-mono font-semibold text-slate-200">
                              {report.clicks.toLocaleString()} click / {report.impressions.toLocaleString()} imp
                            </div>
                            <div className="text-[10px] text-blue-400 font-bold">
                              CTR: {report.ctrPercentage}%
                            </div>
                          </div>

                          <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-400">CPC Medio</span>
                            <div className="font-mono font-semibold text-amber-400">
                              €{report.cpcAverageEuro ? report.cpcAverageEuro.toFixed(2) : '0.00'}
                            </div>
                            <div className="text-[10px] text-slate-400">per singolo click</div>
                          </div>

                          <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-400">Conversioni / Lead</span>
                            <div className="font-mono font-semibold text-purple-400">
                              {report.conversionsCount} conversioni
                            </div>
                            <div className="text-[10px] text-purple-300 font-bold">
                              CPA: €{report.cpaEuro ? report.cpaEuro.toFixed(2) : '0.00'}
                            </div>
                          </div>

                          <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-400">Valore & ROAS</span>
                            <div className="font-mono font-semibold text-teal-400">
                              €{report.conversionValueCents ? (report.conversionValueCents / 100).toLocaleString('it-IT') : '0'}
                            </div>
                            <div className="text-[10px] text-teal-300 font-bold">
                              ROAS: {report.roasRatio ? `${report.roasRatio}x` : 'N/D'}
                            </div>
                          </div>
                        </div>

                        {report.executiveSummary && (
                          <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                            <strong className="text-slate-400 block mb-0.5">Sintesi Analitica:</strong>
                            {report.executiveSummary}
                          </div>
                        )}

                        {report.optimizationsPlanned && (
                          <div className="text-xs text-slate-300 bg-blue-950/20 p-2.5 rounded border border-blue-900/30">
                            <strong className="text-blue-400 block mb-0.5">Ottimizzazioni Pianificate:</strong>
                            {report.optimizationsPlanned}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CAMPAIGN                                                */}
      {/* ========================================================================= */}
      {isNewCampaignModalOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsNewCampaignModalOpen(false)}
          title="Nuova Campagna Sponsorizzata"
        >
          <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Nome Campagna *</label>
              <Input
                required
                placeholder="Es: Google Search - Lead Gen Imprese Q4"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Canale Pubblicitario *</label>
                <Select
                  value={campaignForm.channel}
                  onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  {Object.entries(CHANNELS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Budget Mensile Previsto (€) *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={campaignForm.monthlyBudgetCents / 100}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      monthlyBudgetCents: Number(e.target.value) * 100,
                    })
                  }
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Obiettivo Strategico *</label>
              <Input
                required
                placeholder="Es: Generazione di 30 lead B2B con target CPA < 25€"
                value={campaignForm.objective}
                onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Area Geografica Target</label>
                <Input
                  placeholder="Es: Italia / Lombardia / Raggio 30km"
                  value={campaignForm.targetGeography}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetGeography: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Stato Iniziale</label>
                <Select
                  value={campaignForm.status}
                  onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Account Pubblicitario / Delega</label>
                <Select
                  value={campaignForm.platformAccountId}
                  onChange={(e) => setCampaignForm({ ...campaignForm, platformAccountId: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="">Nessun account collegato</option>
                  {platformAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.platformType})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Operatore Responsabile</label>
                <Select
                  value={campaignForm.assignedOperatorId}
                  onChange={(e) => setCampaignForm({ ...campaignForm, assignedOperatorId: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="">Assegna in seguito</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Parole Chiave / Ricerche Target (una per riga)</label>
              <textarea
                rows={3}
                placeholder="consulenza aziendale ai&#10;ottimizzazione processi&#10;agenzia software b2b"
                value={campaignForm.rawKeywordsText}
                onChange={(e) => setCampaignForm({ ...campaignForm, rawKeywordsText: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsNewCampaignModalOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500">
                {isSubmitting ? 'Salvataggio...' : 'Crea Campagna'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CREATIVE / COPY                                               */}
      {/* ========================================================================= */}
      {isNewCreativeModalOpen && selectedCampaign && (
        <Dialog
          isOpen={true}
          onClose={() => setIsNewCreativeModalOpen(false)}
          title={`Nuovo Annuncio: ${selectedCampaign.name}`}
        >
          <form onSubmit={handleCreateCreative} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Nome Variante *</label>
                <Input
                  required
                  placeholder="Es: Variante B - Angolo Efficienza"
                  value={creativeForm.variantName}
                  onChange={(e) => setCreativeForm({ ...creativeForm, variantName: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Formato Annuncio</label>
                <Select
                  value={creativeForm.format}
                  onChange={(e) => setCreativeForm({ ...creativeForm, format: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="search_responsive_ad">Google Search Responsive Ad</option>
                  <option value="meta_single_image">Meta Single Image Feed Ad</option>
                  <option value="meta_carousel">Meta Carousel Ad</option>
                  <option value="meta_video_reel">Meta Video Reel / Story</option>
                  <option value="display_responsive_banner">Banner Display Responsive</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Titoli Annuncio (Headlines, uno per riga)</label>
              <textarea
                rows={3}
                placeholder="Consulenza AI per Aziende&#10;Riduci i Costi Operativi&#10;Richiedi Audit Gratuito"
                value={creativeForm.headlinesText}
                onChange={(e) => setCreativeForm({ ...creativeForm, headlinesText: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Descrizioni Annuncio (una per riga)</label>
              <textarea
                rows={2}
                placeholder="Ottimizza i tuoi processi con soluzioni di intelligenza artificiale su misura.&#10;Contatta i nostri consulenti per una dimostrazione."
                value={creativeForm.descriptionsText}
                onChange={(e) => setCreativeForm({ ...creativeForm, descriptionsText: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Testo Principale (Primary Body Copy per Meta Ads)</label>
              <textarea
                rows={2}
                placeholder="Inserisci il copy esteso per post sponsorizzati e inserzioni social..."
                value={creativeForm.primaryBodyCopy}
                onChange={(e) => setCreativeForm({ ...creativeForm, primaryBodyCopy: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">URL Destinazione (Landing Page) *</label>
                <Input
                  required
                  placeholder="https://cliente.it/landing-offerta"
                  value={creativeForm.destinationUrl}
                  onChange={(e) => setCreativeForm({ ...creativeForm, destinationUrl: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Call to Action</label>
                <Input
                  placeholder="Es: Richiedi Disponibilità / Scopri di Più"
                  value={creativeForm.callToAction}
                  onChange={(e) => setCreativeForm({ ...creativeForm, callToAction: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            {/* UTM Tagging Option */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={creativeForm.autoBuildUtm}
                  onChange={(e) => setCreativeForm({ ...creativeForm, autoBuildUtm: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700"
                />
                <span className="font-bold">Genera automaticamente parametri di tracciamento UTM</span>
              </label>

              {creativeForm.autoBuildUtm && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div>
                    <label className="text-slate-400 block">utm_source</label>
                    <Input
                      value={creativeForm.utmSource}
                      onChange={(e) => setCreativeForm({ ...creativeForm, utmSource: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-[11px] h-7"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block">utm_medium</label>
                    <Input
                      value={creativeForm.utmMedium}
                      onChange={(e) => setCreativeForm({ ...creativeForm, utmMedium: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-[11px] h-7"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block">utm_campaign</label>
                    <Input
                      value={creativeForm.utmCampaign}
                      onChange={(e) => setCreativeForm({ ...creativeForm, utmCampaign: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-[11px] h-7"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsNewCreativeModalOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500">
                {isSubmitting ? 'Salvataggio...' : 'Salva Annuncio'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD KPI REPORT                                                     */}
      {/* ========================================================================= */}
      {isNewKpiReportModalOpen && selectedCampaign && (
        <Dialog
          isOpen={true}
          onClose={() => setIsNewKpiReportModalOpen(false)}
          title={`Report Prestazioni Mensili: ${selectedCampaign.name}`}
        >
          <form onSubmit={handleCreateKpiReport} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Mese di Riferimento (AAAA-MM) *</label>
                <Input
                  type="month"
                  required
                  value={kpiForm.periodMonth}
                  onChange={(e) => setKpiForm({ ...kpiForm, periodMonth: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Spesa Effettiva Mese (€) *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={kpiForm.spendEuro}
                  onChange={(e) => setKpiForm({ ...kpiForm, spendEuro: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Impression</label>
                <Input
                  type="number"
                  min="0"
                  value={kpiForm.impressions}
                  onChange={(e) => setKpiForm({ ...kpiForm, impressions: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Click</label>
                <Input
                  type="number"
                  min="0"
                  value={kpiForm.clicks}
                  onChange={(e) => setKpiForm({ ...kpiForm, clicks: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Conversioni / Lead</label>
                <Input
                  type="number"
                  min="0"
                  value={kpiForm.conversionsCount}
                  onChange={(e) => setKpiForm({ ...kpiForm, conversionsCount: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Valore Totale Conversioni (€ opzionale per ROAS)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={kpiForm.conversionValueEuro}
                onChange={(e) => setKpiForm({ ...kpiForm, conversionValueEuro: Number(e.target.value) })}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            {/* Real-time KPI Calculator Preview */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] grid grid-cols-4 gap-2">
              <div>
                <span className="text-slate-400 block">CTR Calcolato</span>
                <span className="font-mono text-blue-400 font-bold">
                  {kpiForm.impressions > 0 ? ((kpiForm.clicks / kpiForm.impressions) * 100).toFixed(2) : '0.00'}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">CPC Medio</span>
                <span className="font-mono text-amber-400 font-bold">
                  €{kpiForm.clicks > 0 ? (kpiForm.spendEuro / kpiForm.clicks).toFixed(2) : '0.00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">CPA Medio</span>
                <span className="font-mono text-purple-400 font-bold">
                  €{kpiForm.conversionsCount > 0 ? (kpiForm.spendEuro / kpiForm.conversionsCount).toFixed(2) : '0.00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">ROAS Ratio</span>
                <span className="font-mono text-teal-400 font-bold">
                  {kpiForm.spendEuro > 0 ? (kpiForm.conversionValueEuro / kpiForm.spendEuro).toFixed(2) : '0.00'}x
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Sintesi Esecutiva Risultati</label>
              <textarea
                rows={2}
                placeholder="Riepilogo delle performance e considerazioni qualitative..."
                value={kpiForm.executiveSummary}
                onChange={(e) => setKpiForm({ ...kpiForm, executiveSummary: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">Ottimizzazioni per il Prossimo Mese</label>
              <textarea
                rows={2}
                placeholder="Modifiche di bid, test creativi, esclusione keyword o aggiustamento budget..."
                value={kpiForm.optimizationsPlanned}
                onChange={(e) => setKpiForm({ ...kpiForm, optimizationsPlanned: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsNewKpiReportModalOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500">
                {isSubmitting ? 'Salvataggio...' : 'Registra Report KPI'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STANDALONE UTM BUILDER TOOL                                        */}
      {/* ========================================================================= */}
      {isUtmBuilderModalOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsUtmBuilderModalOpen(false)}
          title="Strumento Generatore Link Tracciati UTM"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-400">
              Costruisci link con parametri standard per tracciare le visite e le conversioni su Google Analytics 4.
            </p>

            <div className="space-y-1">
              <label className="text-slate-400 block font-medium">URL di Destinazione (Base URL) *</label>
              <Input
                placeholder="https://sito-cliente.it/landing-page"
                value={utmBuilderForm.baseUrl}
                onChange={(e) => setUtmBuilderForm({ ...utmBuilderForm, baseUrl: e.target.value })}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Sorgente (utm_source) *</label>
                <Input
                  placeholder="google / meta / newsletter / linkedin"
                  value={utmBuilderForm.source}
                  onChange={(e) => setUtmBuilderForm({ ...utmBuilderForm, source: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Mezzo (utm_medium) *</label>
                <Input
                  placeholder="cpc / banner / email / social"
                  value={utmBuilderForm.medium}
                  onChange={(e) => setUtmBuilderForm({ ...utmBuilderForm, medium: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Campagna (utm_campaign) *</label>
                <Input
                  placeholder="lead_generation_q4"
                  value={utmBuilderForm.campaign}
                  onChange={(e) => setUtmBuilderForm({ ...utmBuilderForm, campaign: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Termine (utm_term)</label>
                <Input
                  placeholder="consulenza_ai"
                  value={utmBuilderForm.term}
                  onChange={(e) => setUtmBuilderForm({ ...utmBuilderForm, term: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Contenuto (utm_content)</label>
                <Input
                  placeholder="ad_cta_blu"
                  value={utmBuilderForm.content}
                  onChange={(e) => setUtmBuilderForm({ ...utmBuilderForm, content: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-[11px]"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateUtmUrl}
              className="w-full bg-blue-600 hover:bg-blue-500 text-xs"
            >
              Aggiorna Link Tracciato
            </Button>

            {generatedUtmUrl && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">URL Finale Tracciata:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(generatedUtmUrl, 'modal_utm')}
                    className="text-xs h-7 px-2.5 gap-1"
                  >
                    {copiedText === 'modal_utm' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copiato</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copia Link</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="font-mono text-xs text-blue-300 break-all p-2 rounded bg-slate-950 border border-slate-850 select-all">
                  {generatedUtmUrl}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsUtmBuilderModalOpen(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
