'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Square,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
  Radio,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ReminderItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  dueDateTime?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'to_call' | 'invoice' | 'administrative' | 'followup' | 'idea';
  leadId?: string | null;
  companyId?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QuickRemindersWidgetProps {
  initialReminders?: ReminderItem[];
}

export function QuickRemindersWidget({ initialReminders = [] }: QuickRemindersWidgetProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>(initialReminders);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Reminder Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newCategory, setNewCategory] = useState<
    'general' | 'to_call' | 'invoice' | 'administrative' | 'followup' | 'idea'
  >('general');

  const handleToggleComplete = async (item: ReminderItem) => {
    const nextCompleted = !item.isCompleted;
    // Optimistic UI update
    setReminders((prev) =>
      prev.map((r) =>
        r.id === item.id
          ? {
              ...r,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : r
      )
    );

    try {
      const res = await fetch(`/api/activities/reminders/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      if (!res.ok) {
        // Revert on error
        setReminders((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, isCompleted: item.isCompleted } : r))
        );
      }
    } catch (err) {
      console.error('Failed to toggle reminder', err);
      // Revert on error
      setReminders((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, isCompleted: item.isCompleted } : r))
      );
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Eliminare questo promemoria?')) return;

    setReminders((prev) => prev.filter((r) => r.id !== id));

    try {
      await fetch(`/api/activities/reminders/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete reminder', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      let dueIso: string | undefined = undefined;
      if (newDueDate) {
        const timePart = newDueTime ? newDueTime : '12:00';
        dueIso = new Date(`${newDueDate}T${timePart}`).toISOString();
      }

      const res = await fetch('/api/activities/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          dueDateTime: dueIso,
          priority: newPriority,
          category: newCategory,
        }),
      });

      const data = await res.json();
      if (data.success && data.reminder) {
        setReminders((prev) => [data.reminder, ...prev]);
        setNewTitle('');
        setNewDueDate('');
        setNewDueTime('');
        setNewPriority('medium');
        setNewCategory('general');
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Failed to create reminder', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = reminders.filter((r) => {
    if (filter === 'pending') return !r.isCompleted;
    if (filter === 'completed') return r.isCompleted;
    return true;
  });

  const pendingCount = reminders.filter((r) => !r.isCompleted).length;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">Urgente</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Alta</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Media</span>;
      case 'low':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Bassa</span>;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'to_call':
        return 'Da Chiamare';
      case 'invoice':
        return 'Fattura/Contabile';
      case 'administrative':
        return 'Amministrativo';
      case 'followup':
        return 'Follow-up';
      case 'idea':
        return 'Idea / Appunto';
      case 'general':
      default:
        return 'Promemoria';
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Promemoria & Cose da Ricordare</h3>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingCount} in sospeso
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Attività personali, to-do rapidi e promemoria non legati a progetti specifici.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/crm/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-700/40 text-xs font-medium transition-all"
            title="Visualizza e sincronizza con Google Calendar"
          >
            <Radio className="h-3.5 w-3.5 text-indigo-400" />
            <span>Google Calendar Feed</span>
          </Link>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
          >
            {showAddForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showAddForm ? 'Chiudi' : 'Nuovo Promemoria'}</span>
          </button>
        </div>
      </div>

      {/* Add New Reminder Form (Collapsible) */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in"
        >
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Aggiungi cosa da ricordare o compito rapido</span>
          </div>

          <div>
            <input
              type="text"
              required
              placeholder="Es. Inviare bilancino commercialista, rinnovare dominio, richiamare Marco..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Data Scadenza (Opzionale)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Ora Scadenza</label>
              <input
                type="time"
                value={newDueTime}
                onChange={(e) => setNewDueTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Priorità</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Categoria</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="general">Generale</option>
                <option value="to_call">Da Chiamare</option>
                <option value="invoice">Fattura/Contabile</option>
                <option value="administrative">Amministrativo</option>
                <option value="followup">Follow-up</option>
                <option value="idea">Idea / Appunto</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Verrà sincronizzato automaticamente nel tuo feed Google Calendar con allarmi 15m prima.
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva Promemoria'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'pending'
                ? 'bg-slate-800 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Da Completare ({reminders.filter((r) => !r.isCompleted).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'completed'
                ? 'bg-slate-800 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completati ({reminders.filter((r) => r.isCompleted).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tutti ({reminders.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Clicca sulla casella per segnare come fatto
        </span>
      </div>

      {/* Reminders List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50">
            {filter === 'pending'
              ? 'Tutto fatto! Nessun promemoria in sospeso al momento.'
              : 'Nessun elemento da mostrare.'}
          </div>
        ) : (
          filtered.map((item) => {
            const isDueOverdue =
              item.dueDateTime &&
              !item.isCompleted &&
              new Date(item.dueDateTime).getTime() < Date.now();

            return (
              <div
                key={item.id}
                onClick={() => handleToggleComplete(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                  item.isCompleted
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    : isDueOverdue
                    ? 'bg-rose-950/15 border-rose-900/40 hover:border-rose-700/60'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    className="flex-shrink-0 text-slate-400 group-hover:text-amber-400 transition-colors"
                  >
                    {item.isCompleted ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium truncate block ${
                          item.isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {getPriorityBadge(item.priority)}
                      <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                        {getCategoryLabel(item.category)}
                      </span>

                      {item.dueDateTime && (
                        <span
                          className={`text-[10px] flex items-center gap-1 ${
                            item.isCompleted
                              ? 'text-slate-500'
                              : isDueOverdue
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(item.dueDateTime).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isDueOverdue ? ' (Scaduto)' : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                    title="Elimina promemoria"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
