import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicVetrinaBundle } from '@/lib/local-growth-service';
import PublicVetrinaInteractiveWidget from '@/components/vetrina/PublicVetrinaInteractiveWidget';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  CheckCircle2,
  Sparkles,
  FileText,
  ArrowRight,
  Tag,
  HelpCircle,
  ShieldCheck,
  Search,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getPublicVetrinaBundle(slug);
  if (!bundle) {
    return {
      title: 'Attività Locale Non Trovata',
    };
  }

  return {
    title: `${bundle.website.heroTitle} | ${bundle.company.name}`,
    description: bundle.website.heroSubtitle,
    keywords: bundle.website.targetKeywords.join(', '),
    openGraph: {
      title: bundle.website.heroTitle,
      description: bundle.website.heroSubtitle,
      type: 'website',
    },
  };
}

export default async function PublicLocalBusinessVetrinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await getPublicVetrinaBundle(slug);
  if (!bundle) {
    notFound();
  }

  const {
    company,
    publicSlug,
    website,
    whatsappAgent,
    articles,
    reviews,
    gbpOffers,
    stats,
  } = bundle;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Schema.org LocalBusiness / Restaurant / ProfessionalService JSON-LD */}
      {website.schemaMarkupJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: website.schemaMarkupJson }}
        />
      )}

      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 flex items-center justify-center font-extrabold text-white text-sm shadow">
              {company.name.charAt(0)}
            </div>
            <div>
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight block">
                {company.name}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {company.city} • Assistenza & Prenotazioni 24/7
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#servizi" className="hover:text-white transition-colors">
              Servizi & Prezzi
            </a>
            {gbpOffers.length > 0 && (
              <a href="#offerte" className="hover:text-white transition-colors">
                Offerte
              </a>
            )}
            <a href="#recensioni" className="hover:text-white transition-colors">
              Recensioni ({stats.avgRating} ★)
            </a>
            <a href="#orari-contatti" className="hover:text-white transition-colors">
              Orari, Sede & FAQ
            </a>
            {articles.length > 0 && (
              <a href="#blog" className="hover:text-white transition-colors">
                Blog & Guide ({articles.length})
              </a>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span>Chiama</span>
              </a>
            )}
            <a
              href="#prenota"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Prenota Ora</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Punto di Riferimento a {company.city}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Valutazione {stats.avgRating}/5.0 su Google
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Risposta WhatsApp AI 24/7
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {website.heroTitle}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {website.heroSubtitle}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="#prenota"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>{website.primaryCtaText}</span>
            </a>
            <a
              href="#servizi"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>Scopri Servizi e Prezzi</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Quick Info Strip */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <Clock className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Orari di Apertura</div>
                <div className="text-xs text-slate-400 mt-0.5">{whatsappAgent.businessHours}</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <MapPin className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Dove Trovarci a {company.city}</div>
                <div className="text-xs text-slate-400 mt-0.5">{whatsappAgent.addressInfo}</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <Phone className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Contatto Diretto & WhatsApp</div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">{company.phone}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES & PRICING SHOWCASE SECTION */}
      <section id="servizi" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Le Nostre Proposte a {company.city}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Servizi Principali & Listino Trasparente
          </h2>
          <p className="text-sm text-slate-400">
            Soluzioni chiare, cura artigianale e prenotazione prioritaria per tutti i nostri clienti di {company.city}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {website.servicesShowcase.map((srv, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-lg"
            >
              <div className="space-y-3">
                {srv.badge && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {srv.badge}
                  </span>
                )}
                <h3 className="text-lg font-extrabold text-white">{srv.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{srv.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Tariffa / Formula:</span>
                  <span className="text-sm font-extrabold text-emerald-400">{srv.priceLabel}</span>
                </div>
                <a
                  href="#prenota"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Richiedi o Prenota Ora</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {whatsappAgent.pricingMenuInfo && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Dettaglio Listino & Condizioni ({company.name})
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {whatsappAgent.pricingMenuInfo}
              </p>
            </div>
            <a
              href="#prenota"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap text-center"
            >
              Chiedi Preventivo in Chat
            </a>
          </div>
        )}
      </section>

      {/* ACTIVE GOOGLE MAPS OFFERS / POSTS (IF ANY) */}
      {gbpOffers.length > 0 && (
        <section id="offerte" className="py-12 bg-slate-900/40 border-t border-b border-slate-800/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Promozioni & Novità da Google Maps
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-1">
                  Offerte ed Eventi Attivi a {company.city}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {gbpOffers.map((off) => (
                <div
                  key={off.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                      {off.postType}
                    </span>
                    <h3 className="text-base font-bold text-white">{off.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{off.summary}</p>
                  </div>
                  {off.couponCode && (
                    <div className="p-2 rounded-xl bg-slate-950 border border-dashed border-amber-500/50 text-center text-xs text-amber-300 font-mono">
                      Codice Promo: <strong>{off.couponCode}</strong>
                    </div>
                  )}
                  <a
                    href="#prenota"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-1"
                  >
                    <span>Approfitta dell&apos;offerta →</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LIVE INTERACTIVE BOOKING & WHATSAPP AI 24/7 CONCIERGE */}
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

      {/* VERIFIED CUSTOMER REVIEWS SECTION */}
      <section id="recensioni" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Cosa Dicono i Clienti di {company.city}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Recensioni Verificate su Google Maps ({stats.avgRating} ★)
            </h2>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <span className="text-xs font-bold text-white">
              Media {stats.avgRating}/5.0
            </span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Marco Bellini',
                text: `Servizio impeccabile da ${company.name} a ${company.city}. Puntualità, cortesia e qualità davvero superiore alle aspettative!`,
              },
              {
                name: 'Elena Russo',
                text: `Comodissima la prenotazione immediata su WhatsApp 24/7 e accoglienza straordinaria in sede. Consigliatissimo a tutti!`,
              },
              {
                name: 'Giuseppe Ferrara',
                text: `Professionisti seri e trasparenti sui prezzi. Punto di riferimento assoluto a ${company.city}.`,
              },
            ].map((sample, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{sample.name}</span>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">&ldquo;{sample.text}&rdquo;</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.slice(0, 6).map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{rev.reviewerName}</span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-800 text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                </div>

                {rev.replyText && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Risposta di {company.name}:
                    </div>
                    <p className="line-clamp-3">{rev.replyText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAQ & PRACTICAL INFO SECTION */}
      <section id="orari-contatti" className="py-14 bg-slate-900/50 border-t border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
              <HelpCircle className="h-4 w-4" /> Domande Frequenti & Informazioni Utili
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Tutto Quello che Devi Sapere su {company.name} ({company.city})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {whatsappAgent.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <h3 className="text-sm font-bold text-white flex items-start gap-2">
                  <span className="text-emerald-400 font-extrabold">D.</span>
                  <span>{faq.question}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed pl-5">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GEOLOCALIZED SEO BLOG ARTICLES SECTION */}
      <section id="blog" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Magazine & Approfondimenti Locali
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Il Blog di {company.name} a {company.city}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Guide pratiche, consigli degli esperti e novità dedicate ai clienti di {company.city}.
            </p>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            Nuovi articoli e guide su {company.city} saranno disponibili a breve.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((art) => (
              <Link
                key={art.id}
                href={`/vetrina/${encodeURIComponent(publicSlug)}/blog/${encodeURIComponent(art.slug)}`}
                className="group bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-4 transition-all shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
                      📍 {art.targetCity} • {art.targetKeyword}
                    </span>
                    <span className="text-slate-400">{art.readingTimeMinutes} min lettura</span>
                  </div>

                  <h3 className="text-lg font-extrabold text-white group-hover:text-purple-300 transition-colors">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
                  <span>Leggi l&apos;articolo completo</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* LOCAL SEO FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="text-base font-extrabold text-white">{company.name}</div>
              <div className="text-xs text-slate-400">
                {whatsappAgent.addressInfo} • {company.city} • Tel: {company.phone}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                href="/vetrina"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Directory Vetrine Locali
              </Link>
              <span className="text-slate-700">•</span>
              <Link
                href="/crm/local-growth"
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                Gestisci nel CRM →
              </Link>
            </div>
          </div>

          {website.targetKeywords.length > 0 && (
            <div className="pt-6 border-t border-slate-900 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
                <Search className="h-3 w-3" /> Ricerche Locali Correlate a {company.city}:
              </span>
              {website.targetKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
