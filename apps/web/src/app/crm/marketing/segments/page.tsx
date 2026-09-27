'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Target,
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  Ban,
  AlertCircle,
  Filter,
  Save,
  Users,
  Building2,
  Mail,
  Phone,
  Globe,
  Sliders,
  Eye,
  ShieldCheck,
} from 'lucide-react';

const SECTOR_OPTIONS = [
  { value: 'horeca_ristoranti', label: 'Ristoranti & Horeca' },
  { value: 'horeca_hotel', label: 'Hotel & Strutture Ricettive' },
  { value: 'studi_legali', label: 'Studi Legali' },
  { value: 'commercialisti', label: 'Commercialisti & Consulenti' },
  { value: 'ecommerce', label: 'eCommerce & Retail' },
  { value: 'local_services', label: 'Servizi Locali & Imprese' },
];

export default function SegmentBuilderPage() {
  const router = useRouter();

  // Target and Form States
  const [targetType, setTargetType] = useState<'leads' | 'companies'>('leads');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Filters State
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [provinceInput, setProvinceInput] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [minScore, setMinScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');

  // Tech stack filters
  const [selectedCms, setSelectedCms] = useState<string[]>([]);
  const [hasPixelFilter, setHasPixelFilter] = useState<'any' | 'yes' | 'no'>('any');
  const [hasChatbotFilter, setHasChatbotFilter] = useState<'any' | 'yes' | 'no'>('any');
  const [hasWhatsappFilter, setHasWhatsappFilter] = useState<'any' | 'yes' | 'no'>('any');
  const [hasBookingFilter, setHasBookingFilter] = useState<'any' | 'yes' | 'no'>('any');
  const [isEcommerceFilter, setIsEcommerceFilter] = useState<'any' | 'yes' | 'no'>('any');

  // Contact requirements
  const [mustHaveEmail, setMustHaveEmail] = useState(false);
  const [mustHavePhone, setMustHavePhone] = useState(false);
  const [mustHaveDecisionMaker, setMustHaveDecisionMaker] = useState(false);
  const [requireMarketingConsent, setRequireMarketingConsent] = useState(false);

  // Preview & Results State
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewSummary, setPreviewSummary] = useState('');
  const [previewTotalCount, setPreviewTotalCount] = useState<number | null>(null);
  const [previewEligibleCount, setPreviewEligibleCount] = useState<number | null>(null);
  const [previewCandidates, setPreviewCandidates] = useState<any[]>([]);

  // Construct current rules object
  const buildCurrentRules = () => {
    const rules: any = {};
    if (selectedSectors.length > 0) rules.sectors = selectedSectors;
    if (cityInput.trim()) {
      rules.cities = cityInput.split(',').map((c) => c.trim()).filter(Boolean);
    }
    if (provinceInput.trim()) {
      rules.provinces = provinceInput.split(',').map((p) => p.trim()).filter(Boolean);
    }
    if (targetType === 'leads' && selectedStatuses.length > 0) {
      rules.leadStatuses = selectedStatuses;
    }
    if (minScore) rules.minCommercialScore = Number(minScore);
    if (maxScore) rules.maxCommercialScore = Number(maxScore);

    const techStack: any = {};
    if (selectedCms.length > 0) techStack.cms = selectedCms;
    if (hasPixelFilter === 'yes') techStack.hasPixel = true;
    if (hasPixelFilter === 'no') techStack.hasPixel = false;
    if (hasChatbotFilter === 'yes') techStack.hasChatbot = true;
    if (hasChatbotFilter === 'no') techStack.hasChatbot = false;
    if (hasWhatsappFilter === 'yes') techStack.hasWhatsapp = true;
    if (hasWhatsappFilter === 'no') techStack.hasWhatsapp = false;
    if (hasBookingFilter === 'yes') techStack.hasBooking = true;
    if (hasBookingFilter === 'no') techStack.hasBooking = false;
    if (isEcommerceFilter === 'yes') techStack.isEcommerce = true;
    if (isEcommerceFilter === 'no') techStack.isEcommerce = false;

    if (Object.keys(techStack).length > 0) {
      rules.techStack = techStack;
    }

    const contactsReq: any = {};
    if (mustHaveEmail) contactsReq.mustHaveEmail = true;
    if (mustHavePhone) contactsReq.mustHavePhone = true;
    if (mustHaveDecisionMaker) contactsReq.mustHaveDecisionMaker = true;
    if (requireMarketingConsent) contactsReq.requireMarketingConsent = true;

    if (Object.keys(contactsReq).length > 0) {
      rules.contactsRequirement = contactsReq;
    }

    return rules;
  };

  const runPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const rules = buildCurrentRules();
      const res = await fetch('/api/marketing/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          rules,
          limit: 100,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewSummary(data.summary);
        setPreviewTotalCount(data.totalCount);
        setPreviewEligibleCount(data.eligibleCount);
        setPreviewCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Failed to run segment preview:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    runPreview();
  }, [
    targetType,
    selectedSectors,
    cityInput,
    provinceInput,
    selectedStatuses,
    minScore,
    maxScore,
    selectedCms,
    hasPixelFilter,
    hasChatbotFilter,
    hasWhatsappFilter,
    hasBookingFilter,
    isEcommerceFilter,
    mustHaveEmail,
    mustHavePhone,
    mustHaveDecisionMaker,
    requireMarketingConsent,
  ]);

  const handleSaveSegment = async () => {
    if (!name.trim()) {
      alert('Inserisci un nome per il segmento');
      return;
    }

    setIsSaving(true);
    try {
      const rules = buildCurrentRules();
      const res = await fetch('/api/marketing/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          targetType,
          rules,
        }),
      });

      if (res.ok) {
        alert('Segmento salvato con successo!');
        router.push('/crm/marketing');
      } else {
        const err = await res.json();
        alert(err.error || 'Errore durante il salvataggio');
      }
    } catch (err) {
      console.error('Failed to save segment:', err);
      alert('Errore di connessione');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSector = (sec: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const toggleStatus = (st: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const toggleCms = (cms: string) => {
    setSelectedCms((prev) =>
      prev.includes(cms) ? prev.filter((c) => c !== cms) : [...prev, cms]
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/crm/marketing"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Torna al Marketing Hub</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-purple-400" />
            Segment Builder Dinamico
          </h1>
          <p className="text-xs text-slate-400">
            Definisci filtri precisi su anagrafiche, tecnologie web analizzate e requisiti GDPR con spiegazione in linguaggio naturale.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={runPreview}
            isLoading={isPreviewLoading}
            className="gap-1.5 text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Eye className="h-3.5 w-3.5 text-blue-400" />
            <span>Ricalcola Simulazione</span>
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={handleSaveSegment}
            isLoading={isSaving}
            className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Salva Segmento</span>
          </Button>
        </div>
      </div>

      {/* Live Explainability Box */}
      <Card className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border-purple-800/40 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Spiegazione Naturale delle Regole Applicate</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Totale Trovati:</span>
              <span className="font-bold text-white">{previewTotalCount ?? '-'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Eleggibili (Privacy OK):</span>
              <span className="font-bold text-emerald-400">{previewEligibleCount ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-sm text-slate-200 font-mono leading-relaxed">
          {previewSummary || 'Target: Lead | Tutti i settori e canali inclusi'}
        </div>
      </Card>

      {/* Grid: Filters Panel (Left) & Live Preview Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FILTERS PANEL */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Anagrafica Base */}
          <Card className="bg-slate-950 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Sliders className="h-4 w-4 text-purple-400" />
              1. Dati Segmento & Target
            </h2>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300 block">Nome Segmento *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Ristoranti Pompei & Napoli senza Meta Pixel"
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300 block">Descrizione Breve</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Finalità outreach commerciale o follow-up"
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300 block">Entità Target</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('leads')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      targetType === 'leads'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Lead & Prospect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('companies')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      targetType === 'companies'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Aziende Clienti</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Settori & Territorio */}
          <Card className="bg-slate-950 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Filter className="h-4 w-4 text-blue-400" />
              2. Settori & Territorio
            </h2>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-slate-300 block">Settori Merceologici</label>
                <div className="flex flex-wrap gap-1.5">
                  {SECTOR_OPTIONS.map((sec) => {
                    const isSelected = selectedSectors.includes(sec.value);
                    return (
                      <button
                        key={sec.value}
                        type="button"
                        onClick={() => toggleSector(sec.value)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sec.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Città (separate da virgola)</label>
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Es. Pompei, Napoli"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Province (sigle)</label>
                  <input
                    type="text"
                    value={provinceInput}
                    onChange={(e) => setProvinceInput(e.target.value)}
                    placeholder="Es. NA, SA"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status filter if leads */}
              {targetType === 'leads' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <label className="font-medium text-slate-300 block">Stato Lead CRM</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['nuovo', 'arricchito', 'in_contatto', 'qualificato', 'convertito'].map((st) => {
                      const isSelected = selectedStatuses.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleStatus(st)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border capitalize transition-colors ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Score Range */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Score Min (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="Es. 70"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-mono placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Score Max (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="Es. 100"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-mono placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Tech Stack & Opportunità Digitali */}
          <Card className="bg-slate-950 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Globe className="h-4 w-4 text-emerald-400" />
              3. Tech Stack & Gap Tecnologici
            </h2>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-slate-300 block">CMS Utilizzato</label>
                <div className="flex flex-wrap gap-1.5">
                  {['WordPress', 'Shopify', 'PrestaShop', 'Wix', 'Webflow', 'Custom'].map((cms) => {
                    const isSelected = selectedCms.includes(cms);
                    return (
                      <button
                        key={cms}
                        type="button"
                        onClick={() => toggleCms(cms)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cms}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Meta Pixel Ads</label>
                  <select
                    value={hasPixelFilter}
                    onChange={(e: any) => setHasPixelFilter(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="any">Tutti (Indifferente)</option>
                    <option value="yes">Con Pixel (Fa Ads)</option>
                    <option value="no">Senza Pixel (Target Ads)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Chatbot AI Attivo</label>
                  <select
                    value={hasChatbotFilter}
                    onChange={(e: any) => setHasChatbotFilter(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="any">Tutti (Indifferente)</option>
                    <option value="yes">Con Chatbot</option>
                    <option value="no">Senza Chatbot (Target AI)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">WhatsApp Business</label>
                  <select
                    value={hasWhatsappFilter}
                    onChange={(e: any) => setHasWhatsappFilter(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="any">Tutti</option>
                    <option value="yes">Con WhatsApp</option>
                    <option value="no">Senza WhatsApp</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300 block">Sistema Booking Online</label>
                  <select
                    value={hasBookingFilter}
                    onChange={(e: any) => setHasBookingFilter(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="any">Tutti</option>
                    <option value="yes">Con Booking</option>
                    <option value="no">Senza Booking</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 4: Requisiti Contatto & Privacy GDPR */}
          <Card className="bg-slate-950 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              4. Requisiti di Contatto & Consenso Privacy
            </h2>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={mustHaveEmail}
                  onChange={(e) => setMustHaveEmail(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" /> Email di contatto obbligatoria
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={mustHavePhone}
                  onChange={(e) => setMustHavePhone(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" /> Numero di telefono obbligatorio
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={mustHaveDecisionMaker}
                  onChange={(e) => setMustHaveDecisionMaker(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-amber-400" /> Referente / Decision Maker identificato
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white pt-1 border-t border-slate-800/60">
                <input
                  type="checkbox"
                  checked={requireMarketingConsent}
                  onChange={(e) => setRequireMarketingConsent(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Richiedi Consenso Marketing Esplicito (Opt-in)
                </span>
              </label>
            </div>
          </Card>
        </div>

        {/* PREVIEW CANDIDATES TABLE */}
        <div className="lg:col-span-7">
          <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-400" />
                  Anteprima Record Corrispondenti
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizza i record che soddisfano i criteri e la loro eleggibilità al contatto
                </p>
              </div>

              {previewCandidates.length > 0 && (
                <span className="text-xs text-slate-400 font-mono">
                  Mostrati {previewCandidates.length} di {previewTotalCount}
                </span>
              )}
            </div>

            {isPreviewLoading ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                Valutazione candidati in corso...
              </div>
            ) : previewCandidates.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Search className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Nessun record corrisponde ai filtri selezionati</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Prova ad allargare i filtri geografici, i range di score o le condizioni tech.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Nome Anagrafica</th>
                      <th className="py-3 px-3">Settore & Città</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Consenso Privacy</th>
                      <th className="py-3 px-3 text-right">Eleggibilità</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {previewCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {c.email && <span className="truncate max-w-[120px]">{c.email}</span>}
                            {c.phone && <span className="font-mono">{c.phone}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-300 capitalize">{c.sector?.replace(/_/g, ' ')}</div>
                          <div className="text-[10px] text-slate-400">{c.city || 'Città n/d'}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-400">
                          {c.score ?? '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.marketingConsentStatus === 'granted'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : c.marketingConsentStatus === 'revoked'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c.marketingConsentStatus === 'granted'
                              ? 'Concesso'
                              : c.marketingConsentStatus === 'revoked'
                              ? 'Revocato'
                              : 'Pending (Soft)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {c.isEligible ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                              <CheckCircle2 className="h-3 w-3" /> Eleggibile
                            </span>
                          ) : (
                            <span
                              title={c.exclusionReason || 'Non eleggibile'}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-400 bg-rose-950/30 border border-rose-800/30 px-2 py-0.5 rounded max-w-[140px] truncate"
                            >
                              <Ban className="h-3 w-3 shrink-0" />
                              <span className="truncate">{c.exclusionReason}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
