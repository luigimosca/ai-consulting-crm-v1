'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';

function DemoForm() {
  const searchParams = useSearchParams();
  const initialSector = searchParams.get('sector') || 'horeca_ristoranti';

  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    sector: initialSector,
    companySize: '1-5 dipendenti',
    preferredDate: 'Questa settimana',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.contactName || !formData.contactEmail) {
      setErrorMsg('Inserisci almeno Nome ed Email per continuare.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la prenotazione');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante l invio della richiesta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900/90 border-slate-800 p-6 md:col-span-2 shadow-xl">
      {isSuccess ? (
        <div className="text-center py-10 space-y-4 animate-in fade-in-0">
          <div className="h-16 w-16 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Richiesta Ricevuta!</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Grazie <strong className="text-white">{formData.contactName}</strong>. Abbiamo registrato la tua richiesta nel nostro CRM. Ti contatteremo a breve all&apos;indirizzo <strong className="text-blue-400">{formData.contactEmail}</strong> per fissare data e ora.
          </p>
          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsSuccess(false)}
            >
              Invia un&apos;altra richiesta
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome Referente o Azienda *"
              placeholder="Es. Marco Rossi o Studio Legale Lex"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              required
            />

            <Input
              label="Email Aziendale *"
              type="email"
              placeholder="nome@azienda.it"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Telefono o WhatsApp"
              placeholder="+39 340 1234567"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />

            <Select
              label="Settore di Riferimento"
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              options={[
                { label: 'Ristoranti & HORECA', value: 'horeca_ristoranti' },
                { label: 'Studi Legali', value: 'studi_legali' },
                { label: 'Commercialisti & Fiscale', value: 'commercialisti' },
                { label: 'Hotel & Strutture Turistiche', value: 'horeca_hotel' },
                { label: 'E-commerce & Retail Digitale', value: 'ecommerce' },
                { label: 'Altre Attività Locali', value: 'local_services' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Dimensione del Team"
              value={formData.companySize}
              onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
              options={[
                { label: '1 - 3 persone', value: '1-3 dipendenti' },
                { label: '4 - 10 persone', value: '4-10 dipendenti' },
                { label: '11 - 25 persone', value: '11-25 dipendenti' },
                { label: '25+ persone', value: '25+ dipendenti' },
              ]}
            />

            <Select
              label="Disponibilità Preferita"
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              options={[
                { label: 'Il prima possibile', value: 'Prima possibile' },
                { label: 'Questa settimana (Mattina)', value: 'Questa settimana mattina' },
                { label: 'Questa settimana (Pomeriggio)', value: 'Questa settimana pomeriggio' },
                { label: 'Prossima settimana', value: 'Prossima settimana' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Qual è la principale esigenza o sfida operativa? (Opzionale)
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Es. Vorremmo automatizzare le prenotazioni WhatsApp ed eliminare le telefonate durante il servizio..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
          )}

          <Button
            type="submit"
            variant="glow"
            size="lg"
            className="w-full gap-2 font-bold text-base"
            isLoading={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            <span>Conferma Prenotazione Demo</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function DemoBookingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold">
          <Calendar className="h-3.5 w-3.5" />
          <span>Sessione Live 1-to-1</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Prenota la Tua Demo Personalizzata di 15 Minuti
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Un nostro esperto AI analizzerà la tua attività e ti mostrerà dal vivo gli agenti AI e i flussi di lavoro adatti al tuo caso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Value Points Sidebar */}
        <div className="space-y-4 md:col-span-1">
          <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              Cosa include la Demo:
            </h3>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Dimostrazione dal vivo del bot WhatsApp e agenti documentali.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Calcolo stima ore risparmiate e ROI per il tuo team.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Roadmap di integrazione in 7 giorni senza interrompere il lavoro.</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>Durata: 15 minuti su Google Meet</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Nessun vincolo di acquisto</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Form with Suspense Boundary */}
        <Suspense fallback={
          <div className="p-8 text-center text-slate-400 md:col-span-2">
            Caricamento modulo demo...
          </div>
        }>
          <DemoForm />
        </Suspense>
      </div>
    </div>
  );
}
