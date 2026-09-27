'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Key,
  Server,
  BarChart3,
  Search,
  Megaphone,
  Share2,
  Copy,
  Check,
  Plus,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Info,
  Calendar,
  Lock,
} from 'lucide-react';

interface ProjectAccessesTabProps {
  projectId?: string;
  companyId: string;
  isManagerOrEditor: boolean;
  currentUserRole?: string;
}

const PLATFORM_CATEGORIES: Record<string, { label: string; group: string; icon: any }> = {
  dns_registrar: { label: 'DNS Registrar / Dominio', group: 'web', icon: Globe },
  hosting_server: { label: 'Hosting / Server Web', group: 'web', icon: Server },
  cms_wordpress: { label: 'CMS (WordPress / Altro)', group: 'web', icon: Globe },
  google_analytics_4: { label: 'Google Analytics 4 (GA4)', group: 'analytics', icon: BarChart3 },
  google_search_console: { label: 'Google Search Console', group: 'analytics', icon: Search },
  google_tag_manager: { label: 'Google Tag Manager (GTM)', group: 'analytics', icon: BarChart3 },
  google_ads_account: { label: 'Google Ads (MCC)', group: 'ads', icon: Megaphone },
  google_business_profile: { label: 'Google Business Profile (Maps)', group: 'ads', icon: Search },
  meta_business_manager: { label: 'Meta Business Manager', group: 'ads', icon: Share2 },
  meta_pixel_dataset: { label: 'Meta Pixel / Dataset', group: 'analytics', icon: BarChart3 },
  meta_facebook_page: { label: 'Pagina Facebook', group: 'ads', icon: Share2 },
  meta_instagram_business: { label: 'Instagram Business', group: 'ads', icon: Share2 },
  booking_engine_tour: { label: 'Motore Booking / Tour', group: 'booking', icon: Calendar },
  other_custom: { label: 'Altro Servizio / Portale', group: 'other', icon: Key },
};

const ACCESS_METHOD_LABELS: Record<string, string> = {
  agency_mcc_partner: 'Delega MCC / Business Manager Agenzia',
  delegated_agency_email: 'Invito su Email Delegata Agenzia',
  service_account_readonly: 'Service Account / API Read-Only',
  partner_business_manager: 'Partner Meta Business Manager',
  manual_shared_access: 'Accesso Condiviso Manuale',
  other: 'Altro Metodo Sicuro',
};

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  not_requested: { label: 'Non Richiesto', variant: 'secondary' },
  requested: { label: 'Richiesta Inviata', variant: 'warning' },
  declared_by_client: { label: 'Dichiarato dal Cliente (Da Verificare)', variant: 'warning' },
  verified_active: { label: 'Attivo & Verificato', variant: 'success' },
  revoked: { label: 'Revocato', variant: 'destructive' },
  expired: { label: 'Scaduto', variant: 'destructive' },
};

