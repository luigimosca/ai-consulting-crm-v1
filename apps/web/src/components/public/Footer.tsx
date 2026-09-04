import React from 'react';
import Link from 'next/link';
import { Bot, Mail, MapPin, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-white">AI Agency Italia</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consulenza strategica e sviluppo di soluzioni AI verticali per imprese, studi professionali e ristorazione.
            </p>
          </div>

          {/* Vertical Sectors */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Settori Verticali
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/settori/ristoranti-horeca" className="hover:text-blue-400 transition-colors">
                  Ristoranti & HORECA
                </Link>
              </li>
              <li>
                <Link href="/settori/studi-legali-commercialisti" className="hover:text-blue-400 transition-colors">
                  Studi Legali & Commercialisti
                </Link>
              </li>
              <li>
                <Link href="/settori/ecommerce" className="hover:text-blue-400 transition-colors">
                  E-commerce & Retail Digitale
                </Link>
              </li>
              <li>
                <Link href="/settori/strutture-turistiche" className="hover:text-blue-400 transition-colors">
                  Hotel, B&B & Strutture Turistiche
                </Link>
              </li>
            </ul>
          </div>

          {/* Soluzioni */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Soluzioni AI
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="h-3 w-3 text-blue-400" />
                <span>Chatbot & Assistenti WhatsApp</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>Agenti RAG & Gestione Documenti</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span>Automazione Booking & No-Show</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span>Lead Generation B2B Arricchita</span>
              </li>
            </ul>
          </div>

          {/* Contatti */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Contatti & Sede
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                <span>Milano & Roma, Italia</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                <span>info@ai-agency.it</span>
              </li>
              <li className="pt-2">
                <Link 
                  href="/login"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
                >
                  Accesso Riservato Operatori CRM &rarr;
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-900 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} AI Agency Consulting S.r.l. - Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
}
