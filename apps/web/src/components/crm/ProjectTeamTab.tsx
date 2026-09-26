'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FolderKanban,
  CheckSquare,
  Clock,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectMemberItem {
  id: string;
  projectId: string;
  userId: string;
  projectRole: 'manager' | 'editor' | 'contributor' | 'viewer';
  status: 'active' | 'inactive';
  joinedAt: string;
  addedBy: string | null;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'operator';
  userStatus: 'active' | 'inactive';
  userAvatar: string | null;
  openTasksCount: number;
  openTasks: Array<{ id: string; title: string; status: string }>;
}

interface ProjectTeamTabProps {
  projectId: string;
  onMembersUpdated?: () => void;
}

export function ProjectTeamTab({ projectId, onMembersUpdated }: ProjectTeamTabProps) {
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'manager' | 'editor' | 'contributor' | 'viewer'>('contributor');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove Member Warning Modal
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMemberItem | null>(null);
  const [removeWarning, setRemoveWarning] = useState<{ openTasksCount: number; openTasks: any[] } | null>(null);
  const [removing, setRemoving] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const [membersRes, usersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members?t=${Date.now()}`),
        fetch(`/api/users?status=active`),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.members || []);
      }

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setAllUsers(uData.users || []);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Errore nel caricamento del team di progetto' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [projectId]);

  const handleOpenAddModal = () => {
    const existingMemberUserIds = new Set(members.map((m) => m.userId));
    const available = allUsers.filter((u) => !existingMemberUserIds.has(u.id));
    setSelectedUserId(available[0]?.id || '');
    setSelectedRole('contributor');
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setAddError('Seleziona un utente da aggiungere');
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, projectRole: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore aggiunta membro');
      }

      setIsAddModalOpen(false);
      fetchTeamData();
      if (onMembersUpdated) onMembersUpdated();
      setFeedback({ type: 'success', message: 'Membro aggiunto con successo al progetto!' });
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'manager' | 'editor' | 'contributor' | 'viewer') => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRole: newRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore aggiornamento ruolo');
      }

      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, projectRole: newRole } : m))
      );
      if (onMembersUpdated) onMembersUpdated();
      setFeedback({ type: 'success', message: 'Ruolo di progetto aggiornato con successo.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handlePromptRemove = (member: ProjectMemberItem) => {
    setMemberToRemove(member);
    if (member.openTasksCount > 0) {
      setRemoveWarning({
        openTasksCount: member.openTasksCount,
        openTasks: member.openTasks,
      });
    } else {
      setRemoveWarning(null);
    }
    setIsRemoveModalOpen(true);
  };

  const handleConfirmRemove = async (force: boolean = false) => {
    if (!memberToRemove) return;
    setRemoving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberToRemove.userId}?force=${force}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error === 'USER_HAS_OPEN_TASKS') {
          setRemoveWarning({
            openTasksCount: data.openTasksCount,
            openTasks: data.openTasks || [],
          });
          return;
        }
        throw new Error(data.error || 'Errore rimozione membro');
      }

      setIsRemoveModalOpen(false);
      setMemberToRemove(null);
      setRemoveWarning(null);
      fetchTeamData();
      if (onMembersUpdated) onMembersUpdated();
      setFeedback({ type: 'success', message: 'Membro rimosso dal team di progetto.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRemoving(false);
    }
  };

  const existingMemberUserIds = new Set(members.map((m) => m.userId));
  const availableUsersToAdd = allUsers.filter((u) => !existingMemberUserIds.has(u.id));

  const roleLabels: Record<string, { label: string; badge: string; desc: string }> = {
    manager: {
      label: 'Manager',
      badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      desc: 'Gestione team, impostazioni, approvazione richieste cliente, eliminazione task',
    },
    editor: {
      label: 'Editor',
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      desc: 'Creazione e modifica task, milestone, applicazione modelli di processo',
    },
    contributor: {
      label: 'Contributor',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      desc: 'Aggiornamento dei task a lui assegnati e caricamento materiali richiesti',
    },
    viewer: {
      label: 'Viewer',
      badge: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
      desc: 'Sola visualizzazione del progetto e dei documenti autorizzati',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Team di Progetto & Assegnazioni</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Solo gli utenti abilitati in questo elenco possono essere selezionati come assegnatari dei task
            e accedere alle risorse di questo progetto.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          disabled={availableUsersToAdd.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-md shadow-blue-500/20 text-xs transition-all disabled:opacity-50 flex-shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Aggiungi Membro ({availableUsersToAdd.length} disponibili)</span>
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
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            )}
            <span className="text-xs">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Role Matrix Info Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(roleLabels).map(([key, info]) => (
          <div key={key} className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-3 space-y-1">
            <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold border inline-block', info.badge)}>
              {info.label}
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">{info.desc}</p>
          </div>
        ))}
      </div>

      {/* Team Members List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
            <p className="text-sm">Caricamento membri del team...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="h-10 w-10 mx-auto text-slate-400" />
            <p className="text-base font-semibold text-slate-300">Nessun membro assegnato al progetto</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Aggiungi il project manager e gli operatori operativi per abilitare l'assegnazione dei task.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Operatore</th>
                  <th className="py-3.5 px-4">Ruolo Globale</th>
                  <th className="py-3.5 px-4">Ruolo nel Progetto</th>
                  <th className="py-3.5 px-4">Task Assegnati Aperti</th>
                  <th className="py-3.5 px-4">Data Inserimento</th>
                  <th className="py-3.5 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map((member) => {
                  const initials = member.userName
                    ? member.userName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U';

                  return (
                    <tr key={member.id} className="hover:bg-slate-850/40 transition-colors">
                      {/* Operator Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-700 to-blue-800 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-medium text-white truncate">{member.userName}</p>
                            <p className="text-xs text-slate-400 truncate">{member.userEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Global Role */}
                      <td className="py-3.5 px-4">
                        {member.userRole === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            Operatore
                          </span>
                        )}
                      </td>

                      {/* Project Role (Dropdown) */}
                      <td className="py-3.5 px-4">
                        <select
                          value={member.projectRole}
                          onChange={(e) => handleChangeRole(member.userId, e.target.value as any)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer',
                            roleLabels[member.projectRole]?.badge || roleLabels.contributor.badge
                          )}
                        >
                          <option value="manager" className="bg-slate-900 text-white">Manager (Pieni poteri)</option>
                          <option value="editor" className="bg-slate-900 text-white">Editor (Modifica task/template)</option>
                          <option value="contributor" className="bg-slate-900 text-white">Contributor (Solo propri task)</option>
                          <option value="viewer" className="bg-slate-900 text-white">Viewer (Sola lettura)</option>
                        </select>
                      </td>

                      {/* Open Tasks Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              member.openTasksCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'
                            )}
                          >
                            {member.openTasksCount} task aperti
                          </span>
                        </div>
                      </td>

                      {/* Joined date */}
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>

                      {/* Remove action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handlePromptRemove(member)}
                          title="Rimuovi membro dal progetto"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Aggiungi Membro al Team</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seleziona Operatore *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {availableUsersToAdd.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - {u.role === 'admin' ? 'Admin' : 'Operatore'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ruolo in questo Progetto *</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="contributor">Contributor (Aggiorna solo i task a lui assegnati)</option>
                  <option value="editor">Editor (Modifica task, milestone e applica template)</option>
                  <option value="manager">Manager (Gestione team, impostazioni e approvazione richieste)</option>
                  <option value="viewer">Viewer (Sola lettura delle risorse)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Info className="h-3.5 w-3.5 text-blue-400" />
                  <span>Permessi operativi</span>
                </div>
                <p>
                  L'utente aggiunto potrà visualizzare il progetto e potrà essere selezionato come assegnatario
                  dei task e delle attività di questo progetto.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={adding || !selectedUserId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {adding && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Aggiungi al Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE MEMBER CONFIRMATION / WARNING MODAL */}
      {isRemoveModalOpen && memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Rimuovi Membro dal Team</h3>
            </div>

            <p className="text-xs text-slate-300">
              Sei sicuro di voler rimuovere <strong>{memberToRemove.userName}</strong> dal team di questo
              progetto? L'utente non potrà più accedere alle risorse del progetto e non potrà più essere
              selezionato per nuovi task.
            </p>

            {removeWarning && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-2 text-amber-300 text-xs">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>Attenzione: {removeWarning.openTasksCount} task aperti assegnati!</span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  Questo operatore ha ancora attività non completate in questo progetto:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-300 max-h-24 overflow-y-auto">
                  {removeWarning.openTasks.map((t: any) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsRemoveModalOpen(false);
                  setMemberToRemove(null);
                  setRemoveWarning(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Annulla
              </button>

              {removeWarning ? (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => handleConfirmRemove(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {removing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Forza Rimozione</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => handleConfirmRemove(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {removing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Rimuovi Membro</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
