'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { formatCentsToCurrency } from '@/lib/money';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase,
  FolderKanban,
  FileText,
  Edit2,
  Trash2,
  Plus,
  ExternalLink,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Compass,
  FileCheck,
  Megaphone,
} from 'lucide-react';

import { ProjectAccessesTab } from '@/components/crm/ProjectAccessesTab';
import { MarketingCampaignsTab } from '@/components/crm/MarketingCampaignsTab';

const SECTOR_OPTIONS = [
  { value: 'horeca_ristoranti', label: 'Ristoranti & Horeca' },
  { value: 'horeca_hotel', label: 'Hotel & Strutture Ricettive' },
  { value: 'studi_legali', label: 'Studi Legali' },
  { value: 'commercialisti', label: 'Commercialisti & Consulenti' },
  { value: 'ecommerce', label: 'eCommerce & Retail' },
  { value: 'local_services', label: 'Servizi Locali & Imprese' },
];

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'commesse' | 'projects' | 'quotes' | 'accounts' | 'marketing'>('overview');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    legalName: '',
    vatId: '',
    fiscalCode: '',
    rea: '',
    sector: '',
    ateco: '',
    legalAddress: '',
    operatingAddress: '',
    address: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    pec: '',
    website: '',
    estimatedRevenue: '',
    employeeCount: '',
    notes: '',
    source: '',
  });

  const fetchCompanyDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/companies/${id}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanyData(data);
        if (data.company) {
          setEditForm({
            name: data.company.name || '',
            legalName: data.company.legalName || '',
            vatId: data.company.vatId || '',
            fiscalCode: data.company.fiscalCode || '',
            rea: data.company.rea || '',
            sector: data.company.sector || 'horeca_ristoranti',
            ateco: data.company.ateco || '',
            legalAddress: data.company.legalAddress || '',
            operatingAddress: data.company.operatingAddress || '',
            address: data.company.address || '',
            city: data.company.city || '',
            province: data.company.province || '',
            phone: data.company.phone || '',
            email: data.company.email || '',
            pec: data.company.pec || '',
            website: data.company.website || '',
            estimatedRevenue: data.company.estimatedRevenue || '',
            employeeCount: data.company.employeeCount || '',
            notes: data.company.notes || '',
            source: data.company.source || '',
          });
        }
      } else {
        router.push('/crm/companies');
      }
    } catch (err) {
      console.error('Failed to load company details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchCompanyDetails();
      } else {
        const err = await res.json();
        alert(err.error || 'Errore salvataggio modifiche');
      }
    } catch (err) {
      console.error('Error updating company:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa azienda?')) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/crm/companies');
      } else {
        const err = await res.json();
        alert(err.error || 'Errore eliminazione azienda');
      }
    } catch (err) {
      console.error('Error deleting company:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        Caricamento dettagli azienda in corso...
      </div>
    );
  }

  if (!companyData || !companyData.company) {
    return (
      <div className="py-20 text-center text-slate-400">
        Azienda non trovata.
      </div>
    );
  }

  const { company, projects = [], orders = [], quotes = [] } = companyData;

  const formatSectorLabel = (sec: string) => {
    const found = SECTOR_OPTIONS.find((s) => s.value === sec);
    return found ? found.label : sec;
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/crm/companies"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Torna all&apos;anagrafica aziende</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{company.name}</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {formatSectorLabel(company.sector)}
            </Badge>
            {company.source && (
              <Badge variant="outline" className="text-[10px] bg-slate-900 text-slate-400 border-slate-800">
                Fonte: {company.source}
              </Badge>
            )}
          </div>
          {company.legalName && company.legalName !== company.name && (
            <div className="text-xs text-slate-400">
              Ragione Sociale: <span className="text-slate-200 font-semibold">{company.legalName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Modifica</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteCompany}
            className="gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Elimina</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Panoramica Anagrafica</span>
        </button>

        <button
          onClick={() => setActiveTab('commesse')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'commesse'
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
          <span>Commesse ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'projects'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
          <span>Progetti Operativi ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'quotes'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-purple-400" />
          <span>Preventivi ({quotes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'accounts'
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Account & Deleghe</span>
        </button>

        <button
          onClick={() => setActiveTab('marketing')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'marketing'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5 text-purple-400" />
          <span>Marketing & Campagne</span>
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <Card className="bg-slate-950 border-slate-800 md:col-span-2 p-6 space-y-6">
            <h2 className="text-base font-semibold text-white">Dati Aziendali & Fiscali</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Nome Commerciale</span>
                <span className="font-semibold text-slate-200">{company.name}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Ragione Sociale Formale</span>
                <span className="text-slate-200">{company.legalName || company.name}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Partita IVA</span>
                <span className="font-mono text-slate-200">{company.vatId || 'Non disponibile'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Codice Fiscale</span>
                <span className="font-mono text-slate-200">{company.fiscalCode || company.vatId || 'Non disponibile'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Numero REA</span>
                <span className="text-slate-200">{company.rea || 'Non disponibile'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Codice ATECO</span>
                <span className="text-slate-200">{company.ateco || 'Non disponibile'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Settore Merceologico</span>
                <span className="text-slate-200">{formatSectorLabel(company.sector)}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Città / Provincia</span>
                <span className="text-slate-200">{[company.city, company.province].filter(Boolean).join(' (') + (company.province ? ')' : '') || 'Non specificata'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Sede Legale</span>
                <span className="text-slate-200">{company.legalAddress || 'Non specificata'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Sede Operativa / Punto Vendita</span>
                <span className="text-slate-200">{company.operatingAddress || company.address || 'Non specificata'}</span>
              </div>
            </div>

            {company.notes && (
              <div className="pt-4 border-t border-slate-850">
                <span className="text-xs text-slate-500 block mb-1">Note & Informazioni Operative</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  {company.notes}
                </p>
              </div>
            )}
          </Card>

          {/* Quick Contact & Links */}
          <Card className="bg-slate-950 border-slate-800 p-6 space-y-6 h-fit">
            <h2 className="text-base font-semibold text-white">Contatti & Canali</h2>
            <div className="space-y-3.5 text-xs">
              {company.website && (
                <div className="flex items-start gap-2.5">
                  <Globe className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Sito Web</span>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 font-medium mt-0.5"
                    >
                      <span>{company.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {company.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Email Aziendale</span>
                    <a href={`mailto:${company.email}`} className="text-slate-200 hover:underline font-medium mt-0.5 block">
                      {company.email}
                    </a>
                  </div>
                </div>
              )}

              {company.pec && (
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">PEC Ufficiale</span>
                    <span className="text-slate-200 font-medium mt-0.5 block font-mono">{company.pec}</span>
                  </div>
                </div>
              )}

              {company.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[11px]">Telefono</span>
                    <a href={`tel:${company.phone}`} className="text-slate-200 hover:underline font-mono mt-0.5 block">
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-850 space-y-2">
                <Link href="/crm/projects" className="w-full block">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-500 text-xs">
                    <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
                    Crea Nuovo Progetto
                  </Button>
                </Link>
                <Link href="/crm/quotes" className="w-full block">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Crea Preventivo
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: COMMESSE */}
      {activeTab === 'commesse' && (
        <Card className="bg-slate-950 border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Commesse Contrattualizzate</h2>
          </div>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nessuna commessa registrata per questa azienda.
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {orders.map((o: any) => (
                <div key={o.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-400 text-xs">{o.code}</span>
                      <span className="font-semibold text-slate-200 text-sm">{o.title}</span>
                      <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Valore: <span className="font-bold text-slate-200">{formatCentsToCurrency(o.agreedValue, o.currency)}</span>
                    </div>
                  </div>
                  <Link href={`/crm/commesse/${o.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Dettaglio Commessa
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT: PROJECTS */}
      {activeTab === 'projects' && (
        <Card className="bg-slate-950 border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Progetti Operativi Collegati</h2>
          </div>
          {projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nessun progetto operativo collegato a questa azienda.
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {projects.map((p: any) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400 text-xs">{p.code}</span>
                      <span className="font-semibold text-slate-200 text-sm">{p.title}</span>
                      <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Avanzamento: <span className="font-bold text-blue-400">{p.progressPercent}%</span>
                    </div>
                  </div>
                  <Link href={`/crm/projects/${p.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Apri Progetto & Gantt
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT: QUOTES */}
      {activeTab === 'quotes' && (
        <Card className="bg-slate-950 border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Preventivi Emessi</h2>
          </div>
          {quotes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nessun preventivo registrato per questa azienda.
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {quotes.map((q: any) => (
                <div key={q.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-400 text-xs">{q.quoteNumber}</span>
                      <span className="font-semibold text-slate-200 text-sm">{q.title}</span>
                      <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Importo: <span className="font-bold text-slate-200">{formatCentsToCurrency(q.totalAmount, q.currency)}</span>
                    </div>
                  </div>
                  <Link href={`/crm/quotes/${q.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Visualizza Preventivo
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT: ACCOUNTS & DELEGHE */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <ProjectAccessesTab
            companyId={id}
            isManagerOrEditor={true}
            currentUserRole={companyData?.currentUser?.role}
          />
        </div>
      )}

      {/* TAB CONTENT: MARKETING & CAMPAIGNS */}
      {activeTab === 'marketing' && (
        <div className="space-y-4">
          <MarketingCampaignsTab
            targetType="companies"
            targetId={id}
            targetName={company.name}
          />
        </div>
      )}

      {/* EDIT MODAL */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifica Anagrafica Azienda"
        description="Aggiorna i dati anagrafici, fiscali e di contatto dell'azienda."
      >
        <form onSubmit={handleUpdateCompany} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome Commerciale *"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              className="bg-slate-900 border-slate-800 text-xs"
            />
            <Input
              label="Ragione Sociale Formale"
              value={editForm.legalName}
              onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Partita IVA"
              value={editForm.vatId}
              onChange={(e) => setEditForm({ ...editForm, vatId: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs font-mono"
            />
            <Input
              label="Codice Fiscale"
              value={editForm.fiscalCode}
              onChange={(e) => setEditForm({ ...editForm, fiscalCode: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs font-mono"
            />
            <Input
              label="Numero REA"
              value={editForm.rea}
              onChange={(e) => setEditForm({ ...editForm, rea: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Settore Merceologico *</label>
              <Select
                value={editForm.sector}
                onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                className="bg-slate-900 border-slate-800 text-xs w-full"
              >
                {SECTOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Codice ATECO"
              value={editForm.ateco}
              onChange={(e) => setEditForm({ ...editForm, ateco: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Sede Legale"
              value={editForm.legalAddress}
              onChange={(e) => setEditForm({ ...editForm, legalAddress: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
            <Input
              label="Sede Operativa / Punto Vendita"
              value={editForm.operatingAddress}
              onChange={(e) => setEditForm({ ...editForm, operatingAddress: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Città / Comune"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
            <Input
              label="Provincia"
              value={editForm.province}
              onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input
              label="Telefono"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
            <Input
              label="PEC"
              type="email"
              value={editForm.pec}
              onChange={(e) => setEditForm({ ...editForm, pec: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
            <Input
              label="Sito Web"
              value={editForm.website}
              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              className="bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Note</label>
            <textarea
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !editForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
