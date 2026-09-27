'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  Megaphone,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Mail,
  Phone,
  MessageSquare,
  Copy,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Edit2,
  Save,
  Ban,
  AlertCircle,
  Eye,
  TrendingUp,
  Check,
} from 'lucide-react';

export default function CampaignStudioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [campaign, setCampaign] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string } | null>(null);

  // Content Editing State
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentSubject, setContentSubject] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);

  // Governance action states
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPopulatingRecipients, setIsPopulatingRecipients] = useState(false);

  // Recipient Status Update Modal
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [recipientStatusToSet, setRecipientStatusToSet] = useState<string>('contacted');
  const [recipientNotes, setRecipientNotes] = useState('');
  const [isUpdatingRecipient, setIsUpdatingRecipient] = useState(false);

  // Preview variable rendering
  const [previewRecipientId, setPreviewRecipientId] = useState<string | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      const [campRes, userRes] = await Promise.all([
        fetch(`/api/marketing/campaigns/${id}`),
        fetch('/api/auth/me').catch(() => null),
      ]);

      if (campRes.ok) {
        const data = await campRes.json();
        setCampaign(data.campaign);
        setContentSubject(data.campaign.contentSubject || '');
        setContentBody(data.campaign.contentBody || '');
      }

      if (userRes && userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.user);
      }
    } catch (err) {
      console.error('Failed to load campaign studio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const handleSaveContent = async () => {
    setIsSavingContent(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentSubject: contentSubject.trim() || undefined,
          contentBody: contentBody || undefined,
        }),
      });

      if (res.ok) {
        alert('Bozza contenuti salvata con successo!');
        setIsEditingContent(false);
        fetchCampaignData();
      } else {
        const err = await res.json();
        alert(err.error || 'Errore durante il salvataggio');
      }
    } catch (err) {
      console.error('Failed to update content:', err);
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!confirm('Inviare questa campagna per la revisione e approvazione da parte di un Amministratore?')) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}/submit-review`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('Campagna inviata in revisione!');
        fetchCampaignData();
      } else {
        const err = await res.json();
        alert(err.error || 'Errore');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleApproveCampaign = async () => {
    if (!confirm('Confermi l\'approvazione formale di questa campagna per l\'avvio operativo?')) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('Campagna approvata con successo!');
        fetchCampaignData();
      } else {
        const err = await res.json();
        alert(err.error || 'Errore durante l\'approvazione');
      }
    } catch (err) {
      console.error('Failed to approve campaign:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handlePopulateRecipients = async () => {
    setIsPopulatingRecipients(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}/populate-recipients`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Destinatari aggiornati: ${data.populatedCount} record caricati dal segmento!`);
        fetchCampaignData();
      } else {
        const err = await res.json();
        alert(err.error || 'Errore durante il popolamento');
      }
    } catch (err) {
      console.error('Failed to populate recipients:', err);
    } finally {
      setIsPopulatingRecipients(false);
    }
  };

  const handleUpdateRecipientStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient) return;

    setIsUpdatingRecipient(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}/recipients/${selectedRecipient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: recipientStatusToSet,
          outcomeNotes: recipientNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSelectedRecipient(null);
        fetchCampaignData();
      } else {
        const err = await res.json();
        alert(err.error || 'Errore');
      }
    } catch (err) {
      console.error('Failed to update recipient:', err);
    } finally {
      setIsUpdatingRecipient(false);
    }
  };

  const copyVariable = (varName: string) => {
    navigator.clipboard.writeText(varName);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Render preview text with replaced variables
  const renderMessagePreview = () => {
    if (!campaign) return { subject: '', body: '' };

    const selected = campaign.recipients?.find((r: any) => r.id === previewRecipientId) || campaign.recipients?.[0];
    let snapshot: any = {};
    if (selected && selected.customVariablesSnapshotJson) {
      try {
        snapshot = JSON.parse(selected.customVariablesSnapshotJson);
      } catch {}
    }

    const companyName = snapshot.companyName || selected?.contactPersonName || 'Azienda Esempio Srl';
    const contactName = selected?.contactPersonName || 'Gentile Titolare';
    const city = snapshot.city || 'Napoli';
    const sector = snapshot.sector || 'Ristoranti';

    let subj = contentSubject || campaign.contentSubject || '(Nessun oggetto specificato)';
    let body = contentBody || campaign.contentBody || '(Nessun corpo del messaggio inserito)';

    subj = subj
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{contactName\}\}/g, contactName)
      .replace(/\{\{city\}\}/g, city)
      .replace(/\{\{sector\}\}/g, sector);

    body = body
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{contactName\}\}/g, contactName)
      .replace(/\{\{city\}\}/g, city)
      .replace(/\{\{sector\}\}/g, sector);

    return { subject: subj, body, previewTarget: selected };
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
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  if (isLoading) {
    return <div className="py-24 text-center text-slate-500 text-sm">Caricamento Campaign Studio...</div>;
  }

  if (!campaign) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-base text-rose-400 font-semibold">Campagna non trovata</p>
        <Link href="/crm/marketing/campaigns">
          <Button variant="outline" size="sm" className="text-xs">
            Torna alle Campagne
          </Button>
        </Link>
      </div>
    );
  }

  const { subject: previewSubj, body: previewMsgBody, previewTarget } = renderMessagePreview();

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/crm/marketing/campaigns"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Torna alle campagne</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-purple-400" />
              {campaign.name}
            </h1>
            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2.5 py-0.5 rounded-md">
              {campaign.code}
            </span>
            {getStatusBadge(campaign.status)}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
            <span className="capitalize">Obiettivo: {campaign.objective?.replace('_', ' ')}</span>
            <span>•</span>
            <span className="capitalize">Canale: {campaign.channel}</span>
            <span>•</span>
            <span>Responsabile: {campaign.owner?.name || 'Operatore'}</span>
            {campaign.approvedByUserId && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approvata da {campaign.approver?.name || 'Admin'} il{' '}
                  {new Date(campaign.approvedAt).toLocaleDateString('it-IT')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Governance Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {campaign.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubmitForReview}
              isLoading={isSubmittingReview}
              className="gap-1.5 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/30"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Invia per Revisione</span>
            </Button>
          )}

          {campaign.status === 'in_review' && (
            <>
              {currentUser?.role === 'admin' ? (
                <Button
                  variant="glow"
                  size="sm"
                  onClick={handleApproveCampaign}
                  isLoading={isApproving}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Approva Campagna (Admin)</span>
                </Button>
              ) : (
                <Badge variant="outline" className="bg-amber-950/50 text-amber-300 border-amber-800/50 text-xs py-1 px-3">
                  In attesa di approvazione da un Amministratore
                </Badge>
              )}
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePopulateRecipients}
            isLoading={isPopulatingRecipients}
            className="gap-1.5 text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
            <span>Sincronizza Segmento</span>
          </Button>
        </div>
      </div>

      {/* Recipient KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-medium block">Totale Arruolati</span>
          <span className="text-xl font-extrabold font-mono text-white">
            {campaign.totalRecipients || 0}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-medium block">In Coda / Bozza</span>
          <span className="text-xl font-extrabold font-mono text-amber-400">
            {campaign.statusCounts?.pending || 0}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-medium block">Contattati</span>
          <span className="text-xl font-extrabold font-mono text-blue-400">
            {campaign.statusCounts?.contacted || 0}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-medium block">Interessati</span>
          <span className="text-xl font-extrabold font-mono text-emerald-400">
            {campaign.statusCounts?.interested || 0}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-medium block">Convertiti (Clienti)</span>
          <span className="text-xl font-extrabold font-mono text-emerald-300">
            {campaign.statusCounts?.converted || 0}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-slate-400 font-medium block">Esclusi (Privacy)</span>
          <span className="text-xl font-extrabold font-mono text-rose-400">
            {campaign.statusCounts?.excluded_no_consent || 0}
          </span>
        </div>
      </div>

      {/* Grid: Studio Editor & Dynamic Template (Left) and Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TEMPLATE & CONTENT STUDIO */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Template & Contenuti di Outreach
              </h2>
              {!isEditingContent ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingContent(true)}
                  className="gap-1.5 text-xs border-slate-700 text-slate-300"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Modifica Testo</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingContent(false)}
                    className="text-xs"
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="glow"
                    size="sm"
                    onClick={handleSaveContent}
                    isLoading={isSavingContent}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Salva</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Variable Insertion Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Variabili Dinamiche Disponibili (Clicca per copiare):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{{companyName}}', label: 'Nome Azienda' },
                  { tag: '{{contactName}}', label: 'Nome Referente' },
                  { tag: '{{city}}', label: 'Città' },
                  { tag: '{{sector}}', label: 'Settore' },
                  { tag: '{{score}}', label: 'Score Commerciale' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => copyVariable(item.tag)}
                    className="px-2 py-1 rounded bg-slate-900 border border-purple-900/50 hover:border-purple-500 text-[11px] font-mono text-purple-300 transition-colors flex items-center gap-1"
                  >
                    <span>{item.tag}</span>
                    {copiedVar === item.tag ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs pt-2">
              <div className="space-y-1">
                <label className="font-medium text-slate-300 block">Oggetto / Titolo</label>
                {isEditingContent ? (
                  <input
                    type="text"
                    value={contentSubject}
                    onChange={(e) => setContentSubject(e.target.value)}
                    placeholder="Oggetto dell'email o del messaggio"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 font-mono">
                    {campaign.contentSubject || '(Nessun oggetto specificato)'}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300 block">Corpo del Messaggio</label>
                {isEditingContent ? (
                  <textarea
                    rows={8}
                    value={contentBody}
                    onChange={(e) => setContentBody(e.target.value)}
                    placeholder="Scrivi qui il corpo del messaggio outreach..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-white font-mono placeholder:text-slate-500 focus:border-purple-500 focus:outline-none leading-relaxed"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {campaign.contentBody || '(Nessun corpo del messaggio inserito)'}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* LIVE RENDERED PREVIEW */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                Anteprima Dinamica con Dati Reali
              </h2>
              {campaign.recipients?.length > 0 && (
                <select
                  value={previewRecipientId || ''}
                  onChange={(e) => setPreviewRecipientId(e.target.value)}
                  className="rounded bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs text-white focus:outline-none max-w-[200px]"
                >
                  {campaign.recipients.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.contactPersonName || r.recipientEmail || 'Destinatario'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Oggetto Renderizzato:</span>
                <p className="font-semibold text-white">{previewSubj}</p>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Messaggio Renderizzato:</span>
                <p className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                  {previewMsgBody}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                <span>
                  Le variabili vengono sostituite al volo in base all&apos;anagrafica del destinatario selezionato.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* RECIPIENTS MANAGEMENT SECTION */}
      <Card className="bg-slate-950 border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Destinatari della Campagna & Tracciamento Esito
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestisci lo stato di contatto per ciascun lead/azienda e registra note di qualifica
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {campaign.recipients?.length || 0} destinatari in lista
          </span>
        </div>

        {campaign.recipients?.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Users className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">Nessun destinatario associato</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Clicca su &ldquo;Sincronizza Segmento&rdquo; per caricare automaticamente i record eleggibili.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePopulateRecipients}
                className="text-xs border-slate-700"
              >
                Popola da Segmento
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Destinatario / Azienda</th>
                  <th className="py-3 px-3">Canale & Contatto</th>
                  <th className="py-3 px-3">Stato Outreach</th>
                  <th className="py-3 px-3">Ultimo Contatto</th>
                  <th className="py-3 px-3">Note Esito</th>
                  <th className="py-3 px-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {campaign.recipients.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{r.contactPersonName || 'Azienda'}</div>
                      <div className="text-[10px] text-slate-400">
                        {r.leadId ? (
                          <Link href={`/crm/leads/${r.leadId}`} className="text-blue-400 hover:underline inline-flex items-center gap-1">
                            <span>Vedi Scheda Lead</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        ) : r.companyId ? (
                          <Link href={`/crm/companies/${r.companyId}`} className="text-blue-400 hover:underline inline-flex items-center gap-1">
                            <span>Vedi Scheda Azienda</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-300">{r.recipientEmail || '-'}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.recipientPhone || ''}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium ${
                          r.status === 'contacted'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : r.status === 'replied'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : r.status === 'interested'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                            : r.status === 'converted'
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : r.status === 'excluded_no_consent'
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                            : r.status === 'excluded_missing_contact'
                            ? 'bg-slate-800 text-amber-300 border border-amber-800/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {r.lastContactedAt ? new Date(r.lastContactedAt).toLocaleDateString('it-IT') : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {r.outcomeNotes || <span className="text-slate-600 italic">Nessuna nota</span>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRecipient(r);
                          setRecipientStatusToSet(r.status);
                          setRecipientNotes(r.outcomeNotes || '');
                        }}
                        className="text-[11px] border-slate-700 py-1 px-2.5 hover:bg-slate-800 text-slate-200"
                      >
                        Aggiorna Esito
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* UPDATE RECIPIENT STATUS MODAL */}
      <Dialog
        isOpen={Boolean(selectedRecipient)}
        onClose={() => setSelectedRecipient(null)}
        title={`Aggiorna Stato Contatto: ${selectedRecipient?.contactPersonName || 'Destinatario'}`}
      >
        <form onSubmit={handleUpdateRecipientStatus} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-slate-300 block">Nuovo Stato Destinatario</label>
            <select
              value={recipientStatusToSet}
              onChange={(e) => setRecipientStatusToSet(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white focus:border-purple-500 focus:outline-none text-xs"
            >
              <option value="pending">In Coda / Non ancora contattato</option>
              <option value="contacted">Contattato (Email / Chiamata inviata)</option>
              <option value="replied">Risposta Ricevuta</option>
              <option value="interested">Interessato (In Trattativa)</option>
              <option value="converted">Convertito (Cliente Confermato)</option>
              <option value="not_interested">Non Interessato</option>
              <option value="bounced">Non Raggiungibile (Bounce / Numero errato)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-300 block">Note di Esito / Feedback Raccolto</label>
            <textarea
              rows={4}
              value={recipientNotes}
              onChange={(e) => setRecipientNotes(e.target.value)}
              placeholder="Es. Richiesta demo giovedì ore 15:00 con il titolare..."
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedRecipient(null)}
              className="text-xs"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="glow"
              isLoading={isUpdatingRecipient}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white"
            >
              Salva Esito
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
