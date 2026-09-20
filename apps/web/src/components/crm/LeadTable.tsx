'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ScoreBadge } from './ScoreBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { formatSector, formatStatus, getStatusBadgeVariant } from '@/lib/utils';
import { 
  Search, 
  ExternalLink, 
  ChevronRight, 
  Building2, 
  Filter, 
  Phone, 
  Mail,
  MapPin,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  Layers,
  ArrowRight,
  Users
} from 'lucide-react';

export interface LeadItem {
  id: string;
  companyName: string;
  website?: string | null;
  source: string;
  sector: string;
  score: number;
  status: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  createdAt: string;
  isEcommerce?: boolean;
  ecommercePlatform?: string | null;
  cms?: string | null;
  hasWhatsapp?: boolean;
  hasBooking?: boolean;
  primaryDecisionMaker?: {
    fullName: string;
    role: string;
    seniority?: string;
    department?: string;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    confidence?: number;
  } | null;
}

interface LeadTableProps {
  leads: LeadItem[];
  onRefresh?: () => void;
}

export function LeadTable({ leads, onRefresh }: LeadTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ecommerce' | 'showcase'>('all');

  // Selected lead IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk Enrichment Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    current: 0,
    total: 0,
    currentLeadName: '',
  });
  const [bulkResults, setBulkResults] = useState<
    { id: string; name: string; success: boolean; score?: number; error?: string; platform?: string | null }[]
  >([]);

  // Bulk Status Update State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const safeLeads = Array.isArray(leads) ? leads : [];

  const filteredLeads = safeLeads.filter((lead) => {
    if (!lead) return false;
    const name = (lead.companyName || '').toLowerCase();
    const city = (lead.city || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const platform = (lead.ecommercePlatform || '').toLowerCase();
    const q = (searchTerm || '').toLowerCase().trim();

    const matchesSearch = !q || name.includes(q) || city.includes(q) || email.includes(q) || platform.includes(q);
    const matchesSector = sectorFilter === 'all' || lead.sector === sectorFilter;
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    let matchesType = true;
    if (typeFilter === 'ecommerce') {
      matchesType = Boolean(lead.isEcommerce || lead.sector === 'ecommerce');
    } else if (typeFilter === 'showcase') {
      matchesType = !lead.isEcommerce && lead.sector !== 'ecommerce';
    }

    return matchesSearch && matchesSector && matchesStatus && matchesType;
  });

  // Checkbox helpers
  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.includes(l.id));
  const someFilteredSelected = filteredLeads.some((l) => selectedIds.includes(l.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredLeads.map((l) => l.id));
      setSelectedIds(selectedIds.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...filteredLeads.map((l) => l.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectUnenriched = () => {
    const unenrichedIds = filteredLeads.filter((l) => l.status === 'nuovo' || l.score === 0).map((l) => l.id);
    setSelectedIds(unenrichedIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Run Bulk Enrichment sequentially with real-time UI updates
  const handleStartBulkEnrichment = async () => {
    if (selectedIds.length === 0) return;

    const leadsToEnrich = safeLeads.filter((l) => selectedIds.includes(l.id));
    if (leadsToEnrich.length === 0) return;

    setIsBulkModalOpen(true);
    setIsProcessingBulk(true);
    setBulkResults([]);
    setBulkProgress({
      current: 0,
      total: leadsToEnrich.length,
      currentLeadName: leadsToEnrich[0].companyName,
    });

    const results: typeof bulkResults = [];

    for (let i = 0; i < leadsToEnrich.length; i++) {
      const currentLead = leadsToEnrich[i];
      setBulkProgress({
        current: i + 1,
        total: leadsToEnrich.length,
        currentLeadName: currentLead.companyName,
      });

      try {
        const res = await fetch('/api/enrichment/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: currentLead.id,
            companyName: currentLead.companyName,
            website: currentLead.website,
            sector: currentLead.sector,
            city: currentLead.city,
            phone: currentLead.phone,
            email: currentLead.email,
            source: currentLead.source,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const itemResult = {
            id: currentLead.id,
            name: currentLead.companyName,
            success: true,
            score: data.dossier?.commercialScore || 85,
            platform: data.dossier?.websiteAnalysis?.cms || (data.dossier?.websiteAnalysis?.isEcommerce ? 'E-commerce' : null),
          };
          results.push(itemResult);
          setBulkResults([...results]);
        } else {
          const itemResult = {
            id: currentLead.id,
            name: currentLead.companyName,
            success: false,
            error: data.error || 'Errore arricchimento',
          };
          results.push(itemResult);
          setBulkResults([...results]);
        }
      } catch (err: any) {
        const itemResult = {
          id: currentLead.id,
          name: currentLead.companyName,
          success: false,
          error: err?.message || 'Connessione fallita',
        };
        results.push(itemResult);
        setBulkResults([...results]);
      }
    }

    setIsProcessingBulk(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Bulk Status Update
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0 || !newStatus) return;
    setIsUpdatingStatus(true);
    try {
      await Promise.allSettled(
        selectedIds.map((id) =>
          fetch(`/api/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      if (onRefresh) onRefresh();
      setSelectedIds([]);
    } catch (e) {
      console.error('Failed to update status in bulk:', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper per badge e-commerce
  const renderEcommerceBadge = (lead: LeadItem) => {
    const isEcom = Boolean(lead.isEcommerce || lead.sector === 'ecommerce');
    const platform = lead.ecommercePlatform || lead.cms;

    if (isEcom) {
      let label = '🛍️ E-commerce';
      if (platform) {
        if (/shopify/i.test(platform)) label = '🛍️ Shopify';
        else if (/woocommerce/i.test(platform)) label = '🛍️ WooCommerce';
        else if (/prestashop/i.test(platform)) label = '🛍️ PrestaShop';
        else if (/magento/i.test(platform)) label = '🛍️ Magento';
        else label = `🛍️ ${platform}`;
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded-md shadow-sm">
          <ShoppingBag className="h-3 w-3 text-purple-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
        <span>🏢 Vetrina</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 relative">
      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-1">
          <Input
            placeholder="Cerca azienda, città, email o e-commerce..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <Select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          options={[
            { label: 'Tutti i Settori', value: 'all' },
            { label: 'Ristoranti & HORECA', value: 'horeca_ristoranti' },
            { label: 'Studi Medici & Fisioterapia', value: 'local_services' },
            { label: 'Studi Legali', value: 'studi_legali' },
            { label: 'Commercialisti', value: 'commercialisti' },
            { label: 'Hotel & Turismo', value: 'horeca_hotel' },
            { label: 'E-commerce & Retail', value: 'ecommerce' },
          ]}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { label: 'Tutti gli Stati', value: 'all' },
            { label: 'Nuovo (Da Arricchire)', value: 'nuovo' },
            { label: 'Arricchito con AI', value: 'arricchito' },
            { label: 'In Contatto', value: 'in_contatto' },
            { label: 'Qualificato', value: 'qualificato' },
            { label: 'Convertito', value: 'convertito' },
            { label: 'Perso', value: 'perso' },
          ]}
        />

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          options={[
            { label: 'Tutti i Canali Web', value: 'all' },
            { label: '🛍️ Solo E-commerce (Shopify/Woo/ecc.)', value: 'ecommerce' },
            { label: '🏢 Solo Siti Vetrina / Servizi', value: 'showcase' },
          ]}
        />
      </div>

      {/* Quick Selection Toolbar Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1.5 font-medium text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {allFilteredSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-400" />
            ) : someFilteredSelected ? (
              <MinusSquare className="h-4 w-4 text-blue-400" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
            <span>Seleziona tutti ({filteredLeads.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSelectUnenriched}
            className="text-slate-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
          >
            Solo non arricchiti ({filteredLeads.filter((l) => l.status === 'nuovo' || l.score === 0).length})
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/40 transition-colors"
            >
              Deseleziona ({selectedIds.length})
            </button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-300 bg-blue-950/80 border border-blue-800/80 px-2.5 py-1 rounded-lg">
              {selectedIds.length} lead selezionati
            </span>

            <Button
              variant="glow"
              size="sm"
              onClick={handleStartBulkEnrichment}
              className="gap-1.5 py-1 text-xs"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>⚡ Arricchisci Selezionati in Massa</span>
            </Button>
          </div>
        )}
      </div>

      {/* Floating Action Bar (When items are selected and scrolled) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur border border-blue-500/40 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 text-xs animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">
              {selectedIds.length} {selectedIds.length === 1 ? 'lead selezionato' : 'lead selezionati'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <Button
            variant="glow"
            size="sm"
            onClick={handleStartBulkEnrichment}
            className="gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            <span>Arricchisci in Massa</span>
          </Button>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 hidden sm:inline">Stato:</span>
            <select
              onChange={(e) => handleBulkStatusChange(e.target.value)}
              defaultValue=""
              disabled={isUpdatingStatus}
              className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>Imposta stato...</option>
              <option value="nuovo">Nuovo</option>
              <option value="arricchito">Arricchito</option>
              <option value="in_contatto">In Contatto</option>
              <option value="qualificato">Qualificato</option>
              <option value="convertito">Convertito</option>
              <option value="perso">Perso</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleClearSelection}
            className="text-slate-400 hover:text-white text-xs underline ml-2"
          >
            Annulla
          </button>
        </div>
      )}

      {/* Table Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-sm">
        {/* MOBILE CARDS VIEW (md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Filter className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              Nessun lead trovato con i filtri selezionati.
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = selectedIds.includes(lead.id);
              return (
                <div 
                  key={lead.id} 
                  className={`p-4 space-y-3 transition-colors ${
                    isSelected ? 'bg-blue-950/30 border-l-4 border-blue-500' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOne(lead.id)}
                        className="mt-1 text-slate-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500" />
                        )}
                      </button>

                      <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <Link 
                          href={`/crm/leads/${lead.id}`}
                          className="font-semibold text-white text-sm hover:text-blue-400 leading-tight block"
                        >
                          {lead.companyName}
                        </Link>
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 mt-0.5"
                          >
                            <span className="truncate max-w-[170px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>
                    <ScoreBadge score={lead.score} size="sm" />
                  </div>

                  {lead.primaryDecisionMaker && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-1 rounded-md">
                      <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-white">{lead.primaryDecisionMaker.fullName}</span>
                      <span className="text-indigo-200/80 font-normal">({lead.primaryDecisionMaker.role})</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                      {formatSector(lead.sector)}
                    </span>
                    <Badge variant={getStatusBadgeVariant(lead.status)} className="text-[10px]">
                      {formatStatus(lead.status)}
                    </Badge>
                    {renderEcommerceBadge(lead)}
                    {lead.city && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                        {lead.city}
                      </span>
                    )}
                  </div>

                  {(lead.phone || lead.email) && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-slate-300 hover:text-white">
                          <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-slate-300 hover:text-white truncate max-w-[170px]">
                          <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span className="capitalize">Fonte: {lead.source}</span>
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold py-1 px-3 rounded-lg bg-blue-950/50 border border-blue-800/60"
                    >
                      <span>Dettagli & Scheda</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="w-10 px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-white"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-400" />
                    ) : someFilteredSelected ? (
                      <MinusSquare className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Azienda</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">Settore</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">Canale Web</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">Score AI</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">Stato</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Contatti</th>
                <th scope="col" className="px-3 py-3.5 font-semibold">Fonte</th>
                <th scope="col" className="px-4 py-3.5 text-right font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <Filter className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    Nessun lead trovato con i filtri selezionati.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  return (
                    <tr 
                      key={lead.id} 
                      className={`transition-colors group ${
                        isSelected ? 'bg-blue-950/30' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(lead.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-4 font-medium text-white">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
                            <Building2 className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <Link 
                              href={`/crm/leads/${lead.id}`}
                              className="font-semibold text-slate-100 hover:text-blue-400 transition-colors"
                            >
                              {lead.companyName}
                            </Link>
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors mt-0.5"
                              >
                                <span className="truncate max-w-[180px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {lead.primaryDecisionMaker && (
                              <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 font-medium mt-1">
                                <Users className="h-3 w-3 text-indigo-400 shrink-0" />
                                <span className="text-white font-medium">{lead.primaryDecisionMaker.fullName}</span>
                                <span className="text-slate-400 font-normal">({lead.primaryDecisionMaker.role})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <span className="text-xs text-slate-300 font-medium bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60">
                          {formatSector(lead.sector)}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        {renderEcommerceBadge(lead)}
                      </td>

                      <td className="px-3 py-4">
                        <ScoreBadge score={lead.score} />
                      </td>

                      <td className="px-3 py-4">
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {formatStatus(lead.status)}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-xs space-y-1">
                        {lead.city && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{lead.city}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                          {lead.source}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Dettaglio</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Bulk Enrichment Modal */}
      <Dialog
        isOpen={isBulkModalOpen}
        onClose={() => !isProcessingBulk && setIsBulkModalOpen(false)}
        title="⚡ Arricchimento di Massa con Intelligenza Artificiale"
        description="Analisi parallela di siti web, stack tecnologico (Shopify/Woo/CMS), contatti verificati e calcolo score di vendita."
      >
        <div className="space-y-4 pt-2">
          {/* Progress Indicator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {isProcessingBulk ? (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                <span className="font-semibold text-white">
                  {isProcessingBulk
                    ? `Elaborazione ${bulkProgress.current} di ${bulkProgress.total}...`
                    : `Arricchimento completato per tutti i ${bulkProgress.total} lead!`}
                </span>
              </div>
              <span className="font-bold text-blue-400">
                {bulkProgress.total > 0
                  ? Math.round((bulkProgress.current / bulkProgress.total) * 100)
                  : 0}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                style={{
                  width: `${
                    bulkProgress.total > 0
                      ? (bulkProgress.current / bulkProgress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            {isProcessingBulk && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                <span>In corso: <strong className="text-slate-200">{bulkProgress.currentLeadName}</strong></span>
              </div>
            )}
          </div>

          {/* Results Live Stream */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {bulkResults.map((res, index) => (
              <div
                key={res.id || index}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {res.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200 truncate">{res.name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {res.platform && (
                    <span className="text-[10px] text-purple-300 bg-purple-950/80 border border-purple-800/80 px-1.5 py-0.5 rounded">
                      {res.platform}
                    </span>
                  )}
                  {res.success ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      Score: {res.score}/100
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                      {res.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={isProcessingBulk}
            >
              {isProcessingBulk ? 'Elaborazione in corso...' : 'Chiudi e Visualizza CRM'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
