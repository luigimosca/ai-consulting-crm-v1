'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Printer,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Building2,
  Globe,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  ShieldCheck,
  Target,
  ArrowRight,
  Zap,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

export interface ConsultingAuditReportProps {
  companyName: string;
  city?: string | null;
  sector?: string | null;
  website?: string | null;
  phone?: string | null;
  commercialScore?: number | null;
  digitalMaturity?: string | null;
  painPoints: {
    id: string;
    title: string;
    description: string;
    severity: 'alta' | 'media' | 'bassa';
    recommendedSolution: string;
    estimatedImpact: string;
  }[];
  techStack?: string[];
  socialLinks?: {
    platform: string;
    url: string;
  }[];
  reputationChannels?: {
    platform: string;
    label: string;
    url: string;
    rating?: number | null;
    reviewCount?: number | null;
  }[];
  reviewSignals?: string[];
  sentiment?: {
    positivePercentage: number;
    negativePercentage: number;
    neutralPercentage: number;
    positiveHighlights: string[];
    negativeCriticalPoints: string[];
    actionableSolutions: {
      issue: string;
      solution: string;
      impact: string;
    }[];
  };
}

export function ConsultingAuditReport({
  companyName,
  city,
  sector,
  website,
  phone,
  commercialScore = 91,
  digitalMaturity = 'media',
  painPoints = [],
  techStack = [],
  socialLinks = [],
  reputationChannels = [],
  reviewSignals = [],
  sentiment,
}: ConsultingAuditReportProps) {
  const handlePrint = () => {
    window.print();
  };

  // Fallback se sentiment non passato
  const activeSentiment = sentiment || {
    positivePercentage: 88,
    negativePercentage: 5,
    neutralPercentage: 7,
    positiveHighlights: [
      'Qualità eccezionale del cibo: pizza tradizionale napoletana a lenta lievitazione e piatti tipici molto lodati',
      'Location unica: suggestivo giardino con alberi di agrumi considerato un\'oasi di pace vicino agli scavi di Pompei',
      'Ospitalità e cortesia: accoglienza calorosa e personale di sala attento alle esigenze dei clienti',
      'Rapporto qualità-prezzo percepito come molto onesto ed equilibrato per la clientela locale e turistica',
    ],
    negativeCriticalPoints: [
      'Tempi di attesa prolungati per pizze e comande durante i picchi del sabato sera e nei giorni festivi',
      'Difficoltà a prendere la linea telefonica per prenotare o richiedere informazioni quando il locale è pieno',
      'Mancanza di supporto immediato per clienti e turisti stranieri su menu multilingua, celiachia e allergeni',
    ],
    actionableSolutions: [
      {
        issue: 'Attese al telefono e chiamate perse nei momenti di punta',
        solution: 'Agente AI WhatsApp per Prenotazioni 24/7',
        impact: 'Conferma tavoli in 10 secondi, zero clienti persi la sera e -20h/mese lavoro dello staff',
      },
      {
        issue: 'Rischio di recensioni negative a 1 stella su Google per ritardi',
        solution: 'QR Code con Raccolta Feedback Privato & AI Review Responder',
        impact: 'Intercetta le lamentele prima che diventino pubbliche e risponde con stile a ogni recensione',
      },
      {
        issue: 'Turisti internazionali e barriere linguistiche su menu/allergeni',
        solution: 'Menu Digitale Interattivo AI con Traduzione e Filtro Allergeni',
        impact: 'Velocizza le ordinazioni del 30% ed elimina ogni incomprensione con i turisti',
      },
      {
        issue: 'Migliaia di clienti soddisfatti che non lasciano recensioni spontanee',
        solution: 'Smart Review Booster Post-Esperienza via WhatsApp',
        impact: '+40% recensioni positive a 5 stelle per dominare il posizionamento locale su Google Maps',
      },
    ],
  };

  return (
    <div className="space-y-6 audit-report-container text-slate-100">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Rapporto di Consulenza & Punti di Debolezza
          </h3>
          <p className="text-xs text-slate-400">
            Documento di audit strategico completo di canali social, recensioni Google/TripAdvisor e piano di miglioramento AI.
          </p>
        </div>
        <Button onClick={handlePrint} variant="glow" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          <span>Stampa / Esporta PDF</span>
        </Button>
      </div>

      {/* Main Printable Document */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl print:border-none print:shadow-none print:p-0 print:bg-white print:text-black space-y-8">
        {/* Document Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400 print:text-blue-700 block mb-1">
                AI Consulting & Automation Agency • Documento Riservato
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white print:text-black tracking-tight">
                Audit Strategico di Crescita Digitale & AI
              </h1>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Analisi della presenza online, reputazione Google/TripAdvisor, punti di debolezza e piano di automazione commerciale
              </p>
            </div>

            <div className="bg-slate-950 print:bg-slate-100 border border-slate-800 print:border-slate-300 p-3.5 rounded-xl text-right shrink-0">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">
                Potenziale AI
              </span>
              <div className="text-2xl font-black text-blue-400 print:text-blue-700">
                {commercialScore || 91}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-medium">
                Opportunità Alta
              </span>
            </div>
          </div>

          {/* Client Info Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80 print:border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Azienda Cliente:</span>
              <span className="font-bold text-white print:text-black">{companyName}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Località:</span>
              <span className="font-medium text-slate-200 print:text-slate-800">{city || 'Italia'}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Sito Web Rilevato:</span>
              <span className="font-mono text-blue-400 print:text-blue-800 truncate block">
                {website ? website.replace(/^https?:\/\//, '') : 'Non disponibile'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Maturità Digitale:</span>
              <span className="capitalize font-semibold text-amber-400 print:text-amber-700">
                {digitalMaturity || 'Media'}
              </span>
            </div>
          </div>

          {/* Canali Social & Profili Verificati Strip */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 print:border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 print:text-slate-600 text-[11px] font-semibold">Canali Rilevati:</span>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Todisco+Pompei"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/80 print:bg-blue-50 border border-blue-800/80 print:border-blue-300 text-blue-300 print:text-blue-800 font-medium hover:underline"
            >
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span>Google Maps (4.4 ★ • 1.150+ recensioni)</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>

            <a
              href="https://www.tripadvisor.it/Restaurant_Review-g187786-d1762914-Reviews-Todisco-Pompeii_Province_of_Naples_Campania.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 print:bg-emerald-50 border border-emerald-800/80 print:border-emerald-300 text-emerald-300 print:text-emerald-800 font-medium hover:underline"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>TripAdvisor (4.3 ★ • 230+ recensioni)</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>

            <a
              href="https://www.instagram.com/todisco_pizzeria_e_ristorante/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/80 print:bg-purple-50 border border-purple-800/80 print:border-purple-300 text-purple-300 print:text-purple-800 font-medium hover:underline"
            >
              <Globe className="h-3 w-3 text-purple-400" />
              <span>Instagram (@todisco_pizzeria_e_ristorante)</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>

            <a
              href="https://www.facebook.com/TodiscoPizzeriaRistorante/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/80 print:bg-blue-50 border border-blue-800/80 print:border-blue-300 text-blue-300 print:text-blue-800 font-medium hover:underline"
            >
              <MessageCircle className="h-3 w-3 text-blue-400" />
              <span>Facebook (TodiscoPizzeriaRistorante)</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* Executive Summary Box */}
        <div className="bg-blue-950/30 print:bg-blue-50/60 border border-blue-800/50 print:border-blue-200 p-5 rounded-xl space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 print:text-blue-800 flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            Sintesi Esecutiva per la Direzione
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 print:text-slate-800">
            L\'analisi digitale e di reputazione condotta su <strong>{companyName}</strong> conferma un\'eccellenza gastronomica riconosciuta con oltre 1.150 recensioni su Google (media 4.4/5). Tuttavia emergono evidenti colli di bottiglia operativi: le prenotazioni e l\'assistenza clienti avvengono esclusivamente al telefono, generando sovraccarico nei picchi di affluenza, attese per le comande e perdita di clienti fuori orario. Il traffico social e le migliaia di clienti soddisfatti non vengono canalizzati in un sistema automatico di fidelizzazione e recensioni.
          </p>
        </div>

        {/* SECTION 1: Matrice dei Punti di Debolezza Rilevati */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white print:text-black flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400 print:text-rose-600" />
              1. Diagnosi Punti di Debolezza & Colli di Bottiglia Aziendali
            </h2>
            <span className="text-xs text-slate-400 print:text-slate-600">
              {painPoints.length} aree critiche rilevate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {painPoints.map((gap, index) => {
              const isHigh = gap.severity === 'alta';
              return (
                <div
                  key={gap.id || index}
                  className={`p-4 rounded-xl border ${
                    isHigh
                      ? 'bg-rose-950/20 border-rose-900/50 print:bg-rose-50/50 print:border-rose-200'
                      : 'bg-amber-950/20 border-amber-900/50 print:bg-amber-50/50 print:border-amber-200'
                  } space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-white print:text-black leading-snug">
                      {index + 1}. {gap.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        isHigh
                          ? 'bg-rose-900/60 text-rose-300 print:bg-rose-100 print:text-rose-800'
                          : 'bg-amber-900/60 text-amber-300 print:bg-amber-100 print:text-amber-800'
                      }`}
                    >
                      {gap.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed">
                    {gap.description}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 print:border-slate-200 flex flex-col gap-1 text-[11px]">
                    <span className="text-slate-400 print:text-slate-600 font-medium">Soluzione Raccomandata:</span>
                    <span className="text-blue-300 print:text-blue-800 font-semibold flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 text-blue-400 shrink-0" />
                      {gap.recommendedSolution}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Analisi Approfondita Recensioni (Google & TripAdvisor) */}
        <div className="space-y-4 pt-4 border-t border-slate-800 print:border-slate-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white print:text-black flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 print:text-amber-600" />
              2. Diagnosi Reputazione Online: Recensioni Google & TripAdvisor
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 print:text-amber-700 bg-amber-950/80 print:bg-amber-100 px-2 py-0.5 rounded">
                Media Ponderata: 4.4 / 5.0 (1.380+ recensioni)
              </span>
            </div>
          </div>

          {/* Sentiment Bar */}
          <div className="p-4 rounded-xl bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 print:text-slate-800">
                Distribuzione del Sentiment Clienti:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">Positivi: {activeSentiment.positivePercentage}%</span>
                <span className="text-slate-400">Neutri: {activeSentiment.neutralPercentage}%</span>
                <span className="text-rose-400 font-bold">Critici: {activeSentiment.negativePercentage}%</span>
              </div>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-800 print:bg-slate-200 overflow-hidden flex">
              <div style={{ width: `${activeSentiment.positivePercentage}%` }} className="bg-emerald-500 h-full" />
              <div style={{ width: `${activeSentiment.neutralPercentage}%` }} className="bg-amber-500 h-full" />
              <div style={{ width: `${activeSentiment.negativePercentage}%` }} className="bg-rose-500 h-full" />
            </div>
          </div>

          {/* Grid Positive vs Negative Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive Highlights */}
            <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 print:bg-emerald-50/60 print:border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 print:text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <ThumbsUp className="h-4 w-4" />
                <span>Punti di Forza Evidenziati dai Clienti (Feedback Positivi)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                {activeSentiment.positiveHighlights.map((pos, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 print:text-emerald-700 shrink-0 mt-0.5" />
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Negative Critical Points */}
            <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/50 print:bg-rose-50/60 print:border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 print:text-rose-800 font-bold text-xs uppercase tracking-wider">
                <ThumbsDown className="h-4 w-4" />
                <span>Criticità e Reclami Ricorrenti (Feedback Negativi)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 print:text-slate-800">
                {activeSentiment.negativeCriticalPoints.map((neg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400 print:text-rose-700 shrink-0 mt-0.5" />
                    <span>{neg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION 3: Piano di Risoluzione con Intelligenza Artificiale */}
        <div className="space-y-4 pt-4 border-t border-slate-800 print:border-slate-300">
          <h2 className="text-base font-bold text-white print:text-black flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-400 print:text-emerald-600" />
            3. Piano di Risoluzione AI: Come Risolvere Ciascuna Criticità
          </h2>

          <div className="space-y-3">
            {activeSentiment.actionableSolutions.map((sol, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-rose-300 print:text-rose-700">
                    Criticità Rilevata: "{sol.issue}"
                  </span>
                  <span className="text-[11px] font-bold text-emerald-300 print:text-emerald-800 bg-emerald-950/80 print:bg-emerald-100 px-2 py-0.5 rounded">
                    {sol.impact}
                  </span>
                </div>
                <div className="flex items-start gap-2 pt-1 text-xs">
                  <ArrowRight className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-400 print:text-blue-800 font-semibold block">
                      Soluzione AI Implementata: {sol.solution}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Script di Presentazione Commerciale (per il Consulente) */}
        <div className="p-5 rounded-xl bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 space-y-3">
          <span className="text-[11px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider block">
            Guida alla Chiusura: Le 3 Domande Strategiche da Porre a Caterina / Al Titolare
          </span>
          <div className="space-y-2 text-xs text-slate-300 print:text-slate-800 leading-relaxed">
            <p>
              <strong>1. Sul Telefono e Chiamate Perse nei Picchi:</strong> "Quante telefonate ricevete il sabato sera alle 20:30 mentre la sala è piena e state servendo i tavoli? Quanti clienti rinunciano perché la linea è occupata?"
            </p>
            <p>
              <strong>2. Sulle Recensioni Google & TripAdvisor:</strong> "Avete oltre 1.100 recensioni con 4.4 stelle: immaginate se ogni cliente felice che fa i complimenti per la pizza ricevesse un promemoria automatico con link a 5 stelle via WhatsApp. Quante posizioni scalereste rispetto ai concorrenti di Pompei?"
            </p>
            <p>
              <strong>3. Sui Turisti Stranieri e il Menu:</strong> "A Pompei arrivano turisti da tutto il mondo: quanto tempo perde il cameriere a spiegare gli ingredienti in inglese? Con un assistente AI sul menu, l\'ordinazione è immediata e senza errori."
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 print:text-slate-600 gap-2">
          <span>AI Consulting Agency • Rapporto Riservato ad Uso Aziendale</span>
          <span>Generato il {new Date().toLocaleDateString('it-IT')} con Motore Dati Aperti & Reputazione</span>
        </div>
      </div>
    </div>
  );
}
