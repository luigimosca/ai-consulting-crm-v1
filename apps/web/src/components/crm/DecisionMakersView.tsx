'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Users,
  Sparkles,
  Plus,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Send,
  Building2,
  ShieldCheck,
  Crown,
  Briefcase,
  Stethoscope,
  Scale,
  RefreshCw,
  Info
} from 'lucide-react';

export interface DecisionMakerItem {
  id: string;
  leadId: string;
  fullName: string;
  role: string;
  department: 'management' | 'marketing' | 'medical' | 'legal' | 'sales' | 'operations' | 'tech' | 'other';
  seniority: 'c_level' | 'owner' | 'director' | 'manager' | 'specialist';
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
  confidence: number;
  source: string;
  sourceUrl?: string | null;
  rawData?: string | null;
  extractedAt: string;
  lastVerifiedAt?: string | null;
  verificationMethod: 'website_published' | 'pattern_inferred' | 'manual_verified' | 'unverified';
  isVerified: boolean;
  notes?: string | null;
  createdAt: string;
}

interface DecisionMakersViewProps {
  leadId: string;
  companyName: string;
  onSelectForOutreach?: (dm: DecisionMakerItem) => void;
}

export function DecisionMakersView({
  leadId,
  companyName,
  onSelectForOutreach,
}: DecisionMakersViewProps) {
  const [decisionMakers, setDecisionMakers] = useState<DecisionMakerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDm, setEditingDm] = useState<DecisionMakerItem | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    role: '',
    department: 'management',
    seniority: 'owner',
    email: '',
    phone: '',
    linkedinUrl: '',
    notes: '',
  });

  const fetchDecisionMakers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/decision-makers?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setDecisionMakers(data.decisionMakers || []);
      }
    } catch (err) {
      console.error('Failed to load decision makers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisionMakers();
  }, [leadId]);

  // Run AI Discovery
  const handleDiscoverAI = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/decision-makers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discover' }),
      });
      if (res.ok) {
        const data = await res.json();
        setDecisionMakers(data.decisionMakers || []);
      }
    } catch (err) {
      console.error('Error during AI discovery:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDm(null);
    setFormData({
      fullName: '',
      role: '',
      department: 'management',
      seniority: 'owner',
      email: '',
      phone: '',
      linkedinUrl: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dm: DecisionMakerItem) => {
    setEditingDm(dm);
    setFormData({
      fullName: dm.fullName,
      role: dm.role,
      department: dm.department,
      seniority: dm.seniority,
      email: dm.email || '',
      phone: dm.phone || '',
      linkedinUrl: dm.linkedinUrl || '',
      notes: dm.notes || '',
    });
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.role) return;

    try {
      if (editingDm) {
        // Update
        const res = await fetch(`/api/leads/${leadId}/decision-makers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decisionMakerId: editingDm.id,
            ...formData,
            isVerified: true,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchDecisionMakers();
        }
      } else {
        // Create manual
        const res = await fetch(`/api/leads/${leadId}/decision-makers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            ...formData,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchDecisionMakers();
        }
      }
    } catch (err) {
      console.error('Error saving decision maker:', err);
    }
  };

  // Delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${name}" da questo lead (diritto di cancellazione GDPR)?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/leads/${leadId}/decision-makers?decisionMakerId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDecisionMakers();
      }
    } catch (err) {
      console.error('Error deleting decision maker:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper per icona dipartimento
  const renderDepartmentBadge = (dept: string) => {
    switch (dept) {
      case 'medical':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
            <Stethoscope className="h-3 w-3 text-emerald-400" />
            <span>Sanità / Medico</span>
          </span>
        );
      case 'legal':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 rounded">
            <Scale className="h-3 w-3 text-blue-400" />
            <span>Legale & Tributario</span>
          </span>
        );
      case 'marketing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded">
            <Briefcase className="h-3 w-3 text-purple-400" />
            <span>Marketing & E-com</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
            <Crown className="h-3 w-3 text-amber-400" />
            <span>Direzione & Titolare</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>Decisori Aziendali & Ruoli Chiave ({decisionMakers.length})</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mappatura dei referenti con ruolo, email nominativa, profilo LinkedIn e conformità GDPR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscoverAI}
            isLoading={isDiscovering}
            className="gap-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>🔍 Cerca con AI (Team Page & Web)</span>
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Aggiungi Decisore</span>
          </Button>
        </div>
      </div>

      {/* Decision Makers Cards List */}
      {decisionMakers.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 p-8 text-center space-y-3">
          <Users className="h-8 w-8 mx-auto text-slate-500" />
          <div>
            <h4 className="text-sm font-semibold text-white">Nessun decisore ancora registrato</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Clicca su "Cerca con AI" per analizzare la pagina Team e il sito web di {companyName}, oppure inserisci un contatto manualmente.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDiscoverAI}
              isLoading={isDiscovering}
              className="gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Avvia Scansione AI Decisori</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decisionMakers.map((dm) => {
            const initials = dm.fullName
              .replace(/^(Dott\.ssa|Dott|Avv|Ing|Dr|Prof)\s+/i, '')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2);

            return (
              <Card
                key={dm.id}
                className="bg-slate-900/90 border-slate-800 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm group"
              >
                <div className="space-y-3">
                  {/* Header Card: Avatar, Name, Role & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {initials || '👤'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          {dm.fullName}
                        </h4>
                        <p className="text-xs font-semibold text-blue-400 mt-0.5">
                          {dm.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(dm)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Modifica Decisore"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dm.id, dm.fullName)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Elimina (Diritto all'oblio GDPR)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Department & Seniority Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {renderDepartmentBadge(dm.department)}
                    <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded uppercase font-medium">
                      {dm.seniority.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                      {Math.round(dm.confidence * 100)}% Confidenza
                    </span>
                  </div>

                  {/* Direct Contact Info Strip */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                    {dm.email && (
                      <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <a
                            href={`mailto:${dm.email}`}
                            className="font-mono text-[11px] text-slate-200 hover:text-blue-400 truncate"
                          >
                            {dm.email}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(dm.email!, `email-${dm.id}`)}
                          className="p-1 text-slate-400 hover:text-white shrink-0"
                          title="Copia Email"
                        >
                          {copiedId === `email-${dm.id}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {dm.phone && (
                      <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <a
                            href={`tel:${dm.phone}`}
                            className="text-[11px] text-slate-200 hover:text-emerald-400 font-mono"
                          >
                            {dm.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {dm.linkedinUrl && (
                      <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-1.5 truncate">
                          <Linkedin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          <a
                            href={dm.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-300 hover:underline flex items-center gap-1 truncate"
                          >
                            <span>Profilo LinkedIn</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Audit Trail */}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <span className="truncate max-w-[200px]">
                      Fonte: <strong className="text-slate-400">{dm.source}</strong>
                    </span>
                    <span>
                      {dm.verificationMethod === 'website_published'
                        ? 'Verificato sul Sito'
                        : dm.verificationMethod === 'manual_verified'
                        ? 'Verifica Manuale'
                        : 'Pattern Dedotto'}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Personalized Outreach Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate">
                    {dm.notes || 'Contatto prioritario per proposta'}
                  </span>

                  {onSelectForOutreach && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectForOutreach(dm)}
                      className="gap-1.5 text-xs py-1 px-2.5 shrink-0"
                    >
                      <Send className="h-3 w-3 text-blue-400" />
                      <span>Outreach Mirato</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDm ? `Modifica Decisore: ${editingDm.fullName}` : 'Aggiungi Nuovo Decisore Aziendale'}
        description="Inserisci i dettagli anagrafici e il ruolo aziendale per personalizzare le comunicazioni commerciali."
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <Input
            label="Nome e Cognome *"
            placeholder="es. Dott.ssa Silvia Mirabella"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />

          <Input
            label="Ruolo / Job Title *"
            placeholder="es. Titolare & Fisioterapista Specializzata"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Dipartimento"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              options={[
                { label: 'Direzione & Titolari', value: 'management' },
                { label: 'Sanità & Medico', value: 'medical' },
                { label: 'Marketing & E-commerce', value: 'marketing' },
                { label: 'Legale & Tributario', value: 'legal' },
                { label: 'Vendite & Commerciale', value: 'sales' },
                { label: 'Operativo & Sala', value: 'operations' },
                { label: 'Tecnologia / Sviluppo', value: 'tech' },
              ]}
            />

            <Select
              label="Livello di Seniority"
              value={formData.seniority}
              onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
              options={[
                { label: '👑 Titolare / Proprietario', value: 'owner' },
                { label: '💼 C-Level (CEO, CMO, CTO)', value: 'c_level' },
                { label: 'Direttore / Head of', value: 'director' },
                { label: 'Manager / Responsabile', value: 'manager' },
                { label: 'Specialista / Professionista', value: 'specialist' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Nominativa"
              type="email"
              placeholder="silvia.mirabella@studio.it"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Telefono Diretto / WhatsApp"
              placeholder="+39 347 1234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="URL Profilo LinkedIn"
            placeholder="https://www.linkedin.com/in/nome-cognome"
            value={formData.linkedinUrl}
            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Note interne & Audit</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="es. Titolare fondatrice dello studio, preferisce contatto WhatsApp."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Salva Decisore
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
