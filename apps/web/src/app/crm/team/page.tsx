'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  Link as LinkIcon,
  Copy,
  Check,
  Edit,
  FolderKanban,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  status: 'active' | 'inactive';
  avatar: string | null;
  invitedBy: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  projectsCount: number;
  openTasksCount: number;
  projectMemberships: Array<{
    id: string;
    projectId: string;
    projectRole: 'manager' | 'editor' | 'contributor' | 'viewer';
  }>;
}

interface UserProjectDetail {
  membershipId: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  projectStatus: string;
  projectType: string;
  projectRole: string;
  membershipStatus: string;
  joinedAt: string;
}

export default function TeamManagementPage() {
  const [usersList, setUsersList] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Selected user
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [userProjects, setUserProjects] = useState<UserProjectDetail[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'operator'>('operator');
  const [createMode, setCreateMode] = useState<'invite' | 'password'>('invite');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Invite modal state
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Errore caricamento utenti' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Errore di connessione al server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, search]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('operator');
    setCreateMode('invite');
    setFormPassword('');
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
      };

      if (createMode === 'invite') {
        payload.createInviteToken = true;
      } else {
        payload.password = formPassword;
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore durante la creazione utente');
      }

      setShowCreateModal(false);
      fetchUsers();

      if (data.user?.inviteToken) {
        const origin = window.location.origin;
        setGeneratedInviteUrl(`${origin}/activate?token=${data.user.inviteToken}`);
        setShowInviteModal(true);
      } else {
        setFeedback({ type: 'success', message: `Utente ${data.user.name} creato con successo!` });
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (user: TeamUser) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormPassword('');
    setFormError(null);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setFormError(null);

    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        status: formStatus,
      };

      if (formPassword && formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore aggiornamento utente');
      }

      setShowEditModal(false);
      fetchUsers();
      setFeedback({
        type: 'success',
        message: `Utente ${data.user.name} aggiornato. ${formStatus === 'inactive' ? 'Le sessioni attive sono state revocate.' : ''}`,
      });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: TeamUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmMsg =
      nextStatus === 'inactive'
        ? `Disattivare l'utente ${user.name}? Non potrà più accedere e tutte le sue sessioni attive verranno revocate immediatamente.`
        : `Riattivare l'utente ${user.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore modifica stato utente');
      }

      fetchUsers();
      setFeedback({
        type: 'success',
        message: `Stato utente aggiornato a ${nextStatus === 'active' ? 'Attivo' : 'Disattivato'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleGenerateInvite = async (user: TeamUser) => {
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore generazione link invito');
      }

      setGeneratedInviteUrl(data.invitation.inviteUrl);
      setShowInviteModal(true);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleViewProjects = async (user: TeamUser) => {
    setSelectedUser(user);
    setLoadingProjects(true);
    setShowProjectsModal(true);

    try {
      const res = await fetch(`/api/users/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUserProjects(data.projects || []);
      }
    } catch {
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCount = usersList.filter((u) => u.status === 'active').length;
  const inactiveCount = usersList.filter((u) => u.status === 'inactive').length;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const operatorCount = usersList.filter((u) => u.role === 'operator').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Team & Permessi</h1>
            <span className="text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
              Amministrazione
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci operatori, ruoli globali, stato account, inviti e accessi ai progetti.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-md shadow-blue-500/20 text-sm transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuovo Utente</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center justify-between text-sm animate-in fade-in',
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Utenti Totali</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{usersList.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {adminCount} Admin • {operatorCount} Operatori
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Utenti Attivi</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{activeCount}</p>
          <p className="text-[11px] text-emerald-500/70 mt-0.5">Abilitati all'accesso CRM</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Disattivati</span>
            <UserX className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-300 mt-2">{inactiveCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sessioni revocate</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Matrice Permessi</span>
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-indigo-300 mt-2">4 Ruoli Progetto</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Manager, Editor, Contrib, Viewer</p>
        </div>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 self-start">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Tutti ({usersList.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === 'active'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Attivi ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === 'inactive'
                ? 'bg-slate-700/50 text-slate-200 border border-slate-600/40 font-semibold'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Disattivati ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
            <p className="text-sm">Caricamento team in corso...</p>
          </div>
        ) : usersList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="h-10 w-10 mx-auto text-slate-400" />
            <p className="text-base font-semibold text-slate-300">Nessun utente trovato</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? `Nessun risultato per "${search}". Prova con altri termini.`
                : 'Inizia creando un nuovo operatore con il pulsante in alto a destra.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Utente</th>
                  <th className="py-3.5 px-4">Ruolo Globale</th>
                  <th className="py-3.5 px-4">Stato</th>
                  <th className="py-3.5 px-4">Progetti</th>
                  <th className="py-3.5 px-4">Task Aperti</th>
                  <th className="py-3.5 px-4">Data Attivazione</th>
                  <th className="py-3.5 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((user) => {
                  const initials = user.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U';

                  return (
                    <tr key={user.id} className="hover:bg-slate-850/40 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-medium text-white truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Global Role */}
                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <Users className="h-3 w-3" />
                            Operatore
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Attivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            Disattivato
                          </span>
                        )}
                      </td>

                      {/* Projects count & button */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleViewProjects(user)}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          <FolderKanban className="h-3.5 w-3.5" />
                          <span>{user.projectsCount} progetti</span>
                        </button>
                      </td>

                      {/* Open tasks */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-xs font-medium',
                            user.openTasksCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'
                          )}
                        >
                          {user.openTasksCount} attivi
                        </span>
                      </td>

                      {/* Activated / Created date */}
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {user.activatedAt ? (
                          <span title={`Attivato il ${new Date(user.activatedAt).toLocaleString()}`}>
                            {new Date(user.activatedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-amber-400/80 italic">In attesa attivazione</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleGenerateInvite(user)}
                            title="Genera link di invito/attivazione"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Modifica dati utente"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(user)}
                            title={user.status === 'active' ? 'Disattiva utente' : 'Riattiva utente'}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              user.status === 'active'
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                            )}
                          >
                            {user.status === 'active' ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Nuovo Utente Team</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome e Cognome *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="es. Mario Rossi"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Aziendale *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="mario.rossi@ai-consulting.it"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ruolo Globale CRM *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="operator">Operatore (Accesso regolato per progetto)</option>
                  <option value="admin">Amministratore (Accesso completo a tutti i progetti)</option>
                </select>
              </div>

              {/* Mode Selection */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-2">Metodo di Attivazione</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode('invite')}
                    className={cn(
                      'p-3 rounded-lg border text-left text-xs transition-colors flex flex-col gap-1',
                      createMode === 'invite'
                        ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-blue-400" />
                      <span>Link di Invito</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-400">
                      Token monouso; l'utente imposta la propria password.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateMode('password')}
                    className={cn(
                      'p-3 rounded-lg border text-left text-xs transition-colors flex flex-col gap-1',
                      createMode === 'password'
                        ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                      <span>Password Provvisoria</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-400">
                      Impostata direttamente dall'amministratore.
                    </span>
                  </button>
                </div>
              </div>

              {createMode === 'password' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password Iniziale (min. 6 caratteri) *
                  </label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nota di sicurezza: la password non viene registrata in chiaro nei log.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Crea Utente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Modifica Utente</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome e Cognome</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ruolo Globale</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="operator">Operatore</option>
                    <option value="admin">Amministratore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stato Account</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="active">Attivo</option>
                    <option value="inactive">Disattivato</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reimposta Password (lascia vuoto per non modificare)
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Nuova password..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {formStatus === 'inactive' && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Attenzione: impostando lo stato su <strong>Disattivato</strong>, qualsiasi sessione attiva
                    dell'utente verrà revocata all'istante e non potrà più effettuare l'accesso.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Salva Modifiche</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER PROJECTS MODAL */}
      {showProjectsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Progetti Assegnati</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selectedUser.name} ({selectedUser.email})</p>
              </div>
              <button
                onClick={() => setShowProjectsModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {loadingProjects ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
                <span className="text-xs">Caricamento progetti...</span>
              </div>
            ) : userProjects.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nessun progetto associato a questo utente.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {userProjects.map((p) => {
                  const roleColors: Record<string, string> = {
                    manager: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                    editor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                    contributor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    viewer: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
                  };

                  return (
                    <div
                      key={p.membershipId}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-400">{p.projectCode}</span>
                          <span className="text-sm font-semibold text-white">{p.projectTitle}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Assegnato il: {new Date(p.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
                          roleColors[p.projectRole] || roleColors.contributor
                        )}
                      >
                        {p.projectRole}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowProjectsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITATION LINK MODAL */}
      {showInviteModal && generatedInviteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Link di Attivazione Generato</h3>
            </div>

            <p className="text-xs text-slate-300">
              Invia questo link univoco all'operatore. Il link è valido per <strong>7 giorni</strong> e può
              essere utilizzato <strong>una sola volta</strong> per impostare la password di accesso.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={generatedInviteUrl}
                className="w-full bg-transparent text-xs text-blue-400 font-mono focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(generatedInviteUrl)}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copiato!' : 'Copia'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setGeneratedInviteUrl(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
