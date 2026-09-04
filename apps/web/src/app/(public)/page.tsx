import React from 'react';
import Link from 'next/link';
import { Hero } from '@/components/public/Hero';
import { SectorCard } from '@/components/public/SectorCard';
import { Button } from '@/components/ui/Button';
import { 
  UtensilsCrossed, 
  Briefcase, 
  ShoppingBag, 
  Building2, 
  Sparkles, 
  ArrowRight, 
  Bot, 
  Cpu, 
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export default function HomePage() {
  const sectors = [
    {
      slug: 'ristoranti-horeca',
      title: 'Ristoranti & HORECA',
      category: 'Food & Beverage',
      description: 'Gestisci le prenotazioni dei tavoli h24 su WhatsApp, rispondi alle richieste di menù/allergeni ed elimina i no-show.',
      solutions: [
        'Assistente WhatsApp per prenotazioni tavoli',
        'Promemoria automatici e riempimento orari morti',
        'Risposte intelligenti alle recensioni Google/Tripadvisor',
      ],
      icon: UtensilsCrossed,
      colorClass: 'bg-gradient-to-tr from-amber-600 to-orange-500',
    },
    {
      slug: 'studi-legali-commercialisti',
      title: 'Studi Legali & Commercialisti',
      category: 'Professionisti',
      description: 'Segreteria virtuale h24 per la qualifica dei clienti, ricerca istantanea su atti e contratti con agenti RAG dedicati.',
      solutions: [
        'Assistente documentale RAG su archivio pratiche',
        'Segreteria AI per prima qualifica e presa appuntamenti',
        'Automazione estrazione dati fatture e contratti',
      ],
      icon: Briefcase,
      colorClass: 'bg-gradient-to-tr from-blue-600 to-cyan-500',
    },
    {
      slug: 'ecommerce',
      title: 'E-commerce & Retail Digitale',
      category: 'Vendita Online',
      description: 'Guida i visitatori all acquisto come un commesso esperto e recupera fino al 24% dei carrelli abbandonati.',
      solutions: [
        'Shopping Assistant AI per raccomandazioni su misura',
        'Recupero carrelli abbandonati via WhatsApp',
        'Supporto h24 su tracking spedizioni e resi',
      ],
      icon: ShoppingBag,
      colorClass: 'bg-gradient-to-tr from-purple-600 to-pink-500',
    },
    {
      slug: 'strutture-turistiche',
      title: 'Hotel, B&B & Turismo',
      category: 'Ospitalità',
      description: 'Concierge AI multilingua per rispondere agli ospiti, gestire check-in e vendere servizi extra senza commissioni.',
      solutions: [
        'Concierge AI in 12 lingue su WhatsApp e Web',
        'Automazione prenotazioni dirette disintermediando le OTA',
        'Upselling dinamico di tour ed esperienze locali',
      ],
      icon: Building2,
      colorClass: 'bg-gradient-to-tr from-emerald-600 to-teal-500',
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <Hero />

      {/* Sectors Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold">
            <Cpu className="h-3.5 w-3.5" />
            <span>Soluzioni Verticali</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Soluzioni AI Modellate sul Tuo Settore
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Niente soluzioni generiche: sviluppiamo automazioni specifiche per i processi e i clienti del tuo mercato.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {sectors.map((sec) => (
            <SectorCard key={sec.slug} {...sec} />
          ))}
        </div>
      </section>

      {/* Method / How it Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 sm:p-12 lg:p-16 backdrop-blur-sm">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Il Nostro Metodo
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Dall&apos;idea al rilascio in 3 semplici passi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-bold text-white">Audit Operativo Gratuito</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Analizziamo i flussi della tua attività, individuiamo i colli di bottiglia e calcoliamo il ROI potenziale delle automazioni AI.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-bold text-white">Sviluppo & Test in 7 Giorni</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configuriamo i tuoi agenti AI personalizzati (WhatsApp, Web, CRM, RAG) e li testiamo su casi d&apos;uso reali del tuo settore.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-bold text-white">Integrazione & Supporto Continuo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Colleghiamo la soluzione ai tuoi gestionali esistenti, formiamo il tuo team e monitoriamo le performance ogni settimana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-700/40 shadow-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nessun impegno • 15 minuti dal vivo</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Pronto a trasformare la tua attività con l&apos;AI?
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Prenota subito una sessione dimostrativa con un nostro consulente AI e scopri quanto tempo e denaro puoi risparmiare ogni mese.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo">
              <Button variant="glow" size="lg" className="gap-2 px-8 py-4 font-bold text-base">
                <span>Prenota la Tua Demo Ora</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
