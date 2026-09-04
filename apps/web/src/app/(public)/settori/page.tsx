import React from 'react';
import { SectorCard } from '@/components/public/SectorCard';
import { UtensilsCrossed, Briefcase, ShoppingBag, Building2, Cpu } from 'lucide-react';

export default function SectorsIndexPage() {
  const sectors = [
    {
      slug: 'ristoranti-horeca',
      title: 'Ristoranti, Bar & HORECA',
      category: 'Food & Beverage',
      description: 'Gestisci le prenotazioni dei tavoli h24 su WhatsApp, rispondi alle richieste di menù/allergeni ed elimina i no-show.',
      solutions: [
        'Assistente WhatsApp per prenotazioni tavoli h24',
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold">
          <Cpu className="h-3.5 w-3.5" />
          <span>Settori Verticali</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Soluzioni AI Verticali per Imprese Italiane
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Seleziona il tuo settore di riferimento per scoprire i problemi tipici che risolviamo, le architetture AI applicate e i risultati concreti.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {sectors.map((sec) => (
          <SectorCard key={sec.slug} {...sec} />
        ))}
      </div>
    </div>
  );
}
