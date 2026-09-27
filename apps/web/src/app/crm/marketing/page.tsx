'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Megaphone,
  Target,
  Users,
  Layers,
  Plus,
  ArrowRight,
  TrendingUp,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  BarChart3,
} from 'lucide-react';

export default function MarketingHubDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'analytics'>('campaigns');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, campsRes, segsRes] = await Promise.all([
        fetch('/api/marketing/stats'),
        fetch('/api/marketing/campaigns'),
        fetch('/api/marketing/segments'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (campsRes.ok) {
        const data = await campsRes.json();
        setCampaigns(data.campaigns || []);
      }
      if (segsRes.ok) {
        const data = await segsRes.json();
        setSegments(data.segments || []);
      }
    } catch (err) {
      console.error('Failed to load marketing dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Marketing Hub & Campagne
              </h1>
              <p className="text-xs text-slate-400">
                Segmentazione dinamica, campaign studio outbound e tracciamento contatti 360°
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/crm/marketing/segments">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-700 text-slate-200 hover:bg-slate-800">
              <Target className="h-3.5 w-3.5 text-purple-400" />
              <span>Segmenti Dinamici</span>
            </Button>
          </Link>
          <Link href="/crm/marketing/campaigns">
            <Button variant="glow" size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20">
              <Plus className="h-3.5 w-3.5" />
              <span>Nuova Campagna</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Real DB Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campagne Totali</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {stats?.totalCampaigns ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              ({stats?.campaignsByStatus?.active ?? 0} attive, {stats?.campaignsByStatus?.draft ?? 0} bozze)
            </span>
          </div>
          <div className="text-[11px] text-purple-300/80 pt-1 flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3 text-purple-400" />
            <span>{stats?.campaignsByStatus?.approved ?? 0} approvate con RBAC</span>
          </div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Segmenti Target</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {stats?.totalSegments ?? 0}
            </span>
            <span className="text-xs text-slate-400">regole dinamiche</span>
          </div>
          <div className="text-[11px] text-blue-300/80 pt-1 flex items-center gap-1 font-medium">
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span>Spiegazione naturale inclusa</span>
          </div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destinatari Arruolati</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {stats?.totalRecipients ?? 0}
            </span>
            <span className="text-xs text-slate-400">in campagne</span>
          </div>
          <div className="text-[11px] text-emerald-300/80 pt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>{stats?.recipientsByStatus?.interested ?? 0} interessati / convertiti</span>
          </div>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Copertura Audience</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {stats?.totalAudienceReach ?? 0}
            </span>
            <span className="text-xs text-slate-400">target eleggibili</span>
          </div>
          <div className="text-[11px] text-indigo-300/80 pt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="h-3 w-3 text-indigo-400" />
            <span>Filtri privacy & consensi attivi</span>
          </div>
        </Card>
      </div>

      {/* Transparent Disclosure Notice */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white flex items-center gap-2">
            <span>Trasparenza Metriche di Marketing & Delivery (Fase 1)</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">100% Dati Reali DB</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            I conteggi sopra riportati riflettono esattamente i record presenti nel database SQLite locale. Le metriche di tracciamento avanzato (come tasso di apertura email e click-through rate) sono dichiarate come non disponibili in questa versione poiché richiedono webhook dedicati da provider SMTP/MTA esterni, evitando la generazione di metriche simulate o fittizie.
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>Campagne ({campaigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('segments')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'segments'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>Segmenti Target ({segments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Distribuzione & Funnel</span>
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS LIST */}
      {activeTab === 'campaigns' && (
        <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-purple-400" />
              Tutte le Campagne di Outreach
            </h2>
            <Link href="/crm/marketing/campaigns">
              <Button variant="outline" size="sm" className="text-xs border-slate-700 gap-1 text-slate-300">
                <span>Gestione Campagne &rarr;</span>
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Caricamento campagne in corso...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Megaphone className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Nessuna campagna creata finora</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crea la tua prima campagna associandola a un segmento target per iniziare l&apos;outreach.
              </p>
              <div className="pt-2">
                <Link href="/crm/marketing/campaigns">
                  <Button variant="glow" size="sm" className="text-xs bg-purple-600 hover:bg-purple-500 text-white">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Crea Campagna Ora
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Codice</th>
                    <th className="py-3 px-3">Nome Campagna</th>
                    <th className="py-3 px-3">Obiettivo</th>
                    <th className="py-3 px-3">Canale</th>
                    <th className="py-3 px-3">Segmento Collegato</th>
                    <th className="py-3 px-3">Stato</th>
                    <th className="py-3 px-3">Creata il</th>
                    <th className="py-3 px-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-blue-400">{c.code}</td>
                      <td className="py-3 px-3 font-semibold text-white">{c.name}</td>
                      <td className="py-3 px-3 capitalize text-slate-300">{c.objective?.replace('_', ' ')}</td>
                      <td className="py-3 px-3">{getChannelBadge(c.channel)}</td>
                      <td className="py-3 px-3 text-slate-400">{c.segmentName || 'Nessun segmento'}</td>
                      <td className="py-3 px-3">{getStatusBadge(c.status)}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/crm/marketing/campaigns/${c.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-950/40 border border-purple-800/40 px-2.5 py-1 rounded-md hover:bg-purple-900/40 transition-colors"
                        >
                          <span>Apri Studio</span>
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
      )}

      {/* TAB 2: SEGMENTS LIST */}
      {activeTab === 'segments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              Segmenti Target Configurati
            </h2>
            <Link href="/crm/marketing/segments">
              <Button variant="glow" size="sm" className="text-xs bg-purple-600 hover:bg-purple-500 text-white gap-1">
                <Plus className="h-3.5 w-3.5" /> Nuovo Segmento
              </Button>
            </Link>
          </div>

          {segments.length === 0 ? (
            <Card className="bg-slate-950 border-slate-800 p-12 text-center space-y-3">
              <Target className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Nessun segmento configurato</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crea regole dinamiche basate su settore, score, tecnologie web e consensi privacy per profilare i lead.
              </p>
              <div className="pt-2">
                <Link href="/crm/marketing/segments">
                  <Button variant="outline" size="sm" className="text-xs border-slate-700">
                    Configura Segmento &rarr;
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segments.map((s) => (
                <Card key={s.id} className="bg-slate-950 border-slate-800 p-5 space-y-4 hover:border-purple-900/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{s.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium uppercase">
                          Target: {s.targetType}
                        </span>
                      </div>
                      {s.description && <p className="text-xs text-slate-400 mt-1">{s.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block">Audience Stimata</span>
                      <span className="text-lg font-mono font-extrabold text-emerald-400">
                        {s.estimatedCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Explainability Summary Box */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Regole Applicate (Spiegazione Naturale)
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      {s.naturalLanguageSummary || 'Nessun criterio specifico impostato'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <span>Creato il {new Date(s.createdAt).toLocaleDateString('it-IT')}</span>
                    <Link
                      href={`/crm/marketing/campaigns?createWithSegment=${s.id}`}
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium hover:underline"
                    >
                      <span>Crea Campagna con questo Segmento &rarr;</span>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS & DISTRIBUTION */}
      {activeTab === 'analytics' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-purple-400" />
              Distribuzione Campagne per Canale
            </h3>
            <div className="space-y-3 text-xs">
              {Object.entries(stats.channelDistribution || {}).map(([chan, count]: [string, any]) => (
                <div key={chan} className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span className="capitalize">{chan.replace('_', ' ')}</span>
                    <span className="font-mono">{count} campagne</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{
                        width: `${stats.totalCampaigns > 0 ? (count / stats.totalCampaigns) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Stato dei Destinatari in Pipeline
            </h3>
            <div className="space-y-3 text-xs">
              {Object.entries(stats.recipientsByStatus || {}).map(([st, count]: [string, any]) => (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span className="capitalize">{st.replace(/_/g, ' ')}</span>
                    <span className="font-mono">{count} destinatari</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${stats.totalRecipients > 0 ? (count / stats.totalRecipients) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
