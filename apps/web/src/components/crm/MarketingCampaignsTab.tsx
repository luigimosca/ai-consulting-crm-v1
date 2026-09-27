'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Megaphone,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Ban,
  TrendingUp,
} from 'lucide-react';

interface CampaignHistoryRecord {
  recipientId: string;
  status: string;
  lastContactedAt: string | null;
  outcomeNotes: string | null;
  createdAt: string;
  campaignId: string;
  campaignCode: string;
  campaignName: string;
  campaignChannel: string;
  campaignObjective: string;
}

export function MarketingCampaignsTab({
  targetType,
  targetId,
  targetName,
}: {
  targetType: 'leads' | 'companies';
  targetId: string;
  targetName: string;
}) {
  const [history, setHistory] = useState<CampaignHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const endpoint =
          targetType === 'leads'
            ? `/api/leads/${targetId}/campaigns`
            : `/api/companies/${targetId}/campaigns`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to load campaign history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [targetType, targetId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> In Coda / Bozza
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Mail className="h-3 w-3" /> Contattato
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <MessageSquare className="h-3 w-3" /> Risposta Ricevuta
          </span>
        );
      case 'interested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            <TrendingUp className="h-3 w-3" /> Interessato
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold">
            <CheckCircle2 className="h-3 w-3" /> Convertito
          </span>
        );
      case 'not_interested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Non Interessato
          </span>
        );
      case 'excluded_no_consent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/40 text-rose-300 border border-rose-800/40">
            <Ban className="h-3 w-3" /> Escluso per Consenso Privacy
          </span>
        );
      case 'excluded_missing_contact':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-amber-300 border border-amber-800/30">
            <AlertCircle className="h-3 w-3" /> Contatto Assente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'email':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-blue-300">
            <Mail className="h-3 w-3" /> Email Outreach
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <MessageSquare className="h-3 w-3" /> WhatsApp
          </span>
        );
      case 'phone_outreach':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
            <Phone className="h-3 w-3" /> Telefono
          </span>
        );
      default:
        return <span className="text-[11px] text-slate-400 capitalize">{channel}</span>;
    }
  };

  return (
    <Card className="bg-slate-950 border-slate-800 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-purple-400" />
            Storico Campagne di Marketing & Outreach
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualizza tutte le campagne e iniziative in cui &ldquo;{targetName}&rdquo; è stato inserito come destinatario target.
          </p>
        </div>
        <Link href="/crm/marketing">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-950/30">
            <Megaphone className="h-3.5 w-3.5" />
            <span>Apri Marketing Hub</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Caricamento storico campagne in corso...</div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <Megaphone className="h-8 w-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">Nessuna campagna marketing collegata</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Questo record non fa ancora parte di alcuna campagna outbound attiva o conclusa.
          </p>
          <div className="pt-2">
            <Link href="/crm/marketing/segments">
              <Button variant="outline" size="sm" className="text-xs gap-1 border-slate-700">
                <span>Crea un Segmento Target</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Codice Campagna</th>
                <th className="py-3 px-3">Nome & Obiettivo</th>
                <th className="py-3 px-3">Canale</th>
                <th className="py-3 px-3">Stato Destinatario</th>
                <th className="py-3 px-3">Ultimo Contatto</th>
                <th className="py-3 px-3">Note Esito</th>
                <th className="py-3 px-3 text-right">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {history.map((record) => (
                <tr key={record.recipientId} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-blue-400">
                    {record.campaignCode}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">{record.campaignName}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{record.campaignObjective.replace('_', ' ')}</div>
                  </td>
                  <td className="py-3 px-3">{getChannelBadge(record.campaignChannel)}</td>
                  <td className="py-3 px-3">{getStatusBadge(record.status)}</td>
                  <td className="py-3 px-3 text-slate-400">
                    {record.lastContactedAt ? new Date(record.lastContactedAt).toLocaleDateString('it-IT') : '-'}
                  </td>
                  <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                    {record.outcomeNotes || <span className="text-slate-600 italic">Nessuna nota</span>}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/crm/marketing/campaigns/${record.campaignId}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 hover:underline"
                    >
                      <span>Vedi Campagna</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
