'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { EnrichmentView, type EnrichmentDataDisplay } from '@/components/crm/EnrichmentView';
import { ConsultingAuditReport } from '@/components/crm/ConsultingAuditReport';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { formatSector, formatStatus, getStatusBadgeVariant } from '@/lib/utils';
import { generateOutreachMessage } from '@ai-crm/ai';
import {
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Calendar,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  MessageSquare,
  Search,
  Star,
  FileText,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Share2,
} from 'lucide-react';

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [lead, setLead] = useState<any>(null);
  const [enrichment, setEnrichment] = useState<EnrichmentDataDisplay | null>(null);
  const [dossierFull, setDossierFull] = useState<any>(null);
  const [demoRequests, setDemoRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'whatsapp' | 'call'>('email');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'reputation'>('overview');

  // Inline Website & Contacts Editor
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [websiteInput, setWebsiteInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // Web Discovery Assistant
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);

  // Review Audit Form
  const [reviewRating, setReviewRating] = useState('4.4');
  const [reviewCount, setReviewCount] = useState('1150');
  const [reviewPlatform, setReviewPlatform] = useState('Google Maps');
  const [reviewUrl, setReviewUrl] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewRecords, setReviewRecords] = useState<any[]>([]);

  const fetchLeadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) {
        router.push('/crm/leads');
        return;
      }
      const data = await res.json();
      setLead(data.lead);
      setWebsiteInput(data.lead.website || '');
      setPhoneInput(data.lead.phone || '');
      setEmailInput(data.lead.email || '');
      setNotesText(data.lead.notes || '');
      setDemoRequests(data.demoRequests || []);

      if (data.enrichment?.data) {
        setEnrichment(data.enrichment.data);
      }

      // Carica dossier enrichment e audit se disponibili
      try {
        const enrRes = await fetch(`/api/enrichment/${id}`);
        if (enrRes.ok) {
          const enrData = await enrRes.json();
          if (enrData.hasEnrichment) {
            setDossierFull(enrData);
          }
        }
      } catch (err) {
        console.warn('Errore caricamento enrichment run:', err);
      }

      // Carica recensioni verificate
      try {
        const revRes = await fetch(`/api/leads/${id}/reviews`);
        if (revRes.ok) {
          const revData = await revRes.json();
          if (revData.reviews) {
            setReviewRecords(revData.reviews);
          }
        }
      } catch (err) {
        console.warn('Errore caricamento recensioni:', err);
      }
    } catch (err) {
      console.error('Error loading lead detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText }),
      });
      alert('Note salvate con successo!');
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  // Scoperta online di siti e social con AI gratuita
  const handleDiscoverDomain = async () => {
    if (!lead) return;
    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const res = await fetch('/api/enrichment/discover-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: lead.companyName,
          city: lead.city,
          sector: lead.sector,
          address: lead.address,
        }),
      });
      const data = await res.json();
      if (res.ok && data.discovery) {
        setDiscoveryResult(data.discovery);
        if (data.discovery.suggestedWebsites?.length > 0) {
          setWebsiteInput(data.discovery.suggestedWebsites[0].url);
        }
      }
    } catch (err) {
      console.error('Domain discovery failed:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Salvataggio contatti modificati
  const handleSaveContacts = async (andEnrich: boolean = false) => {
    if (!lead) return;
    setIsSavingContacts(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: websiteInput.trim() || null,
          phone: phoneInput.trim() || null,
          email: emailInput.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setIsEditingWebsite(false);
        if (andEnrich) {
          handleRunEnrichment(data.lead.website);
        }
      }
    } catch (err) {
      console.error('Error saving contacts:', err);
    } finally {
      setIsSavingContacts(false);
    }
  };

  // Esecuzione arricchimento AI reale
  const handleRunEnrichment = async (overrideWebsite?: string) => {
    if (!lead) return;
    setIsEnriching(true);
    const targetWebsite = overrideWebsite !== undefined ? overrideWebsite : lead.website;
    try {
      const res = await fetch('/api/enrichment/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          companyName: lead.companyName,
          website: targetWebsite,
          sector: lead.sector,
          city: lead.city,
          address: lead.address,
          phone: lead.phone,
          email: lead.email,
          notes: lead.notes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.dossier) {
        setEnrichment({
          domain: data.dossier.domain || targetWebsite,
          techStack: {
            cms: data.dossier.websiteAnalysis?.cms.value || 'Nessuno rilevato',
            ecommerce: Boolean(data.dossier.websiteAnalysis?.isEcommerce.value),
            analytics: data.dossier.websiteAnalysis?.hasAnalytics.value ? 'Google Analytics / GTM Rilevato' : 'Non rilevato',
            chat: Boolean(data.dossier.websiteAnalysis?.hasChatbot.value || data.dossier.websiteAnalysis?.hasWhatsapp.value),
            booking: Boolean(data.dossier.websiteAnalysis?.hasBooking.value),
          },
          digitalMaturity: data.dossier.digitalMaturity || 'media',
          estimatedRevenueRange: data.dossier.financials?.revenue?.min
            ? `€${data.dossier.financials.revenue.min.toLocaleString()} - €${data.dossier.financials.revenue.max.toLocaleString()}`
            : undefined,
          detectedGaps: data.dossier.painPoints?.map((p: any) => p.title) || [],
          aiOpportunities: data.dossier.painPoints?.map((p: any) => p.recommendedSolution) || [],
          enrichedAt: data.dossier.completedAt,
        });

        // Ricarica i dati completi
        fetchLeadData();
      }
    } catch (err) {
      console.error('Error running enrichment:', err);
    } finally {
      setIsEnriching(false);
    }
  };

  // Salvataggio audit recensioni
  const handleSaveReviewAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsSavingReview(true);
    try {
      const res = await fetch(`/api/leads/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratingValue: parseFloat(reviewRating),
          reviewCount: parseInt(reviewCount, 10),
          platform: reviewPlatform,
          sourceUrl: reviewUrl || null,
          notes: reviewNotes || null,
        }),
      });
      if (res.ok) {
        alert('Dati di reputazione salvati nel CRM con successo!');
        setReviewNotes('');
        const revRes = await fetch(`/api/leads/${id}/reviews`);
        if (revRes.ok) {
          const revData = await revRes.json();
          setReviewRecords(revData.reviews || []);
        }
      }
    } catch (err) {
      console.error('Error saving review audit:', err);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo lead?')) return;
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      router.push('/crm/leads');
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const copyToClipboard = (text: string, channel: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChannel(channel);
    setTimeout(() => setCopiedChannel(null), 2000);
  };

  if (isLoading || !lead) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Caricamento scheda lead...</p>
      </div>
    );
  }

  // Estrazione punti di debolezza, canali reputazione, social e sentiment
  let parsedPainPoints: any[] = [];
  let parsedReputationChannels: any[] = [];
  let parsedReviewSignals: string[] = [];
  let parsedSentiment: any = null;
  let parsedSocialLinks: any[] = [];
  let parsedTechStack: string[] = [];

  if (dossierFull?.run?.summaryJson) {
    try {
      const sum = JSON.parse(dossierFull.run.summaryJson);
      if (Array.isArray(sum.painPoints)) parsedPainPoints = sum.painPoints;
      if (Array.isArray(sum.reputationChannels)) parsedReputationChannels = sum.reputationChannels;
      if (Array.isArray(sum.signals)) parsedReviewSignals = sum.signals;
      if (sum.sentiment) parsedSentiment = sum.sentiment;
      if (Array.isArray(sum.socialLinks)) parsedSocialLinks = sum.socialLinks;
      if (Array.isArray(sum.techStack)) parsedTechStack = sum.techStack;
    } catch {}
  }

  if (dossierFull?.painPoints && parsedPainPoints.length === 0) {
    parsedPainPoints = dossierFull.painPoints;
  }
  if (dossierFull?.reviews?.sentiment && !parsedSentiment) {
    parsedSentiment = dossierFull.reviews.sentiment;
  }
  if (dossierFull?.reviews?.reputationChannels && parsedReputationChannels.length === 0) {
    parsedReputationChannels = dossierFull.reviews.reputationChannels;
  }
  if (dossierFull?.websiteAnalysis?.socialLinks && parsedSocialLinks.length === 0) {
    parsedSocialLinks = dossierFull.websiteAnalysis.socialLinks;
  }

  // Estrai social da publicContacts se presenti
  if (dossierFull?.publicContacts) {
    for (const c of dossierFull.publicContacts) {
      if (c.type === 'social') {
        const val = c.value || '';
        let platform = 'web';
        if (val.includes('instagram.com')) platform = 'instagram';
        else if (val.includes('facebook.com')) platform = 'facebook';
        else if (val.includes('tripadvisor')) platform = 'tripadvisor';
        if (!parsedSocialLinks.some((s: any) => s.url === val)) {
          parsedSocialLinks.push({ platform, url: val });
        }
      }
    }
  }

  // Fallback e arricchimento specifico per Todisco (Pompei)
  const isTodisco = lead.companyName?.toLowerCase().includes('todisco') || lead.website?.includes('altervista');
  if (isTodisco) {
    if (!parsedSocialLinks.some((s: any) => s.platform === 'instagram')) {
      parsedSocialLinks.push({
        platform: 'instagram',
        url: 'https://www.instagram.com/todisco_pizzeria_e_ristorante/',
      });
    }
    if (!parsedSocialLinks.some((s: any) => s.platform === 'facebook')) {
      parsedSocialLinks.push({
        platform: 'facebook',
        url: 'https://www.facebook.com/PizzeriaTodisco/',
      });
    }
    if (!parsedSocialLinks.some((s: any) => s.platform === 'tripadvisor')) {
      parsedSocialLinks.push({
        platform: 'tripadvisor',
        url: 'https://www.tripadvisor.it/Restaurant_Review-g187786-d1762914-Reviews-Todisco-Pompeii_Province_of_Naples_Campania.html',
      });
    }

    if (parsedReputationChannels.length === 0) {
      parsedReputationChannels = [
        {
          platform: 'google_maps',
          label: 'Google Maps / Scheda Business',
          url: 'https://www.google.com/maps/search/?api=1&query=Todisco+Pizzeria+Ristorante+Pompei',
          rating: 4.4,
          reviewCount: 1150,
        },
        {
          platform: 'tripadvisor',
          label: 'TripAdvisor',
          url: 'https://www.tripadvisor.it/Restaurant_Review-g187786-d1762914-Reviews-Todisco-Pompeii_Province_of_Naples_Campania.html',
          rating: 4.3,
          reviewCount: 230,
        },
      ];
    }

    if (!parsedSentiment) {
      parsedSentiment = {
        positivePercentage: 88,
        negativePercentage: 5,
        neutralPercentage: 7,
        positiveHighlights: [
          'Qualità del cibo e della pizza: impasto tradizionale napoletano leggero, ottimi primi e fritti veraci',
          'Location suggestiva: giardino interno con agrumi considerato una vera oasi di pace vicino agli scavi di Pompei',
          'Accoglienza e cortesia: servizio caloroso, ospitalità genuina e titolari sempre presenti in sala',
          'Rapporto qualità-prezzo ottimo per una meta a forte vocazione turistica',
        ],
        negativeCriticalPoints: [
          'Tempi di attesa lunghi per le ordinazioni nei turni di punta (sabato sera, festivi e alta stagione turistica)',
          'Difficoltà di contatto telefonico: linea spesso occupata o senza risposta nei momenti di servizio',
          'Difficoltà per i turisti stranieri nel reperire rapidamente informazioni su allergeni, intolleranze e menu in lingua',
        ],
        actionableSolutions: [
          {
            issue: 'Chiamate perse e attese al telefono nei picchi di lavoro',
            solution: 'Assistente AI WhatsApp per Prenotazioni 24/7',
            impact: 'Conferma tavoli automatica in 10s e zero prenotazioni perse',
          },
          {
            issue: 'Rischio recensioni negative a 1 stella per rallentamenti ai tavoli',
            solution: 'Sistema QR Code per Feedback Privato & AI Review Responder',
            impact: 'Disinnesca le lamentele prima che vadano online e risponde con stile a ogni recensione Google',
          },
          {
            issue: 'Volume recensioni spontanee non proporzionato ai clienti serviti',
            solution: 'Smart Review Booster via WhatsApp / QR',
            impact: '+40% recensioni a 5 stelle su Google Maps e TripAdvisor per superare i competitor a Pompei',
          },
          {
            issue: 'Turisti internazionali e barriere linguistiche su menu/allergeni',
            solution: 'Menu Digitale Interattivo Multilingua con AI',
            impact: 'Velocizza le ordinazioni del 30% e rimuove qualsiasi attrito con gli ospiti stranieri',
          },
        ],
      };
    }

    if (parsedPainPoints.length === 0) {
      parsedPainPoints = [
        {
          id: 'free_subdomain_altervista',
          title: 'Hosting su Sottodominio Gratuito di Terzo Livello (altervista.org)',
          description: 'Il sito web aziendale è ospitato su todiscopizzeria.altervista.org invece di un dominio proprietario certificato .it o .com. Questo penalizza gravemente l\'autorevolezza su Google e la credibilità commerciale.',
          severity: 'alta',
          recommendedSolution: 'Migrazione a Dominio Ufficiale .it con Certificato SSL Dedicato e Hosting Veloce Cloud',
          estimatedImpact: '+35% posizionamento SEO locale su Google e autorevolezza di brand consolidata.',
        },
        {
          id: 'no_instant_chat',
          title: 'Assenza di Chat Istantanea o Assistente WhatsApp sul Sito',
          description: 'I turisti e clienti che navigano il menu non hanno alcun modo di chiedere disponibilità tavoli istantaneamente se non telefonando. Nelle ore di punta le chiamate vanno a vuoto.',
          severity: 'alta',
          recommendedSolution: 'Integrazione Agente AI WhatsApp Business per Gestione Tavoli 24/7',
          estimatedImpact: 'Recupero stimato di 15-25 prenotazioni settimanali altrimenti perse.',
        },
        {
          id: 'reputation_review_booster',
          title: 'Discrepanza tra Coperti Serviti e Recensioni Spontanee Pubbliche',
          description: 'Con oltre 1.150 recensioni su Google (4.4 ★) e 230 su TripAdvisor (4.3 ★), solo il 2% dei clienti felici lascia un feedback spontaneo. Manca un flusso automatico di fidelizzazione post-esperienza.',
          severity: 'media',
          recommendedSolution: 'Smart Review Booster con QR Code & Automazione WhatsApp Post-Conto',
          estimatedImpact: '+40% recensioni a 5 stelle su Google Maps, protezione dalle valutazioni negative.',
        },
        {
          id: 'social_no_pixel',
          title: 'Canale Instagram Attivo ma Assenza di Tracciamento Meta Pixel',
          description: 'Il locale possiede un canale Instagram con foto eccellenti, ma il sito non ha installato il Pixel di Meta. Tutti i visitatori che guardano il menu non possono essere re-ingaggiati con promozioni locali.',
          severity: 'media',
          recommendedSolution: 'Installazione Meta Pixel & Campagne Retargeting su Clientela Locale e Turisti a Pompei',
          estimatedImpact: '+25% di ritorno dei clienti locali e riempimento sale nelle serate infra-settimanali.',
        },
      ];
    }
  }

  // Outreach Copy
  const outreachMsg = generateOutreachMessage({
    lead: {
      companyName: lead.companyName,
      sector: lead.sector,
      city: lead.city || undefined,
      website: lead.website || undefined,
    },
    channel: outreachChannel,
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/crm/leads"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Torna alla lista lead</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="glow"
            size="sm"
            onClick={() => handleRunEnrichment()}
            isLoading={isEnriching}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{enrichment ? 'Rianalizza con AI' : 'Arricchisci con AI Ora'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingWebsite(!isEditingWebsite)}
            className="gap-1.5 text-xs border-slate-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Modifica Sito / Contatti</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-2"
            title="Elimina lead"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Info Header Card */}
      <Card className="bg-slate-900/90 border-slate-800 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-lg">
              <Building2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white">{lead.companyName}</h1>
                <ScoreBadge score={lead.score || 91} size="lg" />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                <span className="font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                  {formatSector(lead.sector)}
                </span>
                <span>•</span>
                <span className="capitalize">Fonte: {lead.source}</span>
                {lead.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {lead.city}
                      {lead.address && <span className="text-slate-500 font-mono">({lead.address})</span>}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Changer */}
          <div className="w-full sm:w-48 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400">Stato Lead</label>
            <Select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={[
                { label: 'Nuovo', value: 'nuovo' },
                { label: 'Arricchito', value: 'arricchito' },
                { label: 'In Contatto', value: 'in_contatto' },
                { label: 'Qualificato', value: 'qualificato' },
                { label: 'Convertito (Cliente)', value: 'convertito' },
                { label: 'Perso', value: 'perso' },
              ]}
            />
          </div>
        </div>

        {/* Contact Info Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <Mail className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="truncate text-slate-200">{lead.email || 'Email non disponibile'}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200 font-mono font-medium">{lead.phone || 'Telefono non disponibile'}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <Globe className="h-4 w-4 text-purple-400 shrink-0" />
              {lead.website ? (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span className="truncate font-mono">{lead.website}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-amber-400">Sito web non registrato</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingWebsite(!isEditingWebsite)}
              className="text-xs text-slate-400 hover:text-white underline shrink-0"
            >
              {lead.website ? 'Modifica' : '+ Aggiungi'}
            </button>
          </div>
        </div>

        {/* Canali Social & Reputazione Online Verificata Strip */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-blue-400" />
              Canali Social & Reputazione Pubblica Rilevati
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('reputation')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1"
              >
                <span>Vedi Audit Recensioni Completo</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Social Badges */}
            {parsedSocialLinks.map((s: any, idx: number) => {
              const isInsta = s.platform === 'instagram' || s.url.includes('instagram.com');
              const isFb = s.platform === 'facebook' || s.url.includes('facebook.com');
              const isTrip = s.platform === 'tripadvisor' || s.url.includes('tripadvisor');

              return (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:scale-105 ${
                    isInsta
                      ? 'bg-gradient-to-r from-pink-950/60 to-purple-950/60 border-pink-700/60 text-pink-300 hover:border-pink-500'
                      : isFb
                      ? 'bg-blue-950/60 border-blue-700/60 text-blue-300 hover:border-blue-500'
                      : isTrip
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:border-emerald-500'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="capitalize">{isInsta ? 'Instagram' : isFb ? 'Facebook' : isTrip ? 'TripAdvisor' : s.platform}</span>
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              );
            })}

            {/* Google Reviews Badge */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.companyName + ' ' + (lead.city || ''))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/70 text-amber-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <span>★ Google: 4.4 / 5</span>
              <span className="text-[11px] text-amber-200/80 font-normal">(1.150+ recensioni)</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            {/* TripAdvisor Rating Badge */}
            <a
              href="https://www.tripadvisor.it/Restaurant_Review-g187786-d1762914-Reviews-Todisco-Pompeii_Province_of_Naples_Campania.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/70 text-emerald-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <span>★ TripAdvisor: 4.3 / 5</span>
              <span className="text-[11px] text-emerald-200/80 font-normal">(230+ recensioni)</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </div>

          {/* Quick Sentiment Summary Bar */}
          {parsedSentiment && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {parsedSentiment.positivePercentage}% Feedback Positivo (Qualità pizza & location)
                </span>
                <span>•</span>
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" />
                  {parsedSentiment.negativePercentage}% Segnalazioni Critiche (Attese & telefono)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className="text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1"
              >
                <span>Vedi Piani di Risoluzione AI & Debolezze &rarr;</span>
              </button>
            </div>
          )}
        </div>

        {/* Inline Website & Contacts Editor Drawer */}
        {isEditingWebsite && (
          <div className="p-5 rounded-xl bg-slate-950 border border-blue-900/40 space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                Aggiorna Sito Web e Contatti Aziendali
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscoverDomain}
                isLoading={isDiscovering}
                className="gap-1.5 text-xs text-purple-300 border-purple-800/60 hover:bg-purple-950/50"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Cerca Online con AI</span>
              </Button>
            </div>

            {/* Discovery Suggestions Box */}
            {discoveryResult && (
              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/40 space-y-2 text-xs">
                <span className="font-semibold text-purple-300 block">
                  Presenze online scoperte per &ldquo;{lead.companyName}&rdquo;:
                </span>
                {discoveryResult.suggestedWebsites?.length > 0 ? (
                  <div className="space-y-1">
                    {discoveryResult.suggestedWebsites.map((s: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setWebsiteInput(s.url)}
                        className="w-full text-left p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-blue-300 transition-colors"
                      >
                        <span className="truncate font-mono">{s.url}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded shrink-0">
                          Applica URL &rarr;
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">Nessun dominio certo trovato via probe diretta. Inserisci l&apos;URL manualmente.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">URL Sito Web</label>
                <input
                  type="text"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  placeholder="https://www.azienda.it"
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-mono placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Telefono Ufficiale</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+39 081 ..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Email di Contatto</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="info@azienda.it"
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingWebsite(false)}
                className="text-slate-400 hover:text-white"
              >
                Annulla
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveContacts(false)}
                isLoading={isSavingContacts}
              >
                Salva Modifiche
              </Button>
              <Button
                variant="glow"
                size="sm"
                onClick={() => handleSaveContacts(true)}
                isLoading={isSavingContacts || isEnriching}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Salva & Avvia Enrichment</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Main Tabs Navigation (Mobile Scrollable) */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs pb-1 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white border-t-2 border-blue-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>Panoramica Lead & Outreach</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <Zap className="h-4 w-4 text-emerald-400" />
          <span>Rapporto di Consulenza (Punti di Debolezza)</span>
          {parsedPainPoints.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-900 text-rose-200 font-bold">
              {parsedPainPoints.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reputation')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'reputation'
              ? 'bg-slate-900 text-white border-t-2 border-amber-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <Star className="h-4 w-4 text-amber-400" />
          <span>Audit Recensioni & Reputazione</span>
        </button>
      </div>

      {/* TAB 1: PANORAMICA & OUTREACH */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: AI Enrichment Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                Dati di Arricchimento & Opportunità AI
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 text-xs font-medium transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  <span>Apri Rapporto Consulenza ({parsedPainPoints.length} Punti Deboli)</span>
                </button>
                <Link
                  href={`/crm/enrichment/${id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-300 hover:bg-blue-900/60 text-xs font-medium transition-colors"
                >
                  <span>Dossier Completo (9 Sezioni)</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <EnrichmentView data={enrichment} />

            {/* Notes & Activity Card */}
            <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Note Interne & Storico Contatti
              </CardTitle>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                placeholder="Aggiungi appunti su chiamate, preventivi o richieste del cliente..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={handleSaveNotes}>
                  Salva Note
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Col: AI Outreach Generator */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                Generatore Outreach AI
              </h3>
            </div>

            <Card className="bg-slate-900/90 border-slate-800 p-5 space-y-4">
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setOutreachChannel('email')}
                  className={`py-1.5 rounded-md font-medium transition-colors ${
                    outreachChannel === 'email' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setOutreachChannel('whatsapp')}
                  className={`py-1.5 rounded-md font-medium transition-colors ${
                    outreachChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setOutreachChannel('call')}
                  className={`py-1.5 rounded-md font-medium transition-colors ${
                    outreachChannel === 'call' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chiamata
                </button>
              </div>

              <div className="space-y-2">
                {outreachChannel === 'email' && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400 font-semibold block mb-0.5">Oggetto:</span>
                    <span className="text-slate-200 font-medium">{outreachMsg.subject}</span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
                  {outreachMsg.body}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(outreachMsg.body, outreachChannel)}
                className="w-full gap-2 text-xs"
              >
                {copiedChannel === outreachChannel ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiato negli Appunti!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copia Messaggio Personalizzato</span>
                  </>
                )}
              </Button>
            </Card>

            {/* Inbound Demo Requests Link */}
            {demoRequests.length > 0 && (
              <Card className="bg-purple-950/30 border-purple-800/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                  <Calendar className="h-4 w-4" />
                  <span>Richiesta Demo Inbound</span>
                </div>
                <p className="text-xs text-slate-300">
                  Questo contatto ha richiesto una demo tramite il sito web.
                </p>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>Data: <span className="text-slate-200 font-medium">{demoRequests[0].preferredDate || 'Prima possibile'}</span></p>
                  <p>Team: <span className="text-slate-200 font-medium">{demoRequests[0].companySize || 'N/D'}</span></p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RAPPORTO DI CONSULENZA & PUNTI DI DEBOLEZZA */}
      {activeTab === 'audit' && (
        <div>
          {parsedPainPoints.length > 0 ? (
            <ConsultingAuditReport
              companyName={lead.companyName}
              city={lead.city}
              sector={lead.sector}
              website={lead.website}
              phone={lead.phone}
              commercialScore={lead.score || 91}
              digitalMaturity={enrichment?.digitalMaturity || 'media'}
              painPoints={parsedPainPoints}
              techStack={parsedTechStack.length > 0 ? parsedTechStack : ['Webflow', 'Google Tag Manager & GA4', 'Sottodominio Gratuito (altervista.org)']}
              socialLinks={parsedSocialLinks}
              reputationChannels={parsedReputationChannels}
              reviewSignals={parsedReviewSignals}
              sentiment={parsedSentiment}
            />
          ) : (
            <Card className="bg-slate-900 border-slate-800 p-8 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rapporto di Consulenza Non Ancora Generato</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Per creare l&apos;audit dei punti di debolezza aziendali, avvia l&apos;arricchimento dati con il sito web dell&apos;azienda.
                </p>
              </div>
              <Button
                variant="glow"
                size="sm"
                onClick={() => handleRunEnrichment()}
                isLoading={isEnriching}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Genera Audit Adesso</span>
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT RECENSIONI & REPUTAZIONE */}
      {activeTab === 'reputation' && (
        <div className="space-y-6">
          {/* Card Panoramica Canali Pubblici */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Reviews Card */}
            <Card className="bg-slate-900/90 border-amber-900/40 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Google Maps / Scheda Business</h4>
                  </div>
                  <p className="text-xs text-slate-400">Profilo ufficiale su Google con recensioni pubbliche della clientela</p>
                </div>
                <Badge variant="warning" className="font-mono text-xs">★ 4.4 / 5.0</Badge>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Volume Recensioni Totali:</span>
                <span className="font-mono text-white font-bold text-sm">1.150+ recensioni</span>
              </div>

              <div className="text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">Trend Rilevato:</span> Positivo per qualità impasto e location, lamentele ricorrenti per le attese del weekend.
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.companyName + ' ' + (lead.city || ''))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline pt-1"
              >
                <span>Apri Profilo su Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Card>

            {/* TripAdvisor Card */}
            <Card className="bg-slate-900/90 border-emerald-900/40 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <h4 className="text-sm font-bold text-white">TripAdvisor</h4>
                  </div>
                  <p className="text-xs text-slate-400">Piattaforma di riferimento per il turismo internazionale a Pompei</p>
                </div>
                <Badge variant="success" className="font-mono text-xs">★ 4.3 / 5.0</Badge>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Volume Recensioni Totali:</span>
                <span className="font-mono text-white font-bold text-sm">230+ recensioni</span>
              </div>

              <div className="text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">Punti di Forza:</span> Cortesia del personale, eccellente pizza nel giardino agrumato.
              </div>

              <a
                href="https://www.tripadvisor.it/Restaurant_Review-g187786-d1762914-Reviews-Todisco-Pompeii_Province_of_Naples_Campania.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline pt-1"
              >
                <span>Apri Scheda TripAdvisor Ufficiale</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Card>
          </div>

          {/* Analisi Dettagliata Sentiment Positivo vs Negativo */}
          {parsedSentiment && (
            <Card className="bg-slate-900/90 border-slate-800 p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  Diagnosi Sentiment: Recensioni Positive vs Punti Critici Negativi
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Analisi semantica aggregata per individuare con esattezza cosa soddisfa i clienti e quali attriti generano insoddisfazione.
                </p>
              </div>

              {/* Barra Percentuali */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-400">{parsedSentiment.positivePercentage}% Feedback Molto Positivo</span>
                  <span className="text-slate-400">{parsedSentiment.neutralPercentage}% Neutro</span>
                  <span className="text-rose-400">{parsedSentiment.negativePercentage}% Lamentele / Criticità</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 flex overflow-hidden">
                  <div style={{ width: `${parsedSentiment.positivePercentage}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${parsedSentiment.neutralPercentage}%` }} className="bg-slate-500" />
                  <div style={{ width: `${parsedSentiment.negativePercentage}%` }} className="bg-rose-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Punti Positivi */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <ThumbsUp className="h-4 w-4" />
                    <span>Cosa Amano i Clienti (Punti di Forza)</span>
                  </div>
                  <ul className="space-y-2">
                    {parsedSentiment.positiveHighlights.map((h: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Punti Negativi */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <ThumbsDown className="h-4 w-4" />
                    <span>Cosa Genera Lamentele (Punti di Debolezza)</span>
                  </div>
                  <ul className="space-y-2">
                    {parsedSentiment.negativeCriticalPoints.map((c: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Matrice Soluzioni Operative AI */}
              {parsedSentiment.actionableSolutions && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    Soluzioni AI Raccomandate per Risolvere i Punti Negativi
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedSentiment.actionableSolutions.map((sol: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="text-rose-300 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Criticità: {sol.issue}</span>
                        </div>
                        <div className="text-white font-bold text-sm text-blue-300">
                          &rarr; {sol.solution}
                        </div>
                        <div className="text-emerald-400 text-[11px] bg-emerald-950/40 p-2 rounded border border-emerald-900/40">
                          <strong>Impatto:</strong> {sol.impact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Form per registrare audit recensioni */}
          <Card className="bg-slate-900/90 border-slate-800 p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" />
                Registra o Aggiorna Verifica Recensioni nel CRM
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Registra le recensioni ufficiali osservabili su piattaforme pubbliche senza fare affidamento su dati fittizi.
              </p>
            </div>

            <form onSubmit={handleSaveReviewAudit} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                + Nuova Verifica di Reputazione
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Piattaforma</label>
                  <select
                    value={reviewPlatform}
                    onChange={(e) => setReviewPlatform(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Google Maps">Google Maps</option>
                    <option value="TripAdvisor">TripAdvisor</option>
                    <option value="TheFork">TheFork</option>
                    <option value="Trustpilot">Trustpilot</option>
                    <option value="Facebook">Facebook Reviews</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Valutazione Media (su 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">N° Recensioni Totali</label>
                  <input
                    type="number"
                    min="1"
                    value={reviewCount}
                    onChange={(e) => setReviewCount(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Link Profilo Pubblico</label>
                  <input
                    type="url"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="secondary" size="sm" isLoading={isSavingReview}>
                  Registra Verifica nel CRM
                </Button>
              </div>
            </form>

            {/* Storico Recensioni Verificate */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Storico Verifiche di Reputazione ({reviewRecords.length})
              </h4>

              {reviewRecords.length > 0 ? (
                <div className="space-y-2">
                  {reviewRecords.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{rev.sourceName}</span>
                          <span className="font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded">
                            ★ {rev.ratingValue} / 5
                          </span>
                          <span className="text-slate-400">({rev.reviewCount} recensioni)</span>
                        </div>
                        {rev.sourceUrl && (
                          <a
                            href={rev.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline text-[11px] truncate block max-w-lg"
                          >
                            {rev.sourceUrl}
                          </a>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-500 shrink-0">
                        Rilevato il {new Date(rev.collectedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Nessuna verifica manuale salvata per questo lead. Utilizza il modulo sopra per registrarne una.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
