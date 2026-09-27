'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Building2,
  Sparkles,
  FileText,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  HelpCircle,
  Eye,
  Palette,
  Check,
  Globe,
  Mail,
  Phone,
  CreditCard,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface SettingsFormState {
  id: string;
  brandKey: string;
  legalName: string;
  legalForm: string;
  vatId: string;
  fiscalCode: string;
  legalAddress: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  adminEmail: string;
  phone: string;
  pec: string;
  sdiCode: string;
  brandName: string;
  tagline: string;
  description: string;
  logoDocumentId: string;
  logoDarkDocumentId: string;
  faviconDocumentId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  quoteHeaderNotes: string;
  quoteFooterText: string;
  quoteDefaultValidityDays: number;
  quoteDefaultTerms: string;
  quotePaymentInstructions: string;
  quoteContactBlockJson: string;
  quoteLogoChoice: 'primary' | 'dark' | 'none';
}

const INITIAL_FORM: SettingsFormState = {
  id: 'default',
  brandKey: 'default',
  legalName: '',
  legalForm: 'S.r.l.',
  vatId: '',
  fiscalCode: '',
  legalAddress: '',
  postalCode: '',
  city: '',
  province: '',
  country: 'IT',
  adminEmail: '',
  phone: '',
  pec: '',
  sdiCode: '',
  brandName: 'AI Consulting Suite',
  tagline: '',
  description: '',
  logoDocumentId: '',
  logoDarkDocumentId: '',
  faviconDocumentId: '',
  primaryColor: '#2563eb',
  secondaryColor: '#4f46e5',
  accentColor: '#06b6d4',
  quoteHeaderNotes: '',
  quoteFooterText: '',
  quoteDefaultValidityDays: 30,
  quoteDefaultTerms: '',
  quotePaymentInstructions: '',
  quoteContactBlockJson: '',
  quoteLogoChoice: 'primary',
};

