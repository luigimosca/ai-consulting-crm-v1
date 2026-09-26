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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    vatId: '',
    sector: 'horeca_ristoranti',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    estimatedRevenue: '',
    employeeCount: '',
    notes: '',
  });

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

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompanyForm),
      });

      if (res.ok) {
        setIsNewCompanyModalOpen(false);
        setNewCompanyForm({
          name: '',
          vatId: '',
          sector: 'horeca_ristoranti',
          address: '',
          city: '',
          phone: '',
          email: '',
          website: '',
          estimatedRevenue: '',
          employeeCount: '',
          notes: '',
        });
        fetchCompanies();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Errore nella creazione dell\'azienda');
      }
    } catch (err) {
      console.error('Error creating company:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSectorLabel = (sector: string) => {
    const found = SECTOR_OPTIONS.find((s) => s.value === sector);
    return found ? found.label : sector;
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
            Gestione centralizzata dell&apos;anagrafica clienti: dati fiscali, sedi, referenti, preventivi, commesse e progetti operativi collegati.
          </p>
        </div>

        <Button
          onClick={() => setIsNewCompanyModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Nuova Azienda</span>
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
                        Puoi aggiungere una nuova azienda manualmente con il pulsante &quot;Nuova Azienda&quot; o convertire un lead qualificato direttamente dalla sezione Leads.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setIsNewCompanyModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Aggiungi la prima azienda
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
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-slate-900 text-slate-400 border-slate-800">
                          {formatSectorLabel(company.sector)}
                        </Badge>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {company.vatId ? (
                        <div className="font-mono text-slate-200">P.IVA: {company.vatId}</div>
                      ) : (
                        <div className="text-slate-500 italic">P.IVA non specificata</div>
                      )}
                      {(company.city || company.address) && (
                        <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                          <span>{[company.address, company.city].filter(Boolean).join(', ')}</span>
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

      {/* MODAL: NUOVA AZIENDA */}
      <Dialog
        isOpen={isNewCompanyModalOpen}
        onClose={() => setIsNewCompanyModalOpen(false)}
        title="Aggiungi Nuova Azienda in Anagrafica"
        description="Inserisci i dati fiscali, di contatto e operativi della nuova azienda cliente."
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <Input
            label="Ragione Sociale / Nome Azienda *"
            placeholder="Es. Rossi Automazioni S.r.l."
            value={newCompanyForm.name}
            onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
            required
            className="bg-slate-900 border-slate-800"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Partita IVA / Codice Fiscale"
              placeholder="Es. IT12345678901"
              value={newCompanyForm.vatId}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, vatId: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Settore Merceologico *</label>
              <Select
                value={newCompanyForm.sector}
                onChange={(e) => setNewCompanyForm({ ...newCompanyForm, sector: e.target.value })}
                className="bg-slate-900 border-slate-800 text-xs w-full"
              >
                {SECTOR_OPTIONS.filter((s) => s.value !== 'all').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Indirizzo Sede Legale/Operativa"
              placeholder="Es. Via Roma 10"
              value={newCompanyForm.address}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, address: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />

            <Input
              label="Città / Prov."
              placeholder="Es. Milano (MI)"
              value={newCompanyForm.city}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, city: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Telefono"
              placeholder="Es. +39 02 1234567"
              value={newCompanyForm.phone}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, phone: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />

            <Input
              label="Email Aziendale"
              type="email"
              placeholder="info@azienda.it"
              value={newCompanyForm.email}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, email: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />

            <Input
              label="Sito Web"
              placeholder="www.azienda.it"
              value={newCompanyForm.website}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, website: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fatturato Stimato / Annuo"
              placeholder="Es. 1.500.000 €"
              value={newCompanyForm.estimatedRevenue}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, estimatedRevenue: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />

            <Input
              label="Numero Dipendenti"
              placeholder="Es. 10-25"
              value={newCompanyForm.employeeCount}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, employeeCount: e.target.value })}
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Note & Dettagli Operativi</label>
            <textarea
              rows={3}
              placeholder="Informazioni aggiuntive, referenti chiave, condizioni speciali..."
              value={newCompanyForm.notes}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
              disabled={isSubmitting || !newCompanyForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isSubmitting ? 'Salvataggio...' : 'Crea Azienda'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
