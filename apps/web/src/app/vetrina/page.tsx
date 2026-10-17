import React from 'react';
import Link from 'next/link';
import { listPublicVetrinaDirectory } from '@/lib/local-growth-service';
import {
  Globe,
  MapPin,
  Star,
  FileText,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Directory Siti Vetrina & Blog SEO Locali | Local Growth Hub',
  description:
    'Esplora i siti vetrina geolocalizzati, i blog SEO locali e gli assistenti WhatsApp 24/7 delle attività locali.',
};

export default async function PublicVetrinaDirectoryPage() {
  const websites = await listPublicVetrinaDirectory();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-tight block">
                Local Growth Showcase Network
              </span>
              <span className="text-[11px] text-slate-400 block">
                Siti Vetrina SEO, Blog Locali & Concierge WhatsApp AI 24/7
              </span>
            </div>
          </div>

          <Link
            href="/crm/local-growth"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            Torna al Pannello CRM →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Portale Siti Vetrina & Blog Locali Attivi
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Le Attività Locali Online con Sito Vetrina & AI 24/7
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ogni sito vetrina include dati strutturati <code className="text-indigo-300">Schema.org JSON-LD</code> per Google Maps, Blog SEO geolocalizzato e Assistente WhatsApp AI 24/7 collegato in tempo reale al calendario appuntamenti.
          </p>
        </div>

        {websites.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-4 max-w-xl mx-auto">
            <Globe className="h-10 w-10 text-indigo-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Nessun Sito Vetrina ancora pubblicato</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vai nella sezione <strong>Crescita Locale & Social AI → Tab 4 (Sito Vetrina & Blog SEO)</strong> del CRM e clicca su &ldquo;Genera Sito Vetrina & Schema SEO&rdquo; per pubblicare istantaneamente il primo sito locale.
            </p>
            <Link
              href="/crm/local-growth"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              <span>Apri Configuratore nel CRM</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((w) => (
              <div
                key={w.websiteId}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {w.city}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> SEO {w.seoHealthScore}/100
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {w.companyName}
                    </div>
                    <h2 className="text-lg font-extrabold text-white mt-0.5 line-clamp-2">
                      {w.heroTitle}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {w.heroSubtitle}
                  </p>
                </div>

                <div className="space-y-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-400" /> {w.avgRating} ({w.reviewsCount} recensioni)
                    </span>
                    <span className="flex items-center gap-1 text-purple-300 font-medium">
                      <FileText className="h-3.5 w-3.5" /> {w.articlesCount} articoli blog
                    </span>
                  </div>

                  <Link
                    href={w.publicUrl}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <span>Visita Sito Vetrina Live</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
