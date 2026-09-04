import React from 'react';
import Link from 'next/link';
import { Bot, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
              AI Agency <span className="text-blue-500 text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">IT</span>
            </span>
          </div>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/settori" className="hover:text-blue-400 transition-colors">
            Settori & Soluzioni
          </Link>
          <Link href="/settori/ristoranti-horeca" className="hover:text-blue-400 transition-colors">
            Ristoranti & HORECA
          </Link>
          <Link href="/settori/studi-legali-commercialisti" className="hover:text-blue-400 transition-colors">
            Studi Professionali
          </Link>
          <Link href="/settori/ecommerce" className="hover:text-blue-400 transition-colors">
            E-commerce
          </Link>
          <Link href="/settori/strutture-turistiche" className="hover:text-blue-400 transition-colors">
            Turismo
          </Link>
        </nav>

        {/* CTA & Login */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Area CRM</span>
            </Button>
          </Link>
          
          <Link href="/demo">
            <Button variant="glow" size="sm" className="gap-1.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Prenota Demo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
