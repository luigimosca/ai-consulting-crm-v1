import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicVetrinaArticle } from '@/lib/local-growth-service';
import PublicVetrinaInteractiveWidget from '@/components/vetrina/PublicVetrinaInteractiveWidget';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  FileText,
  Sparkles,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; articleSlug: string }>;
}): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const data = await getPublicVetrinaArticle(slug, articleSlug);
  if (!data) {
    return {
      title: 'Articolo Non Trovato',
    };
  }

  return {
    title: data.article.metaTitle || `${data.article.title} | ${data.bundle.company.name}`,
    description: data.article.metaDescription || data.article.excerpt,
    keywords: `${data.article.targetKeyword}, ${data.article.targetCity}, ${data.bundle.company.name}`,
    openGraph: {
      title: data.article.metaTitle,
      description: data.article.metaDescription,
      type: 'article',
    },
  };
}

export default async function PublicLocalBlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string; articleSlug: string }>;
}) {
  const { slug, articleSlug } = await params;
  const data = await getPublicVetrinaArticle(slug, articleSlug);
  if (!data) {
    notFound();
  }

  const { bundle, article, relatedArticles } = data;
  const { company, publicSlug, website, whatsappAgent } = bundle;

  const articleSchemaJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.metaDescription,
    keywords: article.targetKeyword,
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Organization',
      name: company.name,
    },
    publisher: {
      '@type': 'LocalBusiness',
      name: company.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: company.city,
        addressCountry: 'IT',
      },
      telephone: company.phone,
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleSchemaJson }}
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href={`/vetrina/${encodeURIComponent(publicSlug)}`}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-indigo-400" />
            <span>Torna alla Vetrina di {company.name}</span>
          </Link>

          <a
            href="#prenota"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Prenota o Chiedi in Chat</span>
          </a>
        </div>
      </header>

      {/* Article Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Breadcrumbs & Meta Badges */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={`/vetrina/${encodeURIComponent(publicSlug)}`}
              className="text-indigo-400 hover:underline font-semibold"
            >
              {company.name} ({company.city})
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Blog & Guide Locali</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Guida Locale {article.targetCity}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Keyword: {article.targetKeyword}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> {article.readingTimeMinutes} min di lettura
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            {article.title}
          </h1>

          <p className="text-base text-slate-300 leading-relaxed border-l-4 border-indigo-500 pl-4 py-1 bg-slate-900/40 rounded-r-xl">
            {article.excerpt}
          </p>
        </div>

        {/* Rendered HTML Content */}
        <div
          className="prose prose-invert prose-slate max-w-none bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 text-slate-200 leading-relaxed space-y-4 shadow-xl"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* Callout Box inside Article */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/60 border border-indigo-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Hai bisogno di {company.name} a {company.city}?
            </div>
            <h3 className="text-lg font-extrabold text-white">
              Prenota subito o fai una domanda al nostro Assistente WhatsApp 24/7
            </h3>
            <p className="text-xs text-slate-300">
              Siamo in {whatsappAgent.addressInfo} • Orari: {whatsappAgent.businessHours}
            </p>
          </div>
          <a
            href="#prenota"
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap shadow-lg"
          >
            Vai alla Prenotazione Rapida ↓
          </a>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              <span>Altri Articoli Consigliati su {company.city}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/vetrina/${encodeURIComponent(publicSlug)}/blog/${encodeURIComponent(rel.slug)}`}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">
                      {rel.targetKeyword}
                    </span>
                    <h3 className="text-sm font-bold text-white line-clamp-2">{rel.title}</h3>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                    <span>Leggi</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Embedded Booking & WhatsApp AI 24/7 Widget */}
      <PublicVetrinaInteractiveWidget
        slug={publicSlug}
        companyName={company.name}
        city={company.city}
        agentName={whatsappAgent.agentName}
        whatsappPhone={whatsappAgent.whatsappPhone}
        welcomeMessage={whatsappAgent.welcomeMessage}
        businessHours={whatsappAgent.businessHours}
        addressInfo={whatsappAgent.addressInfo}
        services={website.servicesShowcase}
        primaryCtaText={website.primaryCtaText}
      />
    </div>
  );
}