export function ProjectAccessesTab({
  projectId,
  companyId,
  isManagerOrEditor,
  currentUserRole,
}: ProjectAccessesTabProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [accountForm, setAccountForm] = useState({
    platformType: 'google_analytics_4',
    accountName: '',
    externalId: '',
    externalUrl: '',
    accessMethod: 'agency_mcc_partner',
    accessLevel: 'standard_edit',
    delegatedToIdentifier: '',
    status: 'requested',
    notes: '',
  });

  const [verifyForm, setVerifyForm] = useState({
    verificationMethod: 'Invito MCC / Partner accettato e visibile nel pannello agenzia',
    verificationNotes: '',
  });

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const url = projectId
        ? `/api/projects/${projectId}/accounts?t=${Date.now()}`
        : `/api/companies/${companyId}/accounts?t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [projectId, companyId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accountForm,
          projectId, // Automatically link to current project
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la creazione dell\'account');

      setIsNewAccountModalOpen(false);
      setAccountForm({
        platformType: 'google_analytics_4',
        accountName: '',
        externalId: '',
        externalUrl: '',
        accessMethod: 'agency_mcc_partner',
        accessLevel: 'standard_edit',
        delegatedToIdentifier: '',
        status: 'requested',
        notes: '',
      });
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/accounts/${selectedAccount.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la verifica dell\'account');

      setIsVerifyModalOpen(false);
      setSelectedAccount(null);
      setVerifyForm({
        verificationMethod: 'Invito MCC / Partner accettato e visibile nel pannello agenzia',
        verificationNotes: '',
      });
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProjectLink = async (account: any) => {
    try {
      if (account.isLinkedToProject) {
        // Unlink
        await fetch(`/api/projects/${projectId}/accounts/link`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id }),
        });
      } else {
        // Link
        await fetch(`/api/projects/${projectId}/accounts/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id }),
        });
      }
      fetchAccounts();
    } catch (err) {
      console.error('Error toggling project link:', err);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo account dal registro aziendale?')) return;
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const config = PLATFORM_CATEGORIES[acc.platformType] || { group: 'other' };
    if (filterGroup !== 'all' && config.group !== filterGroup) return false;
    if (filterStatus !== 'all' && acc.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Security Callout Banner */}
      <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <div className="font-semibold text-blue-200">
            Politica di Sicurezza e Zero-Password
          </div>
          <div className="text-blue-300/80 mt-0.5">
            Questo registro memorizza esclusivamente <strong>ID tecnici pubblici</strong> (es. Google Ads CID, GA4 Measurement ID, Meta Pixel ID) e lo <strong>stato delle deleghe ufficiali</strong>. Nessuna password, chiave API privata o token viene salvato nel CRM.
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="w-44 text-sm"
          >
            <option value="all">Tutte le Piattaforme</option>
            <option value="web">Web & DNS</option>
            <option value="analytics">Analytics & Tracciamenti</option>
            <option value="ads">Google & Meta Ads</option>
            <option value="booking">Booking & Portali</option>
            <option value="other">Altri Servizi</option>
          </Select>

          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-48 text-sm"
          >
            <option value="all">Tutti gli Stati</option>
            <option value="verified_active">Attivi & Verificati</option>
            <option value="declared_by_client">Dichiarati dal Cliente</option>
            <option value="requested">Richiesta Inviata</option>
            <option value="not_requested">Non Richiesti</option>
            <option value="revoked">Revocati / Scaduti</option>
          </Select>
        </div>

        {isManagerOrEditor && (
          <Button
            onClick={() => setIsNewAccountModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Censisci Account / Delega
          </Button>
        )}
      </div>

      {/* Accounts List Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">
          Caricamento registro deleghe e account...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 text-center py-12">
          <CardContent className="space-y-3">
            <Globe className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-zinc-300 font-medium">Nessun account censito</div>
            <p className="text-zinc-500 text-sm max-w-md mx-auto">
              Gli account possono essere censiti manualmente o generati automaticamente all'approvazione delle richieste di onboarding del cliente.
            </p>
            {isManagerOrEditor && (
              <Button
                onClick={() => setIsNewAccountModalOpen(true)}
                variant="outline"
                className="mt-2 text-zinc-300 border-zinc-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi il Primo Account
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAccounts.map((account) => {
            const config = PLATFORM_CATEGORIES[account.platformType] || {
              label: account.platformType,
              icon: Key,
            };
            const Icon = config.icon;
            const badge = STATUS_BADGES[account.status] || {
              label: account.status,
              variant: 'secondary',
            };

            return (
              <Card
                key={account.id}
                className={`border transition-all ${
                  account.status === 'verified_active'
                    ? 'bg-zinc-900/80 border-emerald-900/40'
                    : account.status === 'declared_by_client'
                    ? 'bg-zinc-900/80 border-amber-900/40'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                          {account.accountName}
                        </CardTitle>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {config.label}
                        </div>
                      </div>
                    </div>
                    <Badge variant={badge.variant} className="text-xs">
                      {badge.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* External ID / Value */}
                  {account.externalId ? (
                    <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800 flex items-center justify-between gap-2">
                      <div className="text-xs font-mono text-zinc-300 truncate">
                        {account.externalId}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(account.externalId, account.id)}
                        className="h-7 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                        title="Copia ID"
                      >
                        {copiedId === account.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">
                      Nessun identificatore esterno registrato
                    </div>
                  )}

                  {/* Badges & Meta */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                      Metodo: {ACCESS_METHOD_LABELS[account.accessMethod] || account.accessMethod}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                      Permesso: {account.accessLevel}
                    </span>
                  </div>

                  {/* Verification Box */}
                  {account.status === 'verified_active' ? (
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verificato da {account.verifierName || 'Operatore'} il{' '}
                        {new Date(account.verifiedAt).toLocaleDateString('it-IT')}
                      </div>
                      {account.verificationMethod && (
                        <div className="text-zinc-400">
                          Metodo: {account.verificationMethod}
                        </div>
                      )}
                      {account.verificationNotes && (
                        <div className="text-zinc-500 italic">
                          "{account.verificationNotes}"
                        </div>
                      )}
                    </div>
                  ) : account.status === 'declared_by_client' ? (
                    <div className="p-2.5 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Accesso dichiarato dal cliente — Richiede verifica reale
                      </div>
                      {isManagerOrEditor && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account);
                            setIsVerifyModalOpen(true);
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs font-medium"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                          Verifica e Attiva Accesso
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {/* Notes */}
                  {account.notes && (
                    <div className="text-xs text-zinc-400 pt-1 border-t border-zinc-800/60 line-clamp-2">
                      {account.notes}
                    </div>
                  )}

                  {/* Project Link & Actions Footer */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleProjectLink(account)}
                        className={`h-7 px-2.5 text-xs ${
                          account.isLinkedToProject
                            ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                        title={
                          account.isLinkedToProject
                            ? 'Account collegato al progetto. Clicca per scollegare.'
                            : 'Clicca per collegare questo account al progetto'
                        }
                      >
                        {account.isLinkedToProject ? (
                          <>
                            <LinkIcon className="w-3.5 h-3.5 mr-1" />
                            Collegato al Progetto
                          </>
                        ) : (
                          <>
                            <Unlink className="w-3.5 h-3.5 mr-1" />
                            Non Collegato
                          </>
                        )}
                      </Button>
                    </div>

                    {isManagerOrEditor && (
                      <div className="flex items-center gap-1">
                        {account.status !== 'verified_active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAccount(account);
                              setIsVerifyModalOpen(true);
                            }}
                            className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
                            title="Verifica Accesso"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            title="Elimina dal Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Nuovo Account */}
      <Dialog
        isOpen={isNewAccountModalOpen}
        onClose={() => setIsNewAccountModalOpen(false)}
        title="Censisci Nuovo Account / Delega Digitale"
        className="max-w-lg"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Tipo di Piattaforma *</label>
            <Select
              value={accountForm.platformType}
              onChange={(e) => setAccountForm({ ...accountForm, platformType: e.target.value })}
              className="w-full text-sm"
              required
            >
              {Object.entries(PLATFORM_CATEGORIES).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Nome Identificativo *</label>
            <Input
              value={accountForm.accountName}
              onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
              placeholder="es. Google Ads JammJa (Search & PMax)"
              required
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">ID Pubblico / CID</label>
              <Input
                value={accountForm.externalId}
                onChange={(e) => setAccountForm({ ...accountForm, externalId: e.target.value })}
                placeholder="es. 123-456-7890 o G-XXXXXX"
                className="text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Livello Permessi</label>
              <Select
                value={accountForm.accessLevel}
                onChange={(e) => setAccountForm({ ...accountForm, accessLevel: e.target.value })}
                className="w-full text-sm"
              >
                <option value="admin">Amministratore</option>
                <option value="standard_edit">Editor / Standard</option>
                <option value="read_only_analytics">Sola Lettura / Analisi</option>
                <option value="finance_only">Solo Fatturazione</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Metodo di Accesso</label>
            <Select
              value={accountForm.accessMethod}
              onChange={(e) => setAccountForm({ ...accountForm, accessMethod: e.target.value })}
              className="w-full text-sm"
            >
              {Object.entries(ACCESS_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Stato Iniziale</label>
            <Select
              value={accountForm.status}
              onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}
              className="w-full text-sm"
            >
              <option value="requested">Richiesta Inviata al Cliente</option>
              <option value="declared_by_client">Dichiarato dal Cliente (Da Verificare)</option>
              <option value="not_requested">Non Richiesto / Informativo</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Note Operative & Riferimenti</label>
            <textarea
              value={accountForm.notes}
              onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
              rows={2}
              placeholder="Note non sensibili..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewAccountModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Salvataggio...' : 'Censisci Account'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Verifica Accesso Operatore */}
      <Dialog
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verifica Accesso Operatore & Attivazione"
        className="max-w-md"
      >
        <form onSubmit={handleVerifyAccount} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/60 text-xs space-y-1">
            <div className="font-semibold text-zinc-200">
              Account da verificare:
            </div>
            <div className="text-zinc-300 font-medium">
              {selectedAccount?.accountName} ({selectedAccount?.externalId || 'Nessun ID'})
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Metodo di Verifica *</label>
            <Select
              value={verifyForm.verificationMethod}
              onChange={(e) => setVerifyForm({ ...verifyForm, verificationMethod: e.target.value })}
              className="w-full text-sm"
              required
            >
              <option value="Invito MCC Google Ads accettato e visibile nel pannello agenzia">
                Invito MCC Google Ads accettato nel pannello agenzia
              </option>
              <option value="Ping GA4 / Eventi in tempo reale rilevati nel Measurement ID">
                Ping GA4 / Eventi in tempo reale rilevati nel Measurement ID
              </option>
              <option value="Proprietà Google Search Console confermata via DNS TXT">
                Proprietà Search Console confermata via DNS TXT
              </option>
              <option value="Partner Meta Business Manager confermato e asset assegnati">
                Partner Meta Business Manager confermato e asset assegnati
              </option>
              <option value="Accesso hosting / DNS effettuato e convalidato con successo">
                Accesso hosting / DNS effettuato e convalidato
              </option>
              <option value="Altro controllo tecnico eseguito con successo">
                Altro controllo tecnico eseguito con successo
              </option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Evidenza e Note di Verifica (Non Sensibili)</label>
            <textarea
              value={verifyForm.verificationNotes}
              onChange={(e) => setVerifyForm({ ...verifyForm, verificationNotes: e.target.value })}
              rows={2}
              placeholder="es. Account CID 123-456-7890 visibile sotto MCC, campagne pronte per configurazione..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="p-2.5 bg-blue-950/40 border border-blue-900/50 rounded-lg text-xs text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span>
              Confermando, il tuo ID utente e la data/ora attuale verranno registrati in modo immutabile come evidenza di verifica operativa.
            </span>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVerifyModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Verifica in corso...' : 'Conferma Accesso Verificato'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