export default function AdminSettingsPage() {
  const router = useRouter();

  // Auth & Access state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Settings state
  const [formData, setFormData] = useState<SettingsFormState>(INITIAL_FORM);
  const [baselineData, setBaselineData] = useState<SettingsFormState>(INITIAL_FORM);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'brand' | 'quotes'>('business');

  // Asset upload states
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Notifications & Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check auth and role
  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        const user = data.user || data;
        setCurrentUser(user);
        if (!user || user.role !== 'admin') {
          setIsUnauthorized(true);
        }
      } catch {
        router.push('/login');
      } finally {
        setIsAuthLoading(false);
      }
    }
    verifyAuth();
  }, [router]);

  // Load Settings
  const loadSettings = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch('/api/settings?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const loaded: SettingsFormState = {
            id: data.settings.id || 'default',
            brandKey: data.settings.brandKey || 'default',
            legalName: data.settings.legalName || '',
            legalForm: data.settings.legalForm || 'S.r.l.',
            vatId: data.settings.vatId || '',
            fiscalCode: data.settings.fiscalCode || '',
            legalAddress: data.settings.legalAddress || '',
            postalCode: data.settings.postalCode || '',
            city: data.settings.city || '',
            province: data.settings.province || '',
            country: data.settings.country || 'IT',
            adminEmail: data.settings.adminEmail || '',
            phone: data.settings.phone || '',
            pec: data.settings.pec || '',
            sdiCode: data.settings.sdiCode || '',
            brandName: data.settings.brandName || 'AI Consulting Suite',
            tagline: data.settings.tagline || '',
            description: data.settings.description || '',
            logoDocumentId: data.settings.logoDocumentId || '',
            logoDarkDocumentId: data.settings.logoDarkDocumentId || '',
            faviconDocumentId: data.settings.faviconDocumentId || '',
            primaryColor: data.settings.primaryColor || '#2563eb',
            secondaryColor: data.settings.secondaryColor || '#4f46e5',
            accentColor: data.settings.accentColor || '#06b6d4',
            quoteHeaderNotes: data.settings.quoteHeaderNotes || '',
            quoteFooterText: data.settings.quoteFooterText || '',
            quoteDefaultValidityDays: data.settings.quoteDefaultValidityDays ?? 30,
            quoteDefaultTerms: data.settings.quoteDefaultTerms || '',
            quotePaymentInstructions: data.settings.quotePaymentInstructions || '',
            quoteContactBlockJson: data.settings.quoteContactBlockJson || '',
            quoteLogoChoice: data.settings.quoteLogoChoice || 'primary',
          };
          setFormData(loaded);
          setBaselineData(loaded);
        }
      } else if (res.status === 403) {
        setIsUnauthorized(true);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Errore durante il caricamento delle impostazioni' });
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (!isUnauthorized && currentUser?.role === 'admin') {
      loadSettings();
    }
  }, [isUnauthorized, currentUser]);

  // Dirty state calculation
  const isDirty = JSON.stringify(formData) !== JSON.stringify(baselineData);

  // Field change handler
  const handleChange = (field: keyof SettingsFormState, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Revert changes
  const handleReset = () => {
    setFormData(baselineData);
    setFeedback(null);
  };

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBaselineData(formData);
        setFeedback({ type: 'success', message: 'Impostazioni salvate con successo!' });
      } else {
        const errMsg = data.details ? data.details.join(', ') : data.error || 'Errore durante il salvataggio';
        setFeedback({ type: 'error', message: errMsg });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Errore di connessione' });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Asset (Logo, Logo Dark, Favicon)
  const handleAssetUpload = async (assetType: 'logo' | 'logoDark' | 'favicon', file: File) => {
    setUploadingAsset(assetType);
    setFeedback(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('assetType', assetType);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (res.ok && data.success && data.documentId) {
        if (assetType === 'logo') handleChange('logoDocumentId', data.documentId);
        if (assetType === 'logoDark') handleChange('logoDarkDocumentId', data.documentId);
        if (assetType === 'favicon') handleChange('faviconDocumentId', data.documentId);

        setFeedback({ type: 'success', message: `File caricato con successo (${file.name})` });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Errore durante il caricamento del file' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Errore di caricamento' });
    } finally {
      setUploadingAsset(null);
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    window.open('/api/settings/backup', '_blank');
  };

  // Format validation helpers
  const getVatStatus = (vat: string) => {
    if (!vat) return null;
    const clean = vat.replace(/\s+/g, '').toUpperCase();
    if (/^IT\d{11}$/.test(clean) || /^\d{11}$/.test(clean)) {
      return { valid: true, text: 'Formato Partita IVA italiana valido (11 cifre)' };
    }
    if (/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(clean)) {
      return { valid: true, text: 'Formato Partita IVA comunitaria EU valido' };
    }
    return { valid: false, text: 'Formato Partita IVA non standard (richieste 11 cifre per IT o prefisso EU)' };
  };

  const getFiscalCodeStatus = (cf: string) => {
    if (!cf) return null;
    const clean = cf.replace(/\s+/g, '').toUpperCase();
    if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(clean)) {
      return { valid: true, text: 'Formato Codice Fiscale persona fisica valido (16 caratteri)' };
    }
    if (/^\d{11}$/.test(clean)) {
      return { valid: true, text: 'Codice Fiscale numerico persona giuridica (11 cifre)' };
    }
    return { valid: false, text: 'Formato non standard (richiesti 16 caratteri alfanumerici o 11 cifre)' };
  };

  const getSdiStatus = (sdi: string) => {
    if (!sdi) return null;
    const clean = sdi.trim().toUpperCase();
    if (clean === '0000000') {
      return { valid: true, text: 'Codice generico 0000000 (recapito via PEC o estero)' };
    }
    if (/^[A-Z0-9]{7}$/.test(clean)) {
      return { valid: true, text: 'Codice Destinatario SDI standard (7 caratteri alfanumerici)' };
    }
    return { valid: false, text: 'Il Codice SDI deve essere composto da 7 caratteri alfanumerici' };
  };

  const getPecStatus = (pec: string) => {
    if (!pec) return null;
    const clean = pec.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return { valid: true, text: 'Formato indirizzo PEC valido' };
    }
    return { valid: false, text: 'Formato email PEC non valido' };
  };

  if (isAuthLoading || (isDataLoading && !isUnauthorized)) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-400">Caricamento impostazioni e brand...</p>
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="h-12 w-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Accesso Riservato agli Amministratori</h2>
        <p className="text-sm text-slate-400">
          La gestione delle impostazioni aziendali, dei dati fiscali e del brand è accessibile solo agli utenti con ruolo
          Amministratore.
        </p>
        <Button onClick={() => router.push('/crm')} variant="outline" className="mt-4">
          Torna alla Dashboard
        </Button>
      </div>
    );
  }

  // Active logo ID for preview
  const previewLogoId =
    formData.quoteLogoChoice === 'dark'
      ? formData.logoDarkDocumentId
      : formData.quoteLogoChoice === 'primary'
      ? formData.logoDocumentId
      : null;

  const vatStatus = getVatStatus(formData.vatId);
  const cfStatus = getFiscalCodeStatus(formData.fiscalCode);
  const sdiStatus = getSdiStatus(formData.sdiCode);
  const pecStatus = getPecStatus(formData.pec);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Impostazioni & Identità Brand</h1>
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                  Modifiche non salvate
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configura i dati fiscali, legali, l&apos;identità visiva e i parametri standard per i preventivi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            className="gap-2 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            title="Esporta backup configurazione JSON"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Esporta Backup JSON</span>
          </Button>

          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="gap-1.5 text-xs text-slate-400 hover:text-slate-200 border-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Annulla</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="gap-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-500/20"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in duration-200',
            feedback.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
            activeTab === 'business'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          )}
        >
          <Building2 className="h-4 w-4" />
          <span>Dati Attività & Fiscali</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('brand')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
            activeTab === 'brand'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span>Brand & Identità Visiva</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quotes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
            activeTab === 'quotes'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          )}
        >
          <FileText className="h-4 w-4" />
          <span>Preventivi & Documenti</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Tab Panels (Left 7 cols or full) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: DATI ATTIVITÀ & FISCALI */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              {/* Societari / Identità Legale */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    <span>Dati Aziendali & Societari</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Ragione Sociale / Denominazione Legale"
                        value={formData.legalName}
                        onChange={(e) => handleChange('legalName', e.target.value)}
                        placeholder="es. AI Agency Consulting"
                        helperText="Nome formale dell'entità giuridica (separato dal Brand)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Forma Giuridica</label>
                      <select
                        value={formData.legalForm}
                        onChange={(e) => handleChange('legalForm', e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="S.r.l.">S.r.l.</option>
                        <option value="S.r.l.s.">S.r.l.s.</option>
                        <option value="S.p.A.">S.p.A.</option>
                        <option value="S.a.p.a.">S.a.p.a.</option>
                        <option value="S.n.c.">S.n.c.</option>
                        <option value="S.a.s.">S.a.s.</option>
                        <option value="Ditta Individuale">Ditta Individuale</option>
                        <option value="Libero Professionista">Libero Professionista</option>
                        <option value="Società Cooperativa">Società Cooperativa</option>
                        <option value="Altro">Altro / Estero</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dati Fiscali & Fatturazione */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-purple-400" />
                    <span>Dati Fiscali & Fatturazione Elettronica</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Partita IVA"
                        value={formData.vatId}
                        onChange={(e) => handleChange('vatId', e.target.value.toUpperCase())}
                        placeholder="es. IT09876543210 o 09876543210"
                      />
                      {vatStatus && (
                        <p
                          className={cn(
                            'text-[11px] mt-1 flex items-center gap-1',
                            vatStatus.valid ? 'text-emerald-400' : 'text-amber-400'
                          )}
                        >
                          {vatStatus.valid ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          )}
                          <span>{vatStatus.text}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Input
                        label="Codice Fiscale"
                        value={formData.fiscalCode}
                        onChange={(e) => handleChange('fiscalCode', e.target.value.toUpperCase())}
                        placeholder="es. 09876543210 o RSSMRA80A01H501U"
                      />
                      {cfStatus && (
                        <p
                          className={cn(
                            'text-[11px] mt-1 flex items-center gap-1',
                            cfStatus.valid ? 'text-emerald-400' : 'text-amber-400'
                          )}
                        >
                          {cfStatus.valid ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          )}
                          <span>{cfStatus.text}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <Input
                        label="Codice Destinatario SDI (Fatturazione Elettronica)"
                        value={formData.sdiCode}
                        onChange={(e) => handleChange('sdiCode', e.target.value.toUpperCase())}
                        placeholder="es. M5UXCR1 o 0000000"
                      />
                      {sdiStatus && (
                        <p
                          className={cn(
                            'text-[11px] mt-1 flex items-center gap-1',
                            sdiStatus.valid ? 'text-emerald-400' : 'text-amber-400'
                          )}
                        >
                          {sdiStatus.valid ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          )}
                          <span>{sdiStatus.text}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Input
                        label="Indirizzo PEC (Posta Elettronica Certificata)"
                        value={formData.pec}
                        onChange={(e) => handleChange('pec', e.target.value)}
                        placeholder="es. amministrazione@pec.ai-agency.it"
                      />
                      {pecStatus && (
                        <p
                          className={cn(
                            'text-[11px] mt-1 flex items-center gap-1',
                            pecStatus.valid ? 'text-emerald-400' : 'text-amber-400'
                          )}
                        >
                          {pecStatus.valid ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          )}
                          <span>{pecStatus.text}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sede Legale & Recapiti */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-400" />
                    <span>Sede Legale & Recapiti Istituzionali</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      label="Indirizzo Sede Legale (Via, Piazza, Numero Civico)"
                      value={formData.legalAddress}
                      onChange={(e) => handleChange('legalAddress', e.target.value)}
                      placeholder="es. Via Montenapoleone 14"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Input
                        label="CAP"
                        value={formData.postalCode}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        placeholder="es. 20121"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Input
                        label="Città"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="es. Milano"
                      />
                    </div>
                    <div>
                      <Input
                        label="Provincia (Sigla)"
                        value={formData.province}
                        onChange={(e) => handleChange('province', e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="MI"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Input
                      label="Email Contatto Amministrativo"
                      value={formData.adminEmail}
                      onChange={(e) => handleChange('adminEmail', e.target.value)}
                      placeholder="es. direzione@ai-agency.it"
                    />
                    <Input
                      label="Telefono Sede / Centralino"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="es. +39 02 87654321"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: BRAND & IDENTITÀ VISIVA */}
          {activeTab === 'brand' && (
            <div className="space-y-6">
              {/* Brand Positioning */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span>Nome Brand & Posizionamento Pubblico</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Nome Brand Pubblico / Marchio"
                    value={formData.brandName}
                    onChange={(e) => handleChange('brandName', e.target.value)}
                    placeholder="es. AI Agency Suite"
                    helperText="Il nome con cui l'agenzia si presenta commercialmente ai clienti"
                  />

                  <Input
                    label="Payoff / Tagline"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="es. Soluzioni di Intelligenza Artificiale, Automazione & Sviluppo Software"
                    helperText="Slogan o descrizione rapida visualizzata sotto il logo"
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Descrizione Sintetica dell&apos;Attività
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Breve profilo aziendale e aree di competenza..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Loghi & Asset Grafici */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-purple-400" />
                    <span>Loghi & Asset Grafici</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Principale */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Logo Principale (Light / Standard)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Utilizzato su sfondi chiari, preventivi PDF stampati e documenti formali.
                        </p>
                      </div>
                      {formData.logoDocumentId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleChange('logoDocumentId', '')}
                          className="text-rose-400 hover:text-rose-300 border-rose-900/40 text-xs gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Rimuovi</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-16 w-40 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm">
                        {formData.logoDocumentId ? (
                          <img
                            src={`/api/documents/${formData.logoDocumentId}/download`}
                            alt="Logo Principale"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Nessun logo caricato</span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAssetUpload('logo', file);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingAsset === 'logo'}
                          className="gap-2 text-xs border-slate-700 text-slate-200"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploadingAsset === 'logo' ? 'Caricamento in corso...' : 'Carica Logo Principale'}</span>
                        </Button>
                        <p className="text-[10px] text-slate-400">Formati: PNG, JPG, SVG, WebP (Max 5MB)</p>
                      </div>
                    </div>
                  </div>

                  {/* Logo Dark */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Logo Versione Dark (Invertito)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Utilizzato su sfondi scuri, dark mode e intestazioni a contrasto elevato.
                        </p>
                      </div>
                      {formData.logoDarkDocumentId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleChange('logoDarkDocumentId', '')}
                          className="text-rose-400 hover:text-rose-300 border-rose-900/40 text-xs gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Rimuovi</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-16 w-40 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-inner">
                        {formData.logoDarkDocumentId ? (
                          <img
                            src={`/api/documents/${formData.logoDarkDocumentId}/download`}
                            alt="Logo Dark"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Nessun logo dark</span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={logoDarkInputRef}
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAssetUpload('logoDark', file);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => logoDarkInputRef.current?.click()}
                          disabled={uploadingAsset === 'logoDark'}
                          className="gap-2 text-xs border-slate-700 text-slate-200"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploadingAsset === 'logoDark' ? 'Caricamento in corso...' : 'Carica Logo Dark'}</span>
                        </Button>
                        <p className="text-[10px] text-slate-400">Formati: PNG, JPG, SVG, WebP (Max 5MB)</p>
                      </div>
                    </div>
                  </div>

                  {/* Favicon / App Icon */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Favicon & Icona Compatta
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Icona quadrata utilizzata per browser tabs, avatar compatti e anteprime rapide.
                        </p>
                      </div>
                      {formData.faviconDocumentId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleChange('faviconDocumentId', '')}
                          className="text-rose-400 hover:text-rose-300 border-rose-900/40 text-xs gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Rimuovi</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 overflow-hidden shrink-0">
                        {formData.faviconDocumentId ? (
                          <img
                            src={`/api/documents/${formData.faviconDocumentId}/download`}
                            alt="Favicon"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Icon</span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={faviconInputRef}
                          accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAssetUpload('favicon', file);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={uploadingAsset === 'favicon'}
                          className="gap-2 text-xs border-slate-700 text-slate-200"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploadingAsset === 'favicon' ? 'Caricamento...' : 'Carica Favicon / Icona'}</span>
                        </Button>
                        <p className="text-[10px] text-slate-400">Consigliato formato quadrato PNG o SVG</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Palette Colori */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-400" />
                    <span>Colori Istituzionali Brand</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Colore Primario</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.primaryColor || '#2563eb'}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          className="h-10 w-12 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.primaryColor}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          placeholder="#2563eb"
                          className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Colore Secondario</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.secondaryColor || '#4f46e5'}
                          onChange={(e) => handleChange('secondaryColor', e.target.value)}
                          className="h-10 w-12 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.secondaryColor}
                          onChange={(e) => handleChange('secondaryColor', e.target.value)}
                          placeholder="#4f46e5"
                          className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">Colore Accento</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.accentColor || '#06b6d4'}
                          onChange={(e) => handleChange('accentColor', e.target.value)}
                          className="h-10 w-12 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.accentColor}
                          onChange={(e) => handleChange('accentColor', e.target.value)}
                          placeholder="#06b6d4"
                          className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: PREVENTIVI & DOCUMENTI */}
          {activeTab === 'quotes' && (
            <div className="space-y-6">
              {/* Logo Choice & Header Notes */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <span>Intestazione Preventivi & Scelta Logo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Logo da visualizzare nell&apos;intestazione dei preventivi
                    </label>
                    <select
                      value={formData.quoteLogoChoice}
                      onChange={(e) => handleChange('quoteLogoChoice', e.target.value as any)}
                      className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="primary">Logo Principale (Consigliato per stampe/PDF)</option>
                      <option value="dark">Logo Versione Dark (Per layout a contrasto scuro)</option>
                      <option value="none">Nessun Logo (Mostra solo nome testuale e sigla stilizzata)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Note e Messaggio Intestazione Preventivo
                    </label>
                    <textarea
                      rows={2}
                      value={formData.quoteHeaderNotes}
                      onChange={(e) => handleChange('quoteHeaderNotes', e.target.value)}
                      placeholder="es. Soluzioni personalizzate di Intelligenza Artificiale e Automazione per aziende..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Testo introduttivo visualizzato subito sotto i dati di contatto nella testata della proposta.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Condizioni e Validità */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-400" />
                    <span>Condizioni Economiche & Validità Standard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      type="number"
                      label="Validità Standard Preventivo (Giorni)"
                      value={formData.quoteDefaultValidityDays}
                      onChange={(e) => handleChange('quoteDefaultValidityDays', parseInt(e.target.value) || 30)}
                      placeholder="30"
                      helperText="Numero di giorni predefinito per la data di scadenza delle nuove proposte"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Termini di Pagamento e Condizioni Standard
                    </label>
                    <textarea
                      rows={2}
                      value={formData.quoteDefaultTerms}
                      onChange={(e) => handleChange('quoteDefaultTerms', e.target.value)}
                      placeholder="es. 30% all'avvio dei lavori, 40% al rilascio della versione beta, 30% al collaudo finale."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Istruzioni di Pagamento & Coordinate Bancarie (IBAN)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.quotePaymentInstructions}
                      onChange={(e) => handleChange('quotePaymentInstructions', e.target.value)}
                      placeholder="es. Bonifico Bancario a favore di: ... IBAN: IT00X0000000000000000000000 - Banca ..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Coordinate bancarie e istruzioni stampate in calce al preventivo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Testo Piè di Pagina & Note Legali Preventivo
                    </label>
                    <textarea
                      rows={3}
                      value={formData.quoteFooterText}
                      onChange={(e) => handleChange('quoteFooterText', e.target.value)}
                      placeholder="es. Proposta commerciale valida secondo le condizioni generali di fornitura. Foro competente esclusivo: Milano."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Side: Live Quote Header Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-purple-400" />
                <span>Anteprima Live Intestazione Preventivo</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Simulazione Stampa</span>
            </div>

            {/* A4 Mini Preview Box */}
            <div className="bg-white text-slate-900 rounded-xl p-5 border border-slate-200 shadow-xl space-y-4">
              {/* Header Box */}
              <div className="border-b border-slate-200 pb-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  {previewLogoId ? (
                    <img
                      src={`/api/documents/${previewLogoId}/download`}
                      alt={formData.brandName}
                      className="h-8 max-h-10 w-auto object-contain max-w-[140px]"
                    />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                      style={{ backgroundColor: formData.primaryColor || '#2563eb' }}
                    >
                      {(formData.brandName || 'AI').slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-bold tracking-tight text-slate-900 block leading-snug">
                      {formData.brandName || 'Nome Brand Agenzia'}
                    </span>
                    {formData.legalName && formData.legalName !== formData.brandName && (
                      <span className="text-[10px] font-semibold text-slate-600 block">
                        {formData.legalName} {formData.legalForm}
                      </span>
                    )}
                  </div>
                </div>

                {formData.tagline && (
                  <p className="text-[10px] text-slate-600 italic font-medium">
                    {formData.tagline}
                  </p>
                )}

                <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                  {(formData.legalAddress || formData.city) && (
                    <p>
                      {[formData.legalAddress, formData.postalCode && formData.city ? `${formData.postalCode} ${formData.city}` : formData.city, formData.province ? `(${formData.province})` : null]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {(formData.vatId || formData.fiscalCode || formData.sdiCode) && (
                    <p className="font-mono text-[9px]">
                      {[
                        formData.vatId ? `P.IVA ${formData.vatId}` : null,
                        formData.fiscalCode && formData.fiscalCode !== formData.vatId ? `C.F. ${formData.fiscalCode}` : null,
                        formData.sdiCode ? `SDI: ${formData.sdiCode}` : null,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                  {(formData.adminEmail || formData.pec || formData.phone) && (
                    <p>
                      {[
                        formData.adminEmail ? `Email: ${formData.adminEmail}` : null,
                        formData.pec ? `PEC: ${formData.pec}` : null,
                        formData.phone ? `Tel: ${formData.phone}` : null,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                </div>

                {formData.quoteHeaderNotes && (
                  <p className="text-[9px] text-slate-600 italic pt-1 border-t border-slate-100">
                    {formData.quoteHeaderNotes}
                  </p>
                )}
              </div>

              {/* Sample Quote Number & Destinatario */}
              <div className="flex justify-between items-center text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Destinatario</span>
                  <span className="font-bold text-slate-800">Acme Corporation S.r.l.</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-blue-600 font-bold">PREV-2026-0042</span>
                  <span className="text-slate-400 text-[9px] block">Valido: {formData.quoteDefaultValidityDays || 30} gg</span>
                </div>
              </div>

              {/* Sample Footer */}
              <div className="text-[9px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                {formData.quotePaymentInstructions && (
                  <p className="font-mono text-[8px] bg-slate-50 p-1.5 rounded border border-slate-100">
                    <strong>Pagamento:</strong> {formData.quotePaymentInstructions}
                  </p>
                )}
                {formData.quoteFooterText && (
                  <p className="italic text-[8px]">{formData.quoteFooterText}</p>
                )}
                <div className="pt-2 flex justify-between items-center text-[9px] font-semibold text-slate-700">
                  <span>Per {formData.legalName || formData.brandName || 'AI Agency'}</span>
                  <span>Per Accettazione il Cliente</span>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-purple-200">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Immutabilità dei preventivi inviati</span>
              </div>
              <p className="text-[11px] text-purple-300/80 leading-relaxed">
                Le modifiche ai dati aziendali e ai loghi si applicano immediatamente alle nuove bozze di preventivo. I
                preventivi già inviati o accettati conservano lo snapshot immutabile dei dati attivi al momento
                dell&apos;invio.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
