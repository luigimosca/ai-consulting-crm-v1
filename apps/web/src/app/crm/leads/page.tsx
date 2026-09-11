'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/crm/Header';
import { LeadTable, type LeadItem } from '@/components/crm/LeadTable';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Search, Sparkles, RefreshCw } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    sector: 'horeca_ristoranti',
    source: 'sito',
    city: '',
    phone: '',
    email: '',
    notes: '',
  });

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setFormData({
          companyName: '',
          website: '',
          sector: 'horeca_ristoranti',
          source: 'sito',
          city: '',
          phone: '',
          email: '',
          notes: '',
        });
        fetchLeads();
      }
    } catch (err) {
      console.error('Error creating lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Gestione Lead & Pipeline"
        description="Monitora tutti i prospect, filtra per settore e stato di avanzamento commerciale."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeads}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Aggiorna</span>
            </Button>

            <Link href="/crm/lead-gen">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Search className="h-3.5 w-3.5 text-blue-400" />
                <span>Trova con Maps</span>
              </Button>
            </Link>

            <Button
              variant="glow"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuovo Lead</span>
            </Button>
          </div>
        }
      />

      {/* Leads Table */}
      <LeadTable leads={leads} />

      {/* Create Lead Modal Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Aggiungi Nuovo Lead al CRM"
        description="Inserisci i dettagli anagrafici. L'AI calcolerà automaticamente lo score di priorità."
      >
        <form onSubmit={handleCreateLead} className="space-y-4 pt-2">
          <Input
            label="Nome Azienda o Studio *"
            placeholder="Es. Pizzeria Da Michele"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Settore"
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              options={[
                { label: 'Ristoranti & HORECA', value: 'horeca_ristoranti' },
                { label: 'Studi Legali', value: 'studi_legali' },
                { label: 'Commercialisti', value: 'commercialisti' },
                { label: 'Hotel & Turismo', value: 'horeca_hotel' },
                { label: 'E-commerce', value: 'ecommerce' },
                { label: 'Attività Locali', value: 'local_services' },
              ]}
            />

            <Select
              label="Fonte Lead"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              options={[
                { label: 'Sito Web Inbound', value: 'sito' },
                { label: 'Google Maps Scraper', value: 'maps' },
                { label: 'Directory', value: 'directory' },
                { label: 'Referral / Passaparola', value: 'referral' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sito Web"
              placeholder="www.azienda.it"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />

            <Input
              label="Città"
              placeholder="Es. Milano"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              placeholder="info@azienda.it"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Telefono"
              placeholder="+39 02 1234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Note interne</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Appunti sul primo contatto o esigenze..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Salva Lead
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
