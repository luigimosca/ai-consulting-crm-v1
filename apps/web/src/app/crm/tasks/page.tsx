'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  ListTodo,
  Search,
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Columns,
  List,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';

export default function GlobalTasksPage() {
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);

  // Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    projectId: '',
    title: '',
    description: '',
    status: 'da_fare',
    priority: 'media',
    plannedStartDate: '',
    plannedEndDate: '',
    estimatedHours: 0,
    assignedUserIds: [] as string[],
    predecessorTaskId: '',
  });

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      let url = `/api/tasks?t=${Date.now()}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (priorityFilter !== 'all') url += `&priority=${priorityFilter}`;
      if (assigneeFilter !== 'all') url += `&assigneeId=${assigneeFilter}`;
      if (projectFilter !== 'all') url += `&projectId=${projectFilter}`;
      if (overdueOnly) url += `&isOverdue=true`;
      if (blockedOnly) url += `&isBlocked=true`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const [tasksRes, projRes, usersRes] = await Promise.all([
        fetch(url),
        fetch('/api/projects'),
        fetch('/api/users'),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasksList(data.tasks || []);
      }

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjectsList(pData.projects || []);
      }

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, assigneeFilter, projectFilter, overdueOnly, blockedOnly]);

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      projectId: projectsList[0]?.id || '',
      title: '',
      description: '',
      status: 'da_fare',
      priority: 'media',
      plannedStartDate: '',
      plannedEndDate: '',
      estimatedHours: 0,
      assignedUserIds: [],
      predecessorTaskId: '',
    });
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: any) => {
    setEditingTask(task);
    const assignedIds = task.assignees?.map((a: any) => a.userId) || [];
    setTaskForm({
      projectId: task.projectId,
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'da_fare',
      priority: task.priority || 'media',
      plannedStartDate: task.plannedStartDate || '',
      plannedEndDate: task.plannedEndDate || '',
      estimatedHours: task.estimatedHours || 0,
      assignedUserIds: assignedIds,
      predecessorTaskId: '',
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description,
            status: taskForm.status,
            priority: taskForm.priority,
            plannedStartDate: taskForm.plannedStartDate || null,
            plannedEndDate: taskForm.plannedEndDate || null,
            estimatedHours: taskForm.estimatedHours,
            assignedUserIds: taskForm.assignedUserIds,
          }),
        });
        if (res.ok) {
          setIsTaskModalOpen(false);
          fetchTasks();
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: taskForm.projectId,
            title: taskForm.title,
            description: taskForm.description,
            status: taskForm.status,
            priority: taskForm.priority,
            plannedStartDate: taskForm.plannedStartDate || null,
            plannedEndDate: taskForm.plannedEndDate || null,
            estimatedHours: taskForm.estimatedHours,
            assignedUserIds: taskForm.assignedUserIds,
          }),
        });
        if (res.ok) {
          setIsTaskModalOpen(false);
          fetchTasks();
        }
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === 'completato' ? 'da_fare' : 'completato';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleUpdateStatusDirect = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const kanbanColumns = [
    { id: 'da_fare', label: 'Da Fare', color: 'border-slate-700 bg-slate-900/40 text-slate-300' },
    { id: 'in_corso', label: 'In Corso', color: 'border-blue-700 bg-blue-950/30 text-blue-300' },
    { id: 'in_revisione', label: 'In Revisione', color: 'border-purple-700 bg-purple-950/30 text-purple-300' },
    { id: 'bloccato', label: 'Bloccato', color: 'border-amber-700 bg-amber-950/30 text-amber-300' },
    { id: 'completato', label: 'Completato', color: 'border-emerald-700 bg-emerald-950/30 text-emerald-300' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Gestione Attività Operative</h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              {tasksList.length} Attività
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Task manager trasversale per tutti i progetti, viste Kanban e Tabellare, gestione carichi e assegnazioni.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Kanban"
            >
              <Columns className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Tabella"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button size="sm" onClick={handleOpenCreateTask} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500">
            <Plus className="h-3.5 w-3.5" />
            <span>Nuova Attività</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cerca attività o progetto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTasks()}
              className="pl-9 bg-slate-900 border-slate-800 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-40"
            >
              <option value="all">Tutti i progetti</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.title}
                </option>
              ))}
            </Select>

            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-32"
            >
              <option value="all">Tutte le priorità</option>
              <option value="bassa">Bassa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>

            <Select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-slate-900 border-slate-800 text-xs w-36"
            >
              <option value="all">Tutti gli operatori</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>

            <Button variant="outline" size="sm" onClick={fetchTasks} className="text-xs">
              Filtra
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs pt-1 border-t border-slate-850">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-800 text-rose-500"
            />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-rose-400" />
              <span>Solo in scadenza / scaduti</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={blockedOnly}
              onChange={(e) => setBlockedOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-800 text-amber-500"
            />
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span>Solo bloccati (dipendenze)</span>
            </span>
          </label>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = tasksList.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-3 min-h-[400px] flex flex-col"
              >
                {/* Column Header */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-bold ${col.color}`}>
                  <span>{col.label}</span>
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[700px] pr-1">
                  {colTasks.map((t) => (
                    <Card
                      key={t.id}
                      className="bg-slate-900/90 border-slate-800 hover:border-blue-500/60 transition-all p-3.5 space-y-2.5 shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono text-blue-400 font-semibold truncate">
                          {t.projectCode || 'PROJ'}
                        </span>
                        <div className="flex items-center gap-1">
                          {t.isBlocked && <span title="Bloccato"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /></span>}
                          {t.isOverdue && <span title="In Ritardo"><Clock className="h-3.5 w-3.5 text-rose-400" /></span>}
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                            t.priority === 'urgente' ? 'bg-rose-950 text-rose-300' :
                            t.priority === 'alta' ? 'bg-amber-950 text-amber-300' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors line-clamp-2">
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{t.progressPercent}%</span>
                          {t.checklistCount > 0 && <span>{t.checklistDoneCount}/{t.checklistCount} subtask</span>}
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${t.progressPercent}%` }} />
                        </div>
                      </div>

                      {/* Footer Info & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1 truncate">
                          <User className="h-3 w-3 text-slate-500" />
                          <span className="truncate">
                            {t.assignees?.length > 0 ? t.assignees.map((a: any) => a.userName.split(' ')[0]).join(', ') : 'Non assegnato'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTask(t)}
                            className="text-slate-400 hover:text-white p-1"
                            title="Modifica"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <Link href={`/crm/projects/${t.projectId}`} className="text-blue-400 hover:underline p-1" title="Vai al progetto">
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="p-4 text-center text-[11px] text-slate-600 italic">
                      Nessuna attività
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Progetto</th>
                  <th className="py-3 px-4">Titolo Attività</th>
                  <th className="py-3 px-4">Stato</th>
                  <th className="py-3 px-4">Priorità</th>
                  <th className="py-3 px-4">Assegnatari</th>
                  <th className="py-3 px-4">Scadenza</th>
                  <th className="py-3 px-4">Avanzamento</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {tasksList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nessuna attività trovata con i filtri correnti.
                    </td>
                  </tr>
                ) : (
                  tasksList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                            t.status === 'completato'
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-700 bg-slate-900 text-transparent hover:border-slate-500'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3 fill-current" />
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                        <Link href={`/crm/projects/${t.projectId}`} className="hover:underline">
                          {t.projectCode}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {t.isBlocked && <span title="Bloccato"><AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" /></span>}
                          {t.isOverdue && <span title="In ritardo"><Clock className="h-3.5 w-3.5 text-rose-400 shrink-0" /></span>}
                          <span className={`font-semibold ${t.status === 'completato' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                            {t.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize">{t.status?.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {t.priority}
                      </td>
                      <td className="py-3 px-4">
                        {t.assignees?.map((a: any) => a.userName.split(' ')[0]).join(', ') || 'Nessuno'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {t.plannedEndDate || 'N/D'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.progressPercent}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditTask(t)}
                            className="p-1 h-7 w-7 text-slate-400 hover:text-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 h-7 w-7 text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: CREATE / EDIT TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingTask ? 'Modifica Attività' : 'Nuova Attività Operativa'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              {!editingTask && (
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Progetto di Riferimento *</label>
                  <Select
                    required
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Titolo Attività *</label>
                <Input
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Titolo deliverable o attività..."
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Descrizione</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Istruzioni o note operative..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Stato</label>
                  <Select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="da_fare">Da Fare</option>
                    <option value="in_corso">In Corso</option>
                    <option value="in_revisione">In Revisione</option>
                    <option value="bloccato">Bloccato</option>
                    <option value="completato">Completato</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Priorità</label>
                  <Select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Data Inizio</label>
                  <Input
                    type="date"
                    value={taskForm.plannedStartDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Data Scadenza</label>
                  <Input
                    type="date"
                    value={taskForm.plannedEndDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Assegnatari</label>
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg max-h-32 overflow-y-auto">
                  {usersList.map((u) => {
                    const isSelected = taskForm.assignedUserIds.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTaskForm({ ...taskForm, assignedUserIds: [...taskForm.assignedUserIds, u.id] });
                            } else {
                              setTaskForm({
                                ...taskForm,
                                assignedUserIds: taskForm.assignedUserIds.filter((id) => id !== u.id),
                              });
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700"
                        />
                        <span className="truncate">{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                  {editingTask ? 'Salva Modifiche' : 'Crea Attività'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
