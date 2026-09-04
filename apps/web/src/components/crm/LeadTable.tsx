'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ScoreBadge } from './ScoreBadge';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatSector, formatStatus, getStatusBadgeVariant } from '@/lib/utils';
import { 
  Search, 
  ExternalLink, 
  ChevronRight, 
  Building2, 
  Filter, 
  Phone, 
  Mail,
  MapPin
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
}

export function LeadTable({ leads }: { leads: LeadItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.city && lead.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSector = sectorFilter === 'all' || lead.sector === sectorFilter;
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesSector && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Input
            placeholder="Cerca per azienda, città o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <Select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          options={[
            { label: 'Tutti i Settori', value: 'all' },
            { label: 'Ristoranti & HORECA', value: 'horeca_ristoranti' },
            { label: 'Studi Legali', value: 'studi_legali' },
            { label: 'Commercialisti', value: 'commercialisti' },
            { label: 'Hotel & Turismo', value: 'horeca_hotel' },
            { label: 'E-commerce', value: 'ecommerce' },
            { label: 'Attività Locali', value: 'local_services' },
          ]}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { label: 'Tutti gli Stati', value: 'all' },
            { label: 'Nuovo', value: 'nuovo' },
            { label: 'Arricchito', value: 'arricchito' },
            { label: 'In Contatto', value: 'in_contatto' },
            { label: 'Qualificato', value: 'qualificato' },
            { label: 'Convertito', value: 'convertito' },
            { label: 'Perso', value: 'perso' },
          ]}
        />
      </div>

      {/* Table Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">Azienda</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Settore</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Score AI</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Stato</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Contatti</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Fonte</th>
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Filter className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    Nessun lead trovato con i filtri selezionati.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-5 py-4 font-medium text-white">
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
                              <span>{lead.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-xs text-slate-300 font-medium bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                        {formatSector(lead.sector)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <ScoreBadge score={lead.score} />
                    </td>

                    <td className="px-4 py-4">
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

                    <td className="px-4 py-4">
                      <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                        {lead.source}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <span>Dettaglio</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
