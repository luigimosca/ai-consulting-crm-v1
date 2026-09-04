import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { 
  UtensilsCrossed, 
  Briefcase, 
  ShoppingBag, 
  Building2, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Quote 
} from 'lucide-react';

interface SectorData {
  title: string;
  category: string;
  icon: any;
  colorClass: string;
  badge: string;
  heroSubtitle: string;
  painPoints: string[];
  aiSolutions: string[];
  caseStudy: {
    client: string;
    metrics: string;
    quote: string;
  };
}

const SECTOR_DATA: Record<string, SectorData> = {
  'ristoranti-horeca': {
    title: 'AI per Ristoranti, Bar & HORECA',
    category: 'Ristorazione & Food',
    icon: UtensilsCrossed,
    colorClass: 'from-amber-600 to-orange-500',
    badge: 'Food & Hospitality Tech',
    heroSubtitle: 'Automatizza le prenotazioni h24 su WhatsApp, azzera i no-show e gestisci le recensioni online senza rubare tempo al servizio in sala.',
    painPoints: [
      'Telefonate e messaggi persi durante il servizio o nei giorni di chiusura.',
      'No-show frequenti (fino al 15% di tavoli prenotati e non presentati).',
      'Richieste continue e ripetitive su menù, allergeni, orari e parcheggio.',
      'Recensioni negative su Google e TripAdvisor non gestite tempestivamente.',
      'Difficoltà a comunicare con clienti stranieri e turisti in multilingua.',
    ],
    aiSolutions: [
      'Assistente WhatsApp AI h24: accetta prenotazioni, controlla coperti e sincronizza con il gestionale.',
      'Anti No-Show Automatico: invia reminder interattivi con richiesta di conferma a 3 ore dal servizio.',
      'AI Menu & Allergen Expert: risponde istantaneamente a richieste su ingredienti e intolleranze in tutte le lingue.',
      'Reputation AI Manager: genera risposte empatiche e personalizzate a tutte le recensioni online.',
      'Campagne WhatsApp mirate: riempie le serate con bassa affluenza con promozioni personalizzate.',
    ],
    caseStudy: {
      client: 'Osteria & Bistrot (Milano - 75 coperti)',
      metrics: '+42 prenotazioni/settimana recuperate fuoriorario e -85% di no-show nel primo mese.',
      quote: 'Prima durante il servizio perdevamo almeno 10 telefonate a sera. Ora il bot WhatsApp gestisce tutto e la gente arriva già con la prenotazione confermata.',
    },
  },
  'studi-legali-commercialisti': {
    title: 'AI per Studi Legali, Notarili & Commercialisti',
    category: 'Professionisti & Consulenza',
    icon: Briefcase,
    colorClass: 'from-blue-600 to-cyan-500',
    badge: 'Legal & Fiscal AI',
    heroSubtitle: 'Dota il tuo studio di una segreteria intelligente h24 e di un assistente documentale RAG per estrarre informazioni e redigere bozze in pochi secondi.',
    painPoints: [
      'Ore perse a rispondere a prime richieste generiche o clienti non in target.',
      'Archivi digitali enormi con difficoltà a ritrovare clausole e pareri passati.',
      'Gestione manuale dell estrazione dati da fatture, bilanci e contratti.',
      'Scadenze tributarie e legali con continuo rischio di sovraccarico del personale.',
      'Tempo sottratto alla consulenza ad alto valore per compiti burocratici ripetitivi.',
    ],
    aiSolutions: [
      'Segreteria Virtuale AI: qualifica le nuove richieste, raccoglie i dati preliminari e fissa la prima call.',
      'RAG Documentale Privato: cerca e interroga istantaneamente migliaia di atti, sentenze e pratiche interne.',
      'AI Document Extractor: estrae dati contabili e clausole da PDF e contratti in formato strutturato.',
      'Redazione Bozze e Lettere: genera draft di comunicazioni formali basandosi sui template dello studio.',
      'Monitor Scadenze & Reminder: avvisa clienti e collaboratori delle scadenze imminenti.',
    ],
    caseStudy: {
      client: 'Studio Associato Tributario & Legale (Roma - 12 professionisti)',
      metrics: 'Risparmiate 18 ore a settimana per socio e qualificato il 100% dei lead inbound.',
      quote: 'La ricerca documentale interna che prima richiedeva ore ora avviene in 3 secondi. La segreteria AI ci passa solo clienti realmente qualificati.',
    },
  },
  'ecommerce': {
    title: 'AI per E-commerce & Store Digitali',
    category: 'E-commerce & Retail',
    icon: ShoppingBag,
    colorClass: 'from-purple-600 to-pink-500',
    badge: 'E-commerce Automation',
    heroSubtitle: 'Aumenta il tasso di conversione, consiglia il prodotto ideale con il personal shopper AI e recupera i carrelli abbandonati via WhatsApp.',
    painPoints: [
      'Carrelli abbandonati superiori al 70% senza un canale di recupero diretto.',
      'Visitatori indecisi che abbandonano il sito senza trovare la taglia o variante adatta.',
      'Customer support intasato da richieste ripetitive su spedizioni, resi e disponibilità.',
      'Creazione manuale e lenta di centinaia di schede prodotto ottimizzate SEO.',
      'Esperienza d acquisto fredda e priva di assistenza personalizzata.',
    ],
    aiSolutions: [
      'AI Shopping Assistant: consiglia prodotti, taglie e abbinamenti guidando l utente alla cassa.',
      'WhatsApp Abandoned Cart Recovery: invia messaggi conversazionali per recuperare gli ordini interrotti.',
      'Agente Supporto Resi & Ordini: verifica lo stato spedizione h24 collegandosi al corriere.',
      'AI Catalog Generator: crea titoli, descrizioni persuasive e tag SEO per interi cataloghi.',
      'Cross-Selling Dinamico: propone prodotti complementari durante la chat post-acquisto.',
    ],
    caseStudy: {
      client: 'Store Fashion & Accessori Online (Fatturato €1.2M)',
      metrics: '+21% di carrelli recuperati via WhatsApp e -60% ticket di assistenza sul tracking ordini.',
      quote: 'L assistente virtuale converte utenti che prima abbandonavano il sito con domande banali sulle taglie.',
    },
  },
  'strutture-turistiche': {
    title: 'AI per Hotel, Resort, B&B & Turismo',
    category: 'Ospitalità & Viaggi',
    icon: Building2,
    colorClass: 'from-emerald-600 to-teal-500',
    badge: 'Hospitality & Tourism AI',
    heroSubtitle: 'Un Concierge AI multilingua per gestire prenotazioni dirette, guidare il check-in e vendere esperienze ed escursioni senza commissioni OTA.',
    painPoints: [
      'Commissioni altissime (18-25%) pagate a Booking.com e OTA per mancanza di prenotazione diretta.',
      'Ospiti stranieri che scrivono a tutte le ore in lingue diverse richiedendo assistenza.',
      'Personale alla reception sovraccarico nelle ore di punta tra check-in e domande turistiche.',
      'Mancata valorizzazione di servizi extra (ristorante, spa, tour guidati, transfer).',
      'Recensioni negative per tempi di risposta lenti su WhatsApp prima dell arrivo.',
    ],
    aiSolutions: [
      'Concierge Virtuale 12 Lingue: risponde su WhatsApp e Web a qualsiasi domanda sulla struttura e la città.',
      'Motore Booking Diretto AI: propone tariffe agevolate e chiude prenotazioni dirette senza intermediari.',
      'Digital Check-in Assistant: raccoglie documenti e dati anagrafici prima dell arrivo dell ospite.',
      'Upselling di Esperienze: raccomanda tour locali, cene e trattamenti spa aumentando lo scontrino medio.',
      'Feedback & Review Booster: richiede recensioni solo agli ospiti soddisfatti al momento del check-out.',
    ],
    caseStudy: {
      client: 'Boutique Hotel & Relais (Firenze - 24 camere)',
      metrics: '+34% di prenotazioni dirette e €14.000 di tour ed extra venduti tramite Concierge AI.',
      quote: 'I clienti adorano avere consigli istantanei sulla città su WhatsApp nella loro lingua madre.',
    },
  },
};

