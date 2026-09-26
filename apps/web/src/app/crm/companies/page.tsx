'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FolderKanban,
  FileText,
  Eye,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Database,
  Compass,
  FileCheck,
  HelpCircle,
  RefreshCw,
  Info,
} from 'lucide-react';

const SECTOR_OPTIONS = [
  { value: 'all', label: 'Tutti i settori' },
  { value: 'horeca_ristoranti', label: 'Ristoranti & Horeca' },
  { value: 'horeca_hotel', label: 'Hotel & Strutture Ricettive' },
  { value: 'studi_legali', label: 'Studi Legali' },
  { value: 'commercialisti', label: 'Commercialisti & Consulenti' },
  { value: 'ecommerce', label: 'eCommerce & Retail' },
  { value: 'local_services', label: 'Servizi Locali & Imprese' },
];

export default function CompaniesListPage() {
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');

  // Modal State
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'search' | 'manual'>('search');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Public Search State
  const [searchForm, setSearchForm] = useState({
    name: '',
    city: '',
    province: '',
    vatId: '',
    website: '',
  });
  const [isSearchingPublic, setIsSearchingPublic] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [nameVariants, setNameVariants] = useState<string[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual / Review Form State
  const [companyForm, setCompanyForm] = useState({
    name: '',
    legalName: '',
    vatId: '',
    fiscalCode: '',
    rea: '',
    sector: 'horeca_ristoranti',
    ateco: '',
    legalAddress: '',
    operatingAddress: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    pec: '',
    website: '',
    estimatedRevenue: '',
    employeeCount: '',
    notes: '',
    source: 'inserimento_manuale',
    sourceUrl: '',
    providerPlaceId: '',
    confidence: 'medium',
    rawSourceData: null as any,
    fieldSources: {} as Record<string, { source: string; confidence: string; status: string; note?: string }>,
  });

  const [formDuplicateWarning, setFormDuplicateWarning] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      let url = `/api/companies?t=${Date.now()}`;
      if (sectorFilter !== 'all') url += `&sector=${sectorFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompaniesList(data.companies || []);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [sectorFilter]);

  // Live duplicate check on manual form
  useEffect(() => {
    if (!companyForm.name && !companyForm.vatId) {
      setFormDuplicateWarning(null);
      return;
    }

    const cleanVat = companyForm.vatId?.trim();
    const cleanName = companyForm.name?.trim().toLowerCase();
    const cleanCity = companyForm.city?.trim().toLowerCase();

    for (const c of companiesList) {
      if (cleanVat && c.vatId && c.vatId.trim() === cleanVat) {
        setFormDuplicateWarning(`Attenzione: Partita IVA ${cleanVat} già presente in "${c.name}"`);
        return;
      }
      if (cleanName && cleanCity && c.city && c.name.toLowerCase() === cleanName && c.city.toLowerCase() === cleanCity) {
        setFormDuplicateWarning(`Attenzione: Azienda con stesso nome e comune già presente in anagrafica ("${c.name}", ${c.city})`);
        return;
      }
    }
    setFormDuplicateWarning(null);
  }, [companyForm.vatId, companyForm.name, companyForm.city, companiesList]);

  // Handle Public Search
  const handlePublicSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchForm.name.trim() && !searchForm.vatId.trim() && !searchForm.website.trim()) {
      return;
    }

    setIsSearchingPublic(true);
    setSearchError(null);
    setSearchPerformed(true);

    try {
      const params = new URLSearchParams();
      if (searchForm.name) params.set('q', searchForm.name.trim());
      if (searchForm.city) params.set('city', searchForm.city.trim());
      if (searchForm.province) params.set('province', searchForm.province.trim());
      if (searchForm.vatId) params.set('vatId', searchForm.vatId.trim());
      if (searchForm.website) params.set('domain', searchForm.website.trim());

      const res = await fetch(`/api/companies/public-search?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setSearchResults(data.candidates || []);
        setNameVariants(data.nameVariants || []);
      } else {
        setSearchError(data.error || 'Errore durante la ricerca dati pubblici');
        setSearchResults([]);
      }
    } catch (err: any) {
      setSearchError('Impossibile contattare il servizio di ricerca pubblica.');
      setSearchResults([]);
    } finally {
      setIsSearchingPublic(false);
    }
  };

  // Transfer candidate data to Tab 2
  const handleUseCandidateData = (candidate: any) => {
    setCompanyForm({
      name: candidate.name || '',
      legalName: candidate.legalName || '',
      vatId: candidate.vatId || '',
      fiscalCode: candidate.fiscalCode || '',
      rea: candidate.rea || '',
      sector: candidate.sector && SECTOR_OPTIONS.some((s) => s.value === candidate.sector) ? candidate.sector : 'horeca_ristoranti',
      ateco: candidate.ateco || '',
      legalAddress: candidate.legalAddress || '',
      operatingAddress: candidate.operatingAddress || '',
      city: candidate.city || searchForm.city || '',
      province: candidate.province || searchForm.province || '',
      phone: candidate.phone || '',
      email: candidate.email || '',
      pec: candidate.pec || '',
      website: candidate.website || '',
      estimatedRevenue: '',
      employeeCount: '',
      notes: candidate.rawTags ? `Importata da ${candidate.source}. ${candidate.providerPlaceId ? `ID: ${candidate.providerPlaceId}` : ''}` : '',
      source: candidate.source || 'openstreetmap',
      sourceUrl: candidate.sourceUrl || '',
      providerPlaceId: candidate.providerPlaceId || '',
      confidence: candidate.confidence || 'high',
      rawSourceData: candidate.rawTags || null,
      fieldSources: candidate.fieldSources || {},
    });

    setModalTab('manual');
  };

  // Create Company (Final Save)
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });

      if (res.ok) {
        setIsNewCompanyModalOpen(false);
        resetModalState();
        fetchCompanies();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Errore nella creazione dell\'azienda');
      }
    } catch (err) {
      console.error('Error saving company:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModalState = () => {
    setModalTab('search');
    setSearchForm({ name: '', city: '', province: '', vatId: '', website: '' });
    setSearchResults([]);
    setNameVariants([]);
    setSearchPerformed(false);
    setSearchError(null);
    setCompanyForm({
      name: '',
      legalName: '',
      vatId: '',
      fiscalCode: '',
      rea: '',
      sector: 'horeca_ristoranti',
      ateco: '',
      legalAddress: '',
      operatingAddress: '',
      city: '',
      province: '',
      phone: '',
      email: '',
      pec: '',
      website: '',
      estimatedRevenue: '',
      employeeCount: '',
      notes: '',
      source: 'inserimento_manuale',
      sourceUrl: '',
      providerPlaceId: '',
      confidence: 'medium',
      rawSourceData: null,
      fieldSources: {},
    });
  };

  const formatSectorLabel = (sector: string) => {
    const found = SECTOR_OPTIONS.find((s) => s.value === sector);
    return found ? found.label : sector;
  };

  const renderFieldBadge = (fieldName: string) => {
    const info = companyForm.fieldSources?.[fieldName];
    if (!info) {
      if (companyForm.source === 'inserimento_manuale') {
        return (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            Inserito manualmente
          </span>
        );
      }
      return null;
    }

    if (info.source === 'openstreetmap') {
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Da OSM
        </span>
      );
    }
    if (info.source === 'sito_ufficiale') {
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
          Da sito ufficiale
        </span>
      );
    }
    if (info.source === 'crm_locale' || info.source === 'crm_lead') {
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
          Da CRM Locale
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Da verificare
      </span>
    );
  };

  const totalProjectsAcrossCompanies = companiesList.reduce((acc, c) => acc + (c.projectsCount || 0), 0);
  const totalOrdersAcrossCompanies = companiesList.reduce((acc, c) => acc + (c.ordersCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Anagrafica Aziende & Clienti</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {companiesList.length} Aziende
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestione centralizzata dell&apos;anagrafica clienti con ricerca dati pubblici (OpenStreetMap, siti ufficiali, INI-PEC) e inserimento manuale.
          </p>
        </div>

        <Button
          onClick={() => {
            resetModalState();
            setIsNewCompanyModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Aggiungi Nuova Azienda</span>
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-950 border-slate-800 p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Aziende in Anagrafica</div>
            <div className="text-xl font-bold text-white mt-0.5">{companiesList.length}</div>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Commesse Attive/Generate</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalOrdersAcrossCompanies}</div>
          </div>
        </Card>

        <Card className="bg-slate-950 border-slate-800 p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Progetti Operativi Collegati</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalProjectsAcrossCompanies}</div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per ragione sociale, P.IVA, città o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCompanies()}
            className="pl-9 bg-slate-900/80 border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-full md:w-60"
          >
            {SECTOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Button variant="outline" size="sm" onClick={fetchCompanies} className="shrink-0">
            Filtra
          </Button>
        </div>
      </div>

      {/* Companies Table */}
      <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ragione Sociale & Settore</th>
                <th className="py-3.5 px-4">Dati Fiscali & Sede</th>
                <th className="py-3.5 px-4">Contatti & Canali</th>
                <th className="py-3.5 px-4">Commesse</th>
                <th className="py-3.5 px-4">Progetti</th>
                <th className="py-3.5 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Caricamento anagrafica aziende in corso...
                  </td>
                </tr>
              ) : companiesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Building2 className="h-10 w-10 text-slate-600 mx-auto" />
                      <div className="font-semibold text-slate-300">Nessuna azienda registrata</div>
                      <p className="text-xs text-slate-500">
                        Puoi cercare i dati pubblici con precompilazione automatica o inserire l&apos;azienda manualmente.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetModalState();
                          setIsNewCompanyModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Aggiungi Nuova Azienda
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                companiesList.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{company.name}</span>
                      </div>
                      {company.legalName && company.legalName !== company.name && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          Rag. Soc.: <span className="text-slate-300">{company.legalName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-slate-900 text-slate-400 border-slate-800">
                          {formatSectorLabel(company.sector)}
                        </Badge>
                        {company.source && (
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                            {company.source.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {company.vatId ? (
                        <div className="font-mono text-slate-200">P.IVA: {company.vatId}</div>
                      ) : (
                        <div className="text-slate-500 italic">P.IVA non specificata</div>
                      )}
                      {company.fiscalCode && company.fiscalCode !== company.vatId && (
                        <div className="font-mono text-slate-400 text-[11px]">CF: {company.fiscalCode}</div>
                      )}
                      {(company.city || company.operatingAddress || company.legalAddress || company.address) && (
                        <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                          <span className="truncate max-w-[220px]">
                            {[company.operatingAddress || company.legalAddress || company.address, company.city].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs space-y-1">
                      {company.website && (
                        <a
                          href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{company.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                        </a>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <Mail className="h-3 w-3 shrink-0 text-slate-500" />
                          <span>{company.email}</span>
                        </div>
                      )}
                      {company.pec && (
                        <div className="flex items-center gap-1 text-amber-300/80 text-[11px]">
                          <ShieldCheck className="h-3 w-3 shrink-0 text-amber-400" />
                          <span>PEC: {company.pec}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-1 text-slate-400 font-mono">
                          <Phone className="h-3 w-3 shrink-0 text-slate-500" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                        <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{company.ordersCount} Commesse</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                        <span>{company.projectsCount} Progetti</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/crm/companies/${company.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Scheda Azienda</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL: AGGIUNGI NUOVA AZIENDA CON TAB RICERCA PUBBLICA & MANUALE */}
      <Dialog
        isOpen={isNewCompanyModalOpen}
        onClose={() => setIsNewCompanyModalOpen(false)}
        title="Aggiungi Nuova Azienda in Anagrafica"
        description="Cerca dati da fonti pubbliche verificate (OpenStreetMap, sito web, registri) oppure inserisci l'azienda manualmente."
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Tabs Switcher */}
          <div className="flex border-b border-slate-800 pb-2 gap-2">
            <button
              type="button"
              onClick={() => setModalTab('search')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                modalTab === 'search'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>1. Cerca dati pubblici</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('manual')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                modalTab === 'manual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>2. Inserimento / Revisione manuale</span>
              {Object.keys(companyForm.fieldSources).length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-500/30 text-blue-200 text-[10px] rounded-full">
                  Precompilato
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: CERCA DATI PUBBLICI */}
          {modalTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handlePublicSearch} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    Motore di Ricerca Pubblica & Territoriale
                  </span>
                  <span className="text-[11px] text-slate-500">OpenStreetMap, Web Ufficiale, INI-PEC</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Nome Azienda o Attività *"
                      placeholder="Es. Jamm Ja, Pasticceria De Vivo..."
                      value={searchForm.name}
                      onChange={(e) => setSearchForm({ ...searchForm, name: e.target.value })}
                      required
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <Input
                    label="Città / Comune"
                    placeholder="Es. Pompei, Milano..."
                    value={searchForm.city}
                    onChange={(e) => setSearchForm({ ...searchForm, city: e.target.value })}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Provincia"
                    placeholder="Es. NA, MI..."
                    value={searchForm.province}
                    onChange={(e) => setSearchForm({ ...searchForm, province: e.target.value })}
                    className="bg-slate-950 border-slate-800"
                  />

                  <Input
                    label="Partita IVA o CF (Opzionale)"
                    placeholder="Es. 10391601217"
                    value={searchForm.vatId}
                    onChange={(e) => setSearchForm({ ...searchForm, vatId: e.target.value })}
                    className="bg-slate-950 border-slate-800"
                  />

                  <Input
                    label="Sito Web (Opzionale)"
                    placeholder="Es. jamm-ja.it"
                    value={searchForm.website}
                    onChange={(e) => setSearchForm({ ...searchForm, website: e.target.value })}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-slate-500" />
                    <span>Genera automaticamente varianti di ricerca del nome</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSearchingPublic || (!searchForm.name.trim() && !searchForm.vatId.trim() && !searchForm.website.trim())}
                    className="bg-blue-600 hover:bg-blue-500 gap-1.5"
                  >
                    {isSearchingPublic ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Ricerca in corso...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        <span>Cerca Dati Pubblici</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Varianti generate */}
              {nameVariants.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">Varianti analizzate dal motore:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {nameVariants.map((v, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error state */}
              {searchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Search Results List */}
              {isSearchingPublic ? (
                <div className="py-8 text-center space-y-2">
                  <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mx-auto" />
                  <div className="text-xs text-slate-300 font-medium">Interrogazione OpenStreetMap e analisi web in corso...</div>
                  <p className="text-[11px] text-slate-500">Recupero geolocalizzazione, dati societari e controlli anti-duplicato.</p>
                </div>
              ) : searchPerformed && searchResults.length === 0 && !searchError ? (
                <div className="py-6 text-center space-y-2 bg-slate-900/40 rounded-xl border border-slate-800">
                  <Building2 className="h-8 w-8 text-slate-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-300">Nessun candidato pubblico trovato con questi parametri</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Puoi procedere direttamente all&apos;inserimento manuale o verificare i parametri di ricerca.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCompanyForm({
                        ...companyForm,
                        name: searchForm.name,
                        city: searchForm.city,
                        province: searchForm.province,
                        vatId: searchForm.vatId,
                        website: searchForm.website,
                        source: 'inserimento_manuale',
                      });
                      setModalTab('manual');
                    }}
                    className="text-xs mt-2"
                  >
                    Compila Manualmente
                  </Button>
                </div>
              ) : (
                searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Candidati trovati ({searchResults.length})</span>
                      <span className="text-[11px] font-normal text-slate-500">I dati non verranno salvati fino alla tua conferma finale</span>
                    </div>

                    <div className="space-y-3">
                      {searchResults.map((candidate) => (
                        <div
                          key={candidate.id}
                          className={`p-4 rounded-xl border transition-all ${
                            candidate.alreadyInCrm
                              ? 'bg-amber-950/20 border-amber-500/40'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{candidate.name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    candidate.source === 'openstreetmap'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : candidate.source === 'sito_ufficiale'
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                      : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                  }`}
                                >
                                  Fonte: {candidate.source}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300">
                                  Confidence: {candidate.confidence}
                                </Badge>
                              </div>

                              {candidate.legalName && candidate.legalName !== candidate.name && (
                                <div className="text-xs text-slate-300 mt-1">
                                  Ragione Sociale:{' '}
                                  <span className="font-semibold text-blue-300">{candidate.legalName}</span>
                                </div>
                              )}
                            </div>

                            {/* Action / Duplicate badge */}
                            {candidate.alreadyInCrm ? (
                              <div className="text-right shrink-0">
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                                  Azienda già presente
                                </Badge>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleUseCandidateData(candidate)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-xs shrink-0 gap-1.5 shadow-sm"
                              >
                                <span>Usa questi dati e verifica</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

                          {/* Detail Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                            <div>
                              <span className="text-slate-500 font-medium">Partita IVA: </span>
                              {candidate.vatId ? (
                                <span className="font-mono text-slate-200 font-semibold">{candidate.vatId}</span>
                              ) : (
                                <span className="text-slate-500 italic">Non disponibile</span>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-500 font-medium">Codice Fiscale: </span>
                              {candidate.fiscalCode ? (
                                <span className="font-mono text-slate-200">{candidate.fiscalCode}</span>
                              ) : (
                                <span className="text-slate-500 italic">Non disponibile</span>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-500 font-medium">Sede Operativa: </span>
                              {candidate.operatingAddress ? (
                                <span className="text-slate-300">{candidate.operatingAddress}</span>
                              ) : (
                                <span className="text-slate-500 italic">Non disponibile</span>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-500 font-medium">Sede Legale: </span>
                              {candidate.legalAddress ? (
                                <span className="text-slate-300">{candidate.legalAddress}</span>
                              ) : (
                                <span className="text-slate-500 italic">Non disponibile</span>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-500 font-medium">Contatti: </span>
                              <span className="text-slate-300">
                                {[candidate.phone, candidate.email, candidate.pec].filter(Boolean).join(' • ') || (
                                  <span className="text-slate-500 italic">Nessun contatto pubblico</span>
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500 font-medium">Sito Web: </span>
                              {candidate.website ? (
                                <a
                                  href={candidate.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{candidate.website}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="text-slate-500 italic">Non disponibile</span>
                              )}
                            </div>
                          </div>

                          {/* Verification Links */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-slate-800/50 text-[11px]">
                            <span className="text-slate-500">Collegamenti di verifica:</span>
                            {candidate.verificationLinks?.openStreetMap && (
                              <a
                                href={candidate.verificationLinks.openStreetMap}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                <span>Scheda OpenStreetMap</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {candidate.verificationLinks?.iniPec && (
                              <a
                                href={candidate.verificationLinks.iniPec}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>Verifica INI-PEC</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {candidate.verificationLinks?.registroImprese && (
                              <a
                                href={candidate.verificationLinks.registroImprese}
                                target="_blank"
                                rel="noreferrer"
                                className="text-purple-400 hover:underline flex items-center gap-1"
                              >
                                <span>Registro Imprese</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>

                          {/* Duplicate Alert Box if already in CRM */}
                          {candidate.alreadyInCrm && (
                            <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-300">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                                <span>{candidate.duplicateMatchReason || 'Azienda già censita nel CRM.'}</span>
                              </div>
                              {candidate.duplicateOfCompanyId && (
                                <Link href={`/crm/companies/${candidate.duplicateOfCompanyId}`}>
                                  <Button size="sm" variant="outline" className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20">
                                    Vai alla scheda cliente
                                  </Button>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 2: INSERIMENTO / REVISIONE MANUALE */}
          {modalTab === 'manual' && (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              {/* Duplicate Warning in Form */}
              {formDuplicateWarning && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>{formDuplicateWarning}</span>
                </div>
              )}

              {/* Notice when prefilled */}
              {Object.keys(companyForm.fieldSources).length > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>Dati precompilati da fonti pubbliche. Puoi modificare liberamente qualsiasi campo prima del salvataggio.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalTab('search')}
                    className="text-blue-400 hover:underline text-[11px] font-semibold"
                  >
                    Torna alla ricerca
                  </button>
                </div>
              )}

              {/* Nomi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Nome Commerciale *</label>
                    {renderFieldBadge('name')}
                  </div>
                  <Input
                    placeholder="Es. Jamm Ja, Pasticceria De Vivo"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Ragione Sociale Formale</label>
                    {renderFieldBadge('legalName')}
                  </div>
                  <Input
                    placeholder="Es. Jammja S.r.l., Rossi Automazioni S.p.A."
                    value={companyForm.legalName}
                    onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
              </div>

              {/* Dati Fiscali */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Partita IVA</label>
                    {renderFieldBadge('vatId')}
                  </div>
                  <Input
                    placeholder="Es. 10391601217"
                    value={companyForm.vatId}
                    onChange={(e) => setCompanyForm({ ...companyForm, vatId: e.target.value })}
                    className="bg-slate-900 border-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Codice Fiscale</label>
                    {renderFieldBadge('fiscalCode')}
                  </div>
                  <Input
                    placeholder="11 cifre o 16 caratteri"
                    value={companyForm.fiscalCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, fiscalCode: e.target.value })}
                    className="bg-slate-900 border-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Numero REA</label>
                    {renderFieldBadge('rea')}
                  </div>
                  <Input
                    placeholder="Es. REA NA-123456"
                    value={companyForm.rea}
                    onChange={(e) => setCompanyForm({ ...companyForm, rea: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Settore & ATECO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Settore Merceologico *</label>
                  <Select
                    value={companyForm.sector}
                    onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    {SECTOR_OPTIONS.filter((s) => s.value !== 'all').map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Codice ATECO</label>
                    {renderFieldBadge('ateco')}
                  </div>
                  <Input
                    placeholder="Es. 56.10.11 o 62.02.00"
                    value={companyForm.ateco}
                    onChange={(e) => setCompanyForm({ ...companyForm, ateco: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Sedi (Distinzione Sede Legale vs Operativa) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Sede Legale</label>
                    {renderFieldBadge('legalAddress')}
                  </div>
                  <Input
                    placeholder="Es. Via Molinelle 65"
                    value={companyForm.legalAddress}
                    onChange={(e) => setCompanyForm({ ...companyForm, legalAddress: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Sede Operativa / Punto Vendita</label>
                    {renderFieldBadge('operatingAddress')}
                  </div>
                  <Input
                    placeholder="Es. Via Sacra 12"
                    value={companyForm.operatingAddress}
                    onChange={(e) => setCompanyForm({ ...companyForm, operatingAddress: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Città e Provincia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Città / Comune"
                  placeholder="Es. Pompei"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs"
                />

                <Input
                  label="Provincia"
                  placeholder="Es. NA"
                  value={companyForm.province}
                  onChange={(e) => setCompanyForm({ ...companyForm, province: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs"
                />
              </div>

              {/* Contatti */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Telefono</label>
                    {renderFieldBadge('phone')}
                  </div>
                  <Input
                    placeholder="+39 081 123456"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Email Aziendale</label>
                    {renderFieldBadge('email')}
                  </div>
                  <Input
                    type="email"
                    placeholder="info@azienda.it"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Indirizzo PEC</label>
                    {renderFieldBadge('pec')}
                  </div>
                  <Input
                    type="email"
                    placeholder="azienda@pec.it"
                    value={companyForm.pec}
                    onChange={(e) => setCompanyForm({ ...companyForm, pec: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Sito Web</label>
                    {renderFieldBadge('website')}
                  </div>
                  <Input
                    placeholder="https://www.azienda.it"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Note e Dettagli */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Note & Dettagli Operativi</label>
                <textarea
                  rows={3}
                  placeholder="Informazioni aggiuntive, referenti chiave, condizioni speciali..."
                  value={companyForm.notes}
                  onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalTab('search')}
                  disabled={isSubmitting}
                >
                  <Compass className="h-3.5 w-3.5 mr-1" />
                  <span>Ricerca Dati</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewCompanyModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !companyForm.name.trim()}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {isSubmitting ? 'Salvataggio...' : 'Salva Azienda'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </div>
  );
}
