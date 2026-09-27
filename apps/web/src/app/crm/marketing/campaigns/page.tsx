'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  Megaphone,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Target,
} from 'lucide-react';

function CampaignsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSegmentId = searchParams.get('createWithSegment');

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');

  // New Campaign Modal State
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preselectedSegmentId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    objective: 'lead_generation',
    channel: 'email',
    segmentId: preselectedSegmentId || '',
    contentSubject: '',
    contentBody: '',
    scheduledStartAt: '',
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campsRes, segsRes] = await Promise.all([
        fetch('/api/marketing/campaigns'),
        fetch('/api/marketing/segments'),
      ]);

      if (campsRes.ok) {
        const data = await campsRes.json();
        setCampaigns(data.campaigns || []);
      }
      if (segsRes.ok) {
        const data = await segsRes.json();
        setSegments(data.segments || []);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Inserisci il nome della campagna');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          objective: formData.objective,
          channel: formData.channel,
          segmentId: formData.segmentId || undefined,
          contentSubject: formData.contentSubject.trim() || undefined,
          contentBody: formData.contentBody || undefined,
          scheduledStartAt: formData.scheduledStartAt || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsModalOpen(false);
        router.push(`/crm/marketing/campaigns/${data.campaign.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Errore durante la creazione');
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
      alert('Errore di connessione');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="h-3 w-3" /> Bozza
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold animate-pulse">
            <Clock className="h-3 w-3" /> In Revisione
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
            <ShieldCheck className="h-3 w-3 text-purple-400" /> Approvata
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Attiva
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="h-3 w-3" /> Conclusa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'email':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-950/60 text-blue-300 border border-blue-800/40 font-medium">
            <Mail className="h-3 w-3" /> Email
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-medium">
            <MessageSquare className="h-3 w-3" /> WhatsApp
          </span>
        );
      case 'phone_outreach':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-950/60 text-amber-300 border border-amber-800/40 font-medium">
            <Phone className="h-3 w-3" /> Telefono
          </span>
        );
      case 'mixed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-950/60 text-purple-300 border border-purple-800/40 font-medium">
            <Layers className="h-3 w-3" /> Multicanale
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-900 text-slate-300 border border-slate-700">
            {channel}
          </span>
        );
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterChannel !== 'all' && c.channel !== filterChannel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.segmentName && c.segmentName.toLowerCase().includes(q))
      );
    }
    return true;
  });

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
            <Megaphone className="h-6 w-6 text-purple-400" />
            Gestione Campagne di Outreach
          </h1>
          <p className="text-xs text-slate-400">
            Pianifica campagne mirate, imposta template personalizzati con variabili dinamiche e monitora lo stato di contatto.
          </p>
        </div>

        <Button
          variant="glow"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Crea Nuova Campagna</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-950 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per codice, nome o segmento..."
              className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none text-xs"
            >
              <option value="all">Tutti gli stati</option>
              <option value="draft">Bozza</option>
              <option value="in_review">In Revisione</option>
              <option value="approved">Approvata</option>
              <option value="active">Attiva</option>
              <option value="completed">Conclusa</option>
            </select>
          </div>

          <div>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none text-xs"
            >
              <option value="all">Tutti i canali</option>
              <option value="email">Email Outreach</option>
              <option value="whatsapp">WhatsApp Direct</option>
              <option value="phone_outreach">Telefonate Outbound</option>
              <option value="mixed">Multicanale</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Campaigns Table */}
      <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Caricamento campagne...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Megaphone className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">Nessuna campagna trovata</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nessun record corrisponde ai filtri di ricerca impostati.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Codice</th>
                  <th className="py-3 px-3">Nome & Obiettivo</th>
                  <th className="py-3 px-3">Canale</th>
                  <th className="py-3 px-3">Segmento Associato</th>
                  <th className="py-3 px-3">Stato</th>
                  <th className="py-3 px-3">Creata il</th>
                  <th className="py-3 px-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-400">{c.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{c.objective?.replace('_', ' ')}</div>
                    </td>
                    <td className="py-3 px-3">{getChannelBadge(c.channel)}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {c.segmentName ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Target className="h-3 w-3 text-purple-400" />
                          {c.segmentName}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Nessun segmento</span>
                      )}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(c.status)}</td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/crm/marketing/campaigns/${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-950/40 border border-purple-800/40 px-3 py-1.5 rounded-md hover:bg-purple-900/40 transition-colors"
                      >
                        <span>Campaign Studio</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE NEW CAMPAIGN MODAL */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crea Nuova Campagna di Marketing"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-slate-300 block">Nome Campagna *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Es. Q4 AI Chatbot Outreach - Ristoranti Pompei"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-slate-300 block">Obiettivo Campagna</label>
              <select
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white focus:border-purple-500 focus:outline-none text-xs"
              >
                <option value="lead_generation">Lead Generation & Acquisizione</option>
                <option value="nurturing">Lead Nurturing & Follow-up</option>
                <option value="upselling">Upselling & Cross-selling</option>
                <option value="reengagement">Re-engagement Lead Inattivi</option>
                <option value="event_invitation">Invito ad Evento / Demo Live</option>
                <option value="other">Altro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300 block">Canale Principale</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white focus:border-purple-500 focus:outline-none text-xs"
              >
                <option value="email">Email Outreach</option>
                <option value="whatsapp">WhatsApp Direct</option>
                <option value="phone_outreach">Outreach Telefonico</option>
                <option value="mixed">Multicanale (Email + Phone)</option>
                <option value="manual_task">Attività Manuale / Incontro</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-300 block">Segmento Target Collegato</label>
            <select
              value={formData.segmentId}
              onChange={(e) => setFormData({ ...formData, segmentId: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white focus:border-purple-500 focus:outline-none text-xs"
            >
              <option value="">Seleziona un segmento target (Opzionale)</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.estimatedCount} target stimati)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-300 block">Oggetto Messaggio / Titolo</label>
            <input
              type="text"
              value={formData.contentSubject}
              onChange={(e) => setFormData({ ...formData, contentSubject: e.target.value })}
              placeholder="Es. Opportunità di crescita digitale per {{companyName}}"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-300 block">Bozza Corpo Messaggio</label>
            <textarea
              rows={4}
              value={formData.contentBody}
              onChange={(e) => setFormData({ ...formData, contentBody: e.target.value })}
              placeholder="Gentile {{contactName}}, abbiamo analizzato la presenza online di {{companyName}} a {{city}}..."
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white font-mono placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="text-xs"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="glow"
              isLoading={isSubmitting}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white"
            >
              Crea Campagna in Bozza
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function CampaignsListPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-slate-500 text-sm">Caricamento Campagne...</div>}>
      <CampaignsListContent />
    </Suspense>
  );
}

