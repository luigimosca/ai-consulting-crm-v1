import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Clock, TrendingUp } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background glow ambient effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 blur-[100px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 text-blue-300 text-xs font-semibold backdrop-blur-sm shadow-sm animate-in fade-in-0 duration-700">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Consulenza & Agenti AI per Imprese e Professionisti</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          Automatizza i processi e moltiplica i clienti con l&apos;
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Intelligenza Artificiale
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
          Creiamo assistenti WhatsApp h24, segreterie virtuali intelligenti, agenti per l&apos;analisi di documenti legali/fiscali e sistemi di booking automatici su misura per il tuo settore.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/demo" className="w-full sm:w-auto">
            <Button variant="glow" size="lg" className="w-full gap-2 text-base px-8 py-4">
              <Sparkles className="h-4 w-4" />
              <span>Prenota Demo Gratuita</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/settori" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full text-base px-8 py-4">
              <span>Esplora i Settori</span>
            </Button>
          </Link>
        </div>

        {/* Key Metrics / Value Grid */}
        <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Conversioni</span>
            </div>
            <p className="text-xl font-bold text-white">+35%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Risposte h24 su WhatsApp & Web</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">No-Show</span>
            </div>
            <p className="text-xl font-bold text-white">-80%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Promemoria automatici intelligenti</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Tempo Risparmiato</span>
            </div>
            <p className="text-xl font-bold text-white">15+ ore</p>
            <p className="text-[11px] text-slate-400 mt-0.5">A settimana su compiti ripetitivi</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Deployment</span>
            </div>
            <p className="text-xl font-bold text-white">7 Giorni</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pronto e integrato nel tuo sistema</p>
          </div>
        </div>
      </div>
    </section>
  );
}