export function generateStaticParams() {

  return [
    { sector: 'ristoranti-horeca' },
    { sector: 'studi-legali-commercialisti' },
    { sector: 'ecommerce' },
    { sector: 'strutture-turistiche' },
  ];
}

export default async function SectorDetailPage({

  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector } = await params;
  const data = SECTOR_DATA[sector];

  if (!data) {
    notFound();
  }

  const Icon = data.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Sector Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>{data.badge}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          {data.title}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          {data.heroSubtitle}
        </p>

        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={`/demo?sector=${sector}`}>
            <Button variant="glow" size="lg" className="gap-2 px-8 py-4 font-bold text-base">
              <Sparkles className="h-4 w-4" />
              <span>Richiedi Demo per {data.category}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Problems vs AI Solutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pain points */}
        <Card className="border-rose-900/40 bg-slate-900/70 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">La Sfida</span>
              <h3 className="text-xl font-bold text-white">Problemi Tipici del Settore</h3>
            </div>
          </div>

          <ul className="space-y-3.5 text-sm">
            {data.painPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-rose-400 mt-2 shrink-0" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* AI Solutions */}
        <Card className="border-emerald-900/40 bg-slate-900/70 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">La Risposta</span>
              <h3 className="text-xl font-bold text-white">Soluzioni AI Dedicate</h3>
            </div>
          </div>

          <ul className="space-y-3.5 text-sm">
            {data.aiSolutions.map((sol, index) => (
              <li key={index} className="flex items-start gap-3 text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed text-slate-200">{sol}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Case Study Card */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="h-4 w-4" />
          <span>Caso d&apos;Uso Reale</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-white">{data.caseStudy.client}</h4>
            <p className="text-sm font-semibold text-emerald-400">{data.caseStudy.metrics}</p>
          </div>

          <div className="md:max-w-md bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-300 italic relative">
            <Quote className="h-4 w-4 text-blue-500/30 absolute top-2 right-2" />
            &ldquo;{data.caseStudy.quote}&rdquo;
          </div>
        </div>
      </div>

      {/* Bottom CTA Box */}
      <div className="text-center p-10 rounded-3xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-800/40 space-y-4">
        <h3 className="text-2xl font-bold text-white">
          Vuoi vedere come funzionerebbe nella tua attività?
        </h3>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          I nostri consulenti prepareranno una demo interattiva basata sulle tue esigenze specifiche.
        </p>
        <div className="pt-2">
          <Link href={`/demo?sector=${sector}`}>
            <Button variant="glow" size="lg" className="px-8 py-3.5 font-bold">
              Prenota la Demo di 15 Minuti
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
