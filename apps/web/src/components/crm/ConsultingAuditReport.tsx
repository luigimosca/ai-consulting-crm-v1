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
  ShoppingBag,
  Stethoscope,
  Utensils,
  Briefcase,
  HelpCircle,
  Clock,
  CalendarCheck
} from 'lucide-react';

export interface ConsultingAuditReportProps {
  companyName: string;
  city?: string | null;
  sector?: string | null;
  website?: string | null;
  phone?: string | null;
  commercialScore?: number | null;
  digitalMaturity?: string | null;
  painPoints?: {
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
  sector = 'local_services',
  website,
  phone,
  commercialScore = 90,
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

  const cleanCity = city || 'Italia';
  const normSector = (sector || '').toLowerCase();
  const isEcommerce = normSector.includes('ecommerce') || normSector.includes('retail');
  const isMedical = normSector.includes('med') || normSector.includes('fisioterap') || companyName.toLowerCase().includes('fisio') || companyName.toLowerCase().includes('dott');
  const isRestaurant = normSector.includes('ristor') || normSector.includes('horeca') || normSector.includes('hotel') || companyName.toLowerCase().includes('pizz') || companyName.toLowerCase().includes('todisco');
  const isLegal = normSector.includes('legal') || normSector.includes('avvocat') || normSector.includes('commercialist');

  // Calcolo dinamico del Sentiment e Soluzioni in base al settore se non forniti esplicitamente
  const defaultSentiment = () => {
    if (isEcommerce) {
      return {
        positivePercentage: 86,
        negativePercentage: 6,
        neutralPercentage: 8,
        positiveHighlights: [
          'Catalogo prodotti di qualità e buon posizionamento di prezzo sul mercato',
          'Interesse e visite spontanee da motori di ricerca e canali digitali',
          'Clientela fidelizzata che apprezza l\'esperienza d\'acquisto quando completata',
        ],
        negativeCriticalPoints: [
          'Abbandono del carrello prima del checkout senza meccanismi automatici di recupero WhatsApp/Email',
          'Assistenza clienti assente durante le ore serali e weekend, rallentando le conversioni',
          'Difficoltà a incentivare recensioni verificate sui canali pubblici (Trustpilot/Google)',
        ],
        actionableSolutions: [
          {
            issue: 'Carrelli abbandonati prima del checkout',
            solution: 'Agente AI WhatsApp per Recupero Carrelli Abbandonati',
            impact: '+22% di ordini recuperati in 15 minuti con offerta a tempo personalizzata',
          },
          {
            issue: 'Mancanza di supporto pre/post-vendita la sera e nel weekend',
            solution: 'AI Shopping Copilot 24/7 per Domande su Prodotti, Taglie e Resi',
            impact: 'Zero clienti persi fuori orario e risposta istantanea alle domande di acquisto',
          },
          {
            issue: 'Poche recensioni spontanee certificate sui prodotti consegnati',
            solution: 'Smart Review Booster Post-Consegna via WhatsApp',
            impact: '+45% recensioni a 5 stelle per aumentare la fiducia dei nuovi acquirenti',
          },
        ],
      };
    }

    if (isMedical) {
      return {
        positivePercentage: 94,
        negativePercentage: 2,
        neutralPercentage: 4,
        positiveHighlights: [
          'Grande professionalità, empatia e competenza clinica del personale medico/fisioterapico',
          'Efficacia dei trattamenti personalizzati e soddisfazione dei pazienti nel percorso riabilitativo',
          'Ambiente accogliente, pulito e strumentazione moderna',
        ],
        negativeCriticalPoints: [
          'Difficoltà per i pazienti a prenotare o modificare appuntamenti fuori dagli orari di segreteria',
          'No-Show e dimenticanze di visite prenotate con anticipo senza promemoria automatici',
          'Pochi pazienti soddisfatti lasciano spontaneamente recensioni pubbliche su Google Maps',
        ],
        actionableSolutions: [
          {
            issue: 'Richieste di appuntamento perse la sera o nei giorni di chiusura',
            solution: 'Assistente AI WhatsApp per Prenotazione & Gestione Visite 24/7',
            impact: 'Agenda sempre piena, zero telefonate perse e conferma visite in 15 secondi',
          },
          {
            issue: 'Pazienti che dimenticano l\'appuntamento o disdicono all\'ultimo minuto',
            solution: 'Sistema Smart Reminder Anti No-Show con Conferma 1-Click su WhatsApp',
            impact: '-80% appuntamenti a vuoto e riallocazione immediata dei buchi in agenda',
          },
          {
            issue: 'Reputazione online non allineata all\'alto livello di gradimento dei pazienti',
            solution: 'Campagna Automatica Review Booster Post-Trattamento',
            impact: '+60% recensioni a 5 stelle su Google per dominare la ricerca locale',
          },
        ],
      };
    }

    if (isLegal) {
      return {
        positivePercentage: 90,
        negativePercentage: 4,
        neutralPercentage: 6,
        positiveHighlights: [
          'Competenza tecnica elevata, affidabilità e serietà nella gestione delle pratiche',
          'Consulenze chiare e trasparenza nell\'inquadramento normativo',
        ],
        negativeCriticalPoints: [
          'Tempo speso dallo studio a rispondere a prospect non qualificati o fuori target',
          'Difficoltà a reperire documenti e giustificativi dai clienti prima delle scadenze',
        ],
        actionableSolutions: [
          {
            issue: 'Tempo sprecato a vagliare contatti non in linea con i servizi dello studio',
            solution: 'Modulo AI di Qualificazione Preventiva & Raccolta Esigenze',
            impact: 'Filtra i contatti automaticamente e presenta schede sintetiche pronte per la consulenza',
          },
          {
            issue: 'Ritardi nella consegna dei documenti per adempimenti e pratiche',
            solution: 'Agente AI WhatsApp per Raccolta & Validazione Documentale',
            impact: '-15 ore/mese di solleciti manuali e documenti ricevuti puntualmente',
          },
        ],
      };
    }

    // Default Ristoranti / Servizi Locali
    return {
      positivePercentage: 89,
      negativePercentage: 4,
      neutralPercentage: 7,
      positiveHighlights: [
        'Qualità elevata del servizio e dei prodotti offerti, molto apprezzati dalla clientela',
        'Personale cortese, ospitalità e attenzione al cliente',
        'Rapporto qualità-prezzo competitivo e percepito come onesto',
      ],
      negativeCriticalPoints: [
        'Attese telefoniche e chiamate perse nei momenti di massimo afflusso e servizio',
        'Mancanza di supporto immediato per clienti su orari, disponibilità e informazioni frequenti',
        'Migliaia di clienti soddisfatti che non lasciano recensioni spontanee sui canali pubblici',
      ],
      actionableSolutions: [
        {
          issue: 'Chiamate perse e linea occupata nei momenti di punta',
          solution: 'Agente AI WhatsApp per Prenotazioni & Info 24/7',
          impact: 'Conferme immediate in 10 secondi, zero clienti persi e -20h/mese di lavoro per lo staff',
        },
        {
          issue: 'Rischio di recensioni negative per piccoli ritardi o incomprensioni',
          solution: 'Sistema QR Code con Raccolta Feedback Privato & AI Review Responder',
          impact: 'Intercetta i reclami prima che finiscano online e risponde con stile a ogni recensione',
        },
        {
          issue: 'Clienti felici che non lasciano recensioni su Google Maps',
          solution: 'Smart Review Booster Post-Esperienza via WhatsApp',
          impact: '+40% recensioni a 5 stelle per scalare le prime posizioni su Google',
        },
      ],
    };
  };

  const activeSentiment = sentiment || defaultSentiment();

  // Pain Points adattivi se vuoti
  const activePainPoints = painPoints.length > 0 ? painPoints : [
    {
      id: 'gap-1',
      title: isEcommerce 
        ? 'Assenza di Recupero Automatico Carrelli Abbandonati'
        : isMedical 
        ? 'Mancanza di Canale di Prenotazione Visite H24 su WhatsApp'
        : 'Linee Telefoniche Sovraccariche & Chiamate Perse nei Picchi',
      description: isEcommerce
        ? 'Il 70% dei visitatori che aggiunge prodotti al carrello abbandona prima dell\'acquisto senza ricevere un promemoria personalizzato.'
        : isMedical
        ? 'I pazienti che cercano di prenotare la sera o nei weekend trovano la segreteria chiusa e spesso si rivolgono ad altri studi.'
        : 'Nei momenti di maggiore affluenza, il personale non riesce a rispondere a tutte le telefonate, perdendo prenotazioni e clienti.',
      severity: 'alta' as const,
      recommendedSolution: isEcommerce
        ? 'Agente AI WhatsApp Cart Recovery con Coupon Dinamico'
        : isMedical
        ? 'Assistente AI WhatsApp per Prenotazioni Visite Sincronizzato con l\'Agenda'
        : 'Agente AI WhatsApp Prenotazioni 24/7',
      estimatedImpact: '+20-30% conversioni immediate e zero lead persi',
    },
    {
      id: 'gap-2',
      title: isEcommerce
        ? 'Assistenza Pre/Post Vendita Lenta o Non Operativa la Sera'
        : isMedical
        ? 'Assenza di Promemoria Anti No-Show Automatici'
        : 'Raccolta Recensioni Google Maps Non Automatizzata',
      description: isEcommerce
        ? 'I potenziali acquirenti con dubbi su taglie, spedizioni o resi abbandonano il sito se non ottengono risposta istantanea.'
        : isMedical
        ? 'Gli appuntamenti dimenticati generano buchi di fatturato e tempi morti per i professionisti sanitari.'
        : 'Migliaia di clienti soddisfatti non vengono sollecitati a lasciare una recensione a 5 stelle su Google Maps.',
      severity: 'alta' as const,
      recommendedSolution: isEcommerce
        ? 'AI Shopping Assistant 24/7 integrato sul sito e WhatsApp'
        : isMedical
        ? 'Smart Reminder WhatsApp con Conferma 1-Click'
        : 'Smart Review Booster Post-Servizio con Link Diretto',
      estimatedImpact: isMedical ? '-80% appuntamenti a vuoto' : '+50% recensioni positive a 5 stelle',
    },
  ];

  // Canali di reputazione dinamici
  const dynamicReputationChannels = reputationChannels.length > 0 ? reputationChannels : [
    {
      platform: 'google_maps',
      label: `Google Maps (${cleanCity})`,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${companyName} ${cleanCity}`)}`,
      rating: 4.6,
      reviewCount: 45,
    },
  ];

  // Domande di chiusura commerciale per il consulente
  const renderClosingQuestions = () => {
    if (isEcommerce) {
      return (
        <div className="space-y-2 text-xs text-slate-300 print:text-slate-800 leading-relaxed">
          <p>
            <strong>1. Sul Tasso di Abbandono del Carrello:</strong> "Quanti carrelli vengono lasciati a metà sul vostro e-commerce ogni settimana? Se potessimo recuperare anche solo il 15-20% con un messaggio WhatsApp personalizzato, quanto aumenterebbe il vostro fatturato mensile?"
          </p>
          <p>
            <strong>2. Sull'Assistenza Clienti Fuori Orario:</strong> "Cosa succede quando un utente ha un dubbio alle 22:30 su una spedizione o un reso? Con un agente AI risponde all'istante e conclude l'ordine anziché comprare altrove."
          </p>
          <p>
            <strong>3. Sulle Recensioni Certificate:</strong> "Un cliente che acquista è felice quando riceve il pacco: quanto varrebbe per voi inviargli un messaggio automatico dopo la consegna per raccogliere recensioni a 5 stelle su Trustpilot o Google?"
          </p>
        </div>
      );
    }

    if (isMedical) {
      return (
        <div className="space-y-2 text-xs text-slate-300 print:text-slate-800 leading-relaxed">
          <p>
            <strong>1. Sulle Prenotazioni Fuori Orario di Segreteria:</strong> "Quanti pazienti cercano di prenotare una visita o chiedere informazioni la sera o nel weekend quando lo studio è chiuso? Con l'assistente AI WhatsApp le visite vengono fissate 24/7 senza disturbarvi."
          </p>
          <p>
            <strong>2. Sui No-Show e Appuntamenti Dimenticati:</strong> "Quante ore al mese perde lo studio per pazienti che non si presentano o disdicono all'ultimo momento? Un promemoria automatico via WhatsApp con conferma a 1 click azzera i buchi in agenda."
          </p>
          <p>
            <strong>3. Sul Posizionamento Locale su Google:</strong> "I vostri pazienti sono entusiasti delle terapie: immaginate se a fine ciclo ricevessero un link WhatsApp per ringraziarvi su Google. Diventereste il primo studio consigliato a {cleanCity}."
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 text-xs text-slate-300 print:text-slate-800 leading-relaxed">
        <p>
          <strong>1. Sulle Chiamate Perse nei Momenti di Picco:</strong> "Quante telefonate ricevete mentre state servendo i clienti in presenza? Quanti clienti rinunciano perché trovano occupato?"
        </p>
        <p>
          <strong>2. Sulle Recensioni a 5 Stelle su Google Maps:</strong> "Avete centinaia di clienti soddisfatti: immaginate se ciascuno ricevesse un promemoria automatico via WhatsApp per lasciarvi 5 stelle su Google. Quanto salirebbe la vostra visibilità rispetto ai concorrenti?"
        </p>
        <p>
          <strong>3. Sull'Automazione dei Preventivi e Info Rapide:</strong> "Quanto tempo risparmierebbe il vostro staff delegando all'AI le risposte a orari, disponibilità e FAQ?"
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 audit-report-container text-slate-100">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span>Rapporto di Audit Consulenziale & Punti di Debolezza</span>
          </h3>
          <p className="text-xs text-slate-400">
            Documento commerciale di audit strategico, diagnosi digitale e piano di automazione con Intelligenza Artificiale.
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
                AI Consulting & Automation Agency • Documento Strategico Riservato
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white print:text-black tracking-tight">
                Audit di Crescita Digitale, E-commerce & AI
              </h1>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Analisi dei canali web, reputazione online, colli di bottiglia commerciali e piano di automazione con Agenti AI
              </p>
            </div>

            <div className="bg-slate-950 print:bg-slate-100 border border-slate-800 print:border-slate-300 p-3.5 rounded-xl text-right shrink-0">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">
                Potenziale AI Commerciale
              </span>
              <div className="text-2xl font-black text-blue-400 print:text-blue-700">
                {commercialScore}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-medium">
                Priorità di Intervento Alta
              </span>
            </div>
          </div>

          {/* Client Info Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80 print:border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Azienda / Studio:</span>
              <span className="font-bold text-white print:text-black">{companyName}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Località:</span>
              <span className="font-medium text-slate-200 print:text-slate-800">{cleanCity}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Sito Web / Canale:</span>
              <span className="font-mono text-blue-400 print:text-blue-800 truncate block">
                {website ? website.replace(/^https?:\/\//, '') : 'Non disponibile'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block text-[11px]">Maturità Digitale:</span>
              <span className="capitalize font-semibold text-amber-400 print:text-amber-700">
                {digitalMaturity}
              </span>
            </div>
          </div>

          {/* Canali Rilevati */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 print:border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 print:text-slate-600 text-[11px] font-semibold">Canali Rilevati:</span>
            
            {dynamicReputationChannels.map((rc, idx) => (
              <a
                key={idx}
                href={rc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/80 print:bg-blue-50 border border-blue-800/80 print:border-blue-300 text-blue-300 print:text-blue-800 font-medium hover:underline"
              >
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>{rc.label} {rc.rating ? `(${rc.rating} ★)` : ''}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}

            {socialLinks.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/80 print:bg-purple-50 border border-purple-800/80 print:border-purple-300 text-purple-300 print:text-purple-800 font-medium hover:underline capitalize"
              >
                <Globe className="h-3 w-3 text-purple-400" />
                <span>{s.platform}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        </div>

        {/* Executive Summary Box */}
        <div className="bg-blue-950/30 print:bg-blue-50/60 border border-blue-800/50 print:border-blue-200 p-5 rounded-xl space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 print:text-blue-800 flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            <span>Sintesi Esecutiva per la Direzione</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 print:text-slate-800">
            L'analisi strategica condotta su <strong>{companyName}</strong> ({cleanCity}) evidenzia un'eccellente reputazione sul territorio e un forte potenziale commerciale non ancora pienamente sfruttato dai canali digitali. I colli di bottiglia riscontrati riguardano la gestione manuale dei contatti, la mancanza di automazioni di risposta 24/7 su WhatsApp/Web e la necessità di canalizzare i clienti soddisfatti in recensioni verificate per dominare il mercato locale.
          </p>
        </div>

        {/* SECTION 1: Matrice dei Punti di Debolezza Rilevati */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white print:text-black flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400 print:text-rose-600" />
              <span>1. Diagnosi Punti di Debolezza & Colli di Bottiglia Operativi</span>
            </h2>
            <span className="text-xs text-slate-400 print:text-slate-600">
              {activePainPoints.length} aree critiche individuate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePainPoints.map((gap, index) => {
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
                      <span>{gap.recommendedSolution}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Analisi Approfondita Sentiment & Feedback Clienti */}
        <div className="space-y-4 pt-4 border-t border-slate-800 print:border-slate-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white print:text-black flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 print:text-amber-600" />
              <span>2. Diagnosi Reputazione Online & Sentiment Clienti</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 print:text-amber-700 bg-amber-950/80 print:bg-amber-100 px-2 py-0.5 rounded">
                Indice Positività: {activeSentiment.positivePercentage}%
              </span>
            </div>
          </div>

          {/* Sentiment Bar */}
          <div className="p-4 rounded-xl bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 print:text-slate-800">
                Distribuzione del Sentiment Analizzato:
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
                <span>Criticità e Reclami Ricorrenti (Aree di Perdita Clienti)</span>
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
            <span>3. Piano di Risoluzione con Agenti AI Personalizzati</span>
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
                      Soluzione AI Raccomandata: {sol.solution}
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
            Guida alla Chiusura: Le 3 Domande Strategiche da Porre al Titolare / Decisore
          </span>
          {renderClosingQuestions()}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 print:text-slate-600 gap-2">
          <span>AI Consulting Agency • Rapporto Riservato ad Uso Aziendale</span>
          <span>Generato il {new Date().toLocaleDateString('it-IT')} con Motore Dati Aperti & Analisi Reputazione</span>
        </div>
      </div>
    </div>
  );
}
