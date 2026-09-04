'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bot, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/crm';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenziali non valide');
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante il login');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl p-6">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">Accedi all&apos;Area Riservata</CardTitle>
        <CardDescription>Inserisci le credenziali del tuo account per gestire lead e pipeline</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email *"
            type="email"
            placeholder="admin@ai-agency.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password *"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full font-semibold"
            isLoading={isLoading}
          >
            <span>Accedi al CRM</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>

        {/* Demo Quick Fills */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">
            Credenziali Demo Rapide
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin@ai-agency.it', 'admin123')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-xs"
            >
              <p className="font-semibold text-blue-400">Admin</p>
              <p className="text-[10px] text-slate-400 truncate">admin@ai-agency.it</p>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('operatore@ai-agency.it', 'operator123')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-xs"
            >
              <p className="font-semibold text-emerald-400">Operatore</p>
              <p className="text-[10px] text-slate-400 truncate">operatore@ai-agency.it</p>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#090d16] relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-blue-600/20 to-purple-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white group-hover:scale-105 transition-transform">
              <Bot className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AI Agency CRM</span>
          </Link>
          <p className="text-xs text-slate-400">
            Piattaforma di gestione operativa e vendite consulenza AI
          </p>
        </div>

        {/* Login Form wrapped with Suspense */}
        <Suspense fallback={
          <div className="p-8 text-center text-slate-400">
            Caricamento schermata di accesso...
          </div>
        }>
          <LoginForm />
        </Suspense>

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            &larr; Torna al sito pubblico
          </Link>
        </div>
      </div>
    </div>
  );
}
