'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GanttChart } from '@/components/crm/GanttChart';
import {
  ArrowLeft,
  FolderKanban,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Upload,
  Download,
  Flag,
  ListTodo,
  ExternalLink,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [projectData, setProjectData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'gantt' | 'documents'>('overview');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    milestoneId: '',
    status: 'da_fare',
    priority: 'media',
    plannedStartDate: '',
    plannedEndDate: '',
    estimatedHours: 0,
    progressPercent: 0,
    assignedUserIds: [] as string[],
    predecessorTaskId: '',
    checklist: [] as Array<{ id: string; text: string; completed: boolean }>,
  });
  const [newChecklistText, setNewChecklistText] = useState('');

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    dueDate: '',
    description: '',
  });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState('deliverable');
  const [docTitle, setDocTitle] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    status: 'pianificato',
    startDate: '',
    dueDate: '',
    budgetHours: 0,
    managerId: '',
  });

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const [projRes, usersRes] = await Promise.all([
        fetch(`/api/projects/${id}?t=${Date.now()}`),
        fetch('/api/users'),
      ]);

      if (!projRes.ok) {
        router.push('/crm/projects');
        return;
      }

      const data = await projRes.json();
      setProjectData(data);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }

      if (data.project) {
        setProjectForm({
          title: data.project.title || '',
          description: data.project.description || '',
          status: data.project.status || 'pianificato',
          startDate: data.project.startDate || '',
          dueDate: data.project.dueDate || '',
          budgetHours: data.project.budgetHours || 0,
          managerId: data.project.managerId || '',
        });
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleUpdateProjectStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm),
      });
      if (res.ok) {
        setIsEditProjectOpen(false);
        fetchProject();
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      milestoneId: '',
      status: 'da_fare',
      priority: 'media',
      plannedStartDate: '',
      plannedEndDate: '',
      estimatedHours: 0,
      progressPercent: 0,
      assignedUserIds: [],
      predecessorTaskId: '',
      checklist: [],
    });
    setNewChecklistText('');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: any) => {
    setEditingTask(task);
    const assignedIds = task.assignments?.map((a: any) => a.userId) || task.assignees?.map((a: any) => a.userId) || [];
    const pred = task.predecessors?.[0]?.predecessorTaskId || '';

    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      milestoneId: task.milestoneId || '',
      status: task.status || 'da_fare',
      priority: task.priority || 'media',
      plannedStartDate: task.plannedStartDate || '',
      plannedEndDate: task.plannedEndDate || '',
      estimatedHours: task.estimatedHours || 0,
      progressPercent: task.progressPercent || 0,
      assignedUserIds: assignedIds,
      predecessorTaskId: pred,
      checklist: Array.isArray(task.checklist) ? task.checklist : [],
    });
    setNewChecklistText('');
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        // Update task
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description,
            milestoneId: taskForm.milestoneId || null,
            status: taskForm.status,
            priority: taskForm.priority,
            plannedStartDate: taskForm.plannedStartDate || null,
            plannedEndDate: taskForm.plannedEndDate || null,
            estimatedHours: taskForm.estimatedHours,
            progressPercent: taskForm.progressPercent,
            assignedUserIds: taskForm.assignedUserIds,
            checklist: taskForm.checklist,
          }),
        });

        if (res.ok) {
          // If predecessor is set or changed
          if (taskForm.predecessorTaskId) {
            await fetch(`/api/tasks/${editingTask.id}/dependencies`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                predecessorTaskId: taskForm.predecessorTaskId,
                dependencyType: 'finish_to_start',
              }),
            });
          }
          setIsTaskModalOpen(false);
          fetchProject();
        }
      } else {
        // Create new task
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: id,
            title: taskForm.title,
            description: taskForm.description,
            milestoneId: taskForm.milestoneId || null,
            status: taskForm.status,
            priority: taskForm.priority,
            plannedStartDate: taskForm.plannedStartDate || null,
            plannedEndDate: taskForm.plannedEndDate || null,
            estimatedHours: taskForm.estimatedHours,
            assignedUserIds: taskForm.assignedUserIds,
            checklist: taskForm.checklist,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (taskForm.predecessorTaskId && data.task?.id) {
            await fetch(`/api/tasks/${data.task.id}/dependencies`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                predecessorTaskId: taskForm.predecessorTaskId,
                dependencyType: 'finish_to_start',
              }),
            });
          }
          setIsTaskModalOpen(false);
          fetchProject();
        }
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
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
        fetchProject();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneForm),
      });
      if (res.ok) {
        setIsMilestoneModalOpen(false);
        setMilestoneForm({ title: '', dueDate: '', description: '' });
        fetchProject();
      }
    } catch (err) {
      console.error('Failed to create milestone:', err);
    }
  };

  const handleToggleMilestone = async (m: any) => {
    const nextStatus = m.status === 'raggiunta' ? 'in_programma' : 'raggiunta';
    try {
      const res = await fetch(`/api/projects/${id}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: m.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setIsUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle || docFile.name);
      formData.append('category', docCategory);
      formData.append('entityType', 'project');
      formData.append('entityId', id);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setIsDocModalOpen(false);
        setDocFile(null);
        setDocTitle('');
        fetchProject();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Errore caricamento documento');
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Delete doc failed:', err);
    }
  };

  if (isLoading || !projectData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Caricamento Hub Progetto...</p>
      </div>
    );
  }

  const { project, order, lead, manager, milestones = [], tasks = [], documents = [] } = projectData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pianificato':
        return <Badge variant="outline" className="bg-slate-800 text-slate-300">Pianificato</Badge>;
      case 'in_corso':
        return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">In Corso</Badge>;
      case 'in_pausa':
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">In Pausa</Badge>;
      case 'completato':
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completato</Badge>;
      case 'annullato':
        return <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30">Annullato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'da_fare':
        return <Badge variant="outline" className="bg-slate-800 text-slate-400">Da Fare</Badge>;
      case 'in_corso':
        return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">In Corso</Badge>;
      case 'in_revisione':
        return <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30">In Revisione</Badge>;
      case 'bloccato':
        return <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30">Bloccato</Badge>;
      case 'completato':
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Convert tasks to GanttTask format
  const ganttTasks = tasks.map((t: any) => ({
    id: t.id,
    projectId: t.projectId,
    milestoneId: t.milestoneId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    plannedStartDate: t.plannedStartDate,
    plannedEndDate: t.plannedEndDate,
    actualStartDate: t.actualStartDate,
    actualEndDate: t.actualEndDate,
    progressPercent: t.progressPercent,
    estimatedHours: t.estimatedHours,
    isBlocked: t.isBlocked,
    isOverdue: t.isOverdue,
    assignees: t.assignments?.map((a: any) => ({ userId: a.userId, userName: a.userName || 'Utente' })) || [],
    predecessors: t.predecessors,
  }));

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/crm/projects" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Progetti</span>
          </Link>
          {order && (
            <>
              <span>/</span>
              <Link href={`/crm/commesse/${order.id}`} className="text-indigo-400 hover:underline">
                Commessa {order.code}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-white font-semibold">{project.code}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditProjectOpen(true)}
            className="text-xs gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Modifica Info</span>
          </Button>

          <Link href={`/crm/projects/${id}/gantt`}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 bg-blue-950/40 text-blue-300 border-blue-800/80">
              <Calendar className="h-3.5 w-3.5" />
              <span>Gantt a Schermo Intero</span>
            </Button>
          </Link>

          <Button size="sm" onClick={handleOpenCreateTask} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500">
            <Plus className="h-3.5 w-3.5" />
            <span>Nuova Attività</span>
          </Button>
        </div>
      </div>

      {/* Main Project Header Card */}
      <Card className="bg-slate-900/90 border-slate-800 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-lg">
              <FolderKanban className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white">{project.title}</h1>
                <span className="font-mono font-bold text-sm bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded border border-blue-500/30">
                  {project.code}
                </span>
                {getStatusBadge(project.status)}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                {order && (
                  <div className="flex items-center gap-1 text-slate-300">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Commessa: <Link href={`/crm/commesse/${order.id}`} className="text-indigo-400 hover:underline">{order.code} - {order.title}</Link></span>
                  </div>
                )}

                {lead && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>Cliente: <Link href={`/crm/leads/${lead.id}`} className="text-blue-400 hover:underline">{lead.companyName}</Link></span>
                    </div>
                  </>
                )}

                <span>•</span>
                <div className="flex items-center gap-1 text-slate-300">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>Responsabile: {manager?.name || 'Admin'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Status Select */}
          <div className="w-full md:w-52 space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Stato Avanzamento</label>
            <Select
              value={project.status}
              onChange={(e) => handleUpdateProjectStatus(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs w-full"
            >
              <option value="pianificato">Pianificato</option>
              <option value="in_corso">In Corso</option>
              <option value="in_pausa">In Pausa</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
            </Select>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-[11px] block">Avanzamento Globale</span>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold font-mono text-white">{project.progressPercent}%</span>
              <span className="text-[10px] text-slate-400">{tasks.filter((t: any) => t.status === 'completato').length}/{tasks.length} Attività</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-[11px] block">Pianificazione Date</span>
            <div className="text-slate-200 font-mono font-medium text-xs pt-0.5">
              {project.startDate || 'Non definita'} &rarr; {project.dueDate || 'Non definita'}
            </div>
            <span className="text-[10px] text-slate-400">
              {project.completedAt ? `Completato: ${project.completedAt.slice(0, 10)}` : 'In timeline'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-[11px] block">Ore Budget / Stimate</span>
            <div className="text-slate-200 font-mono font-medium text-xs pt-0.5">
              {tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0)}h / {project.budgetHours || 0}h
            </div>
            <span className="text-[10px] text-slate-400">
              Effettive: {tasks.reduce((sum: number, t: any) => sum + (t.actualHours || 0), 0)}h
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-[11px] block">Milestone Raggiunte</span>
            <div className="text-slate-200 font-mono font-medium text-xs pt-0.5">
              {milestones.filter((m: any) => m.status === 'raggiunta').length} di {milestones.length}
            </div>
            <span className="text-[10px] text-slate-400">
              {milestones.length > 0 ? `${Math.round((milestones.filter((m: any) => m.status === 'raggiunta').length / milestones.length) * 100)}% Milestone` : 'Nessuna'}
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs pb-1 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white border-t-2 border-blue-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <FolderKanban className="h-4 w-4 text-blue-400" />
          <span>Panoramica & Milestone ({milestones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'bg-slate-900 text-white border-t-2 border-blue-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <ListTodo className="h-4 w-4 text-indigo-400" />
          <span>Attività & Deliverables ({tasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gantt')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'gantt'
              ? 'bg-slate-900 text-white border-t-2 border-amber-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <Calendar className="h-4 w-4 text-amber-400" />
          <span>Cronoprogramma Gantt</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 rounded-t-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'bg-slate-900 text-white border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <FileText className="h-4 w-4 text-emerald-400" />
          <span>Documenti & File ({documents.length})</span>
        </button>
      </div>

      {/* TAB 1: PANORAMICA & MILESTONE */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Description & Milestones */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-950 border-slate-800 p-5 space-y-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-blue-400" />
                Obiettivi & Descrizione del Progetto
              </CardTitle>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {project.description || 'Nessuna descrizione o specifica inserita per questo progetto.'}
              </p>
            </Card>

            {/* Milestones Card */}
            <Card className="bg-slate-950 border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-sm font-bold text-white">
                    Milestone di Progetto ({milestones.length})
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMilestoneModalOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nuova Milestone</span>
                </Button>
              </div>

              <div className="divide-y divide-slate-850">
                {milestones.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Nessuna milestone definita. Aggiungi milestone con date di scadenza chiave.
                  </p>
                ) : (
                  milestones.map((m: any) => (
                    <div key={m.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(m)}
                          className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            m.status === 'raggiunta'
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-700 bg-slate-900 text-transparent hover:border-slate-500'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <div>
                          <h4 className={`text-xs font-semibold ${m.status === 'raggiunta' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                            {m.title}
                          </h4>
                          {m.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                            <span>Scadenza: {m.dueDate}</span>
                            {m.status === 'raggiunta' && (
                              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                Raggiunta
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Col: Parent Order & Quick Stats */}
          <div className="space-y-6">
            {order && (
              <Card className="bg-slate-950 border-slate-800 p-5 space-y-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Dati Commessa Collegata
                </CardTitle>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div>
                    <span className="text-slate-400">Codice:</span>{' '}
                    <span className="font-mono font-bold text-indigo-300">{order.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Titolo:</span>{' '}
                    <span className="font-medium text-slate-200">{order.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Stato:</span>{' '}
                    <span className="capitalize">{order.status}</span>
                  </div>
                  {order.totalAmountCents && (
                    <div>
                      <span className="text-slate-400">Valore Commessa:</span>{' '}
                      <span className="font-mono text-emerald-400 font-bold">
                        €{(order.totalAmountCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <Link href={`/crm/commesse/${order.id}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      Vai alla Commessa &rarr;
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTIVITÀ & DELIVERABLES */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Attività Operative</h3>
              <p className="text-xs text-slate-400">
                Task, assegnatari, dipendenze finish-to-start (DAG) e avanzamento checklist.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenCreateTask} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500">
              <Plus className="h-3.5 w-3.5" />
              <span>Nuova Attività</span>
            </Button>
          </div>

          <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">Titolo & Deliverable</th>
                    <th className="py-3 px-4">Stato</th>
                    <th className="py-3 px-4">Priorità</th>
                    <th className="py-3 px-4">Assegnatari</th>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-4">Avanzamento</th>
                    <th className="py-3 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nessuna attività inserita. Clicca &ldquo;Nuova Attività&rdquo; per iniziare.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((t: any) => (
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
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {t.isBlocked && (
                              <span title="Attività Bloccata: le attività precedenti non sono ancora completate">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              </span>
                            )}
                            <span className={`font-semibold ${t.status === 'completato' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                              {t.title}
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                          )}
                          {t.isBlocked && (
                            <span className="text-[10px] text-amber-400 block font-medium">
                              Bloccato da attività precedente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getTaskStatusBadge(t.status)}
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.priority === 'urgente' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            t.priority === 'alta' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            t.priority === 'media' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            'bg-slate-900 text-slate-400'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {t.assignments && t.assignments.length > 0 ? (
                              t.assignments.map((a: any) => (
                                <span key={a.userId} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                  {a.userName || 'Utente'}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[10px]">Nessuno</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          {t.plannedStartDate && t.plannedEndDate ? (
                            <span>{t.plannedStartDate} &rarr; {t.plannedEndDate}</span>
                          ) : (
                            <span className="text-slate-500">Non pianificata</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>{t.progressPercent}%</span>
                              {t.checklistCount > 0 && (
                                <span>{t.checklistDoneCount}/{t.checklistCount}</span>
                              )}
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-500 h-full rounded-full transition-all"
                                style={{ width: `${t.progressPercent}%` }}
                              />
                            </div>
                          </div>
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
                              className="p-1 h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
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
        </div>
      )}

      {/* TAB 3: CRONOPROGRAMMA GANTT */}
      {activeTab === 'gantt' && (
        <div className="space-y-4">
          <GanttChart
            tasks={ganttTasks}
            milestones={milestones}
            onTaskClick={(t) => {
              const originalTask = tasks.find((x: any) => x.id === t.id);
              if (originalTask) handleOpenEditTask(originalTask);
            }}
            onAddTask={handleOpenCreateTask}
          />
        </div>
      )}

      {/* TAB 4: DOCUMENTI & FILE */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Documenti & Vault del Progetto</h3>
              <p className="text-xs text-slate-400">
                Brief, contratti, deliverable, specifiche tecniche archiviati in modo sicuro.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDocModalOpen(true)}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Carica Documento</span>
            </Button>
          </div>

          <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
            <div className="divide-y divide-slate-850">
              {documents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nessun documento caricato per questo progetto.
                </div>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-950/50 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200">{doc.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono">{doc.originalName}</span>
                          <span>•</span>
                          <span className="font-mono">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="capitalize">{doc.category}</span>
                          <span>•</span>
                          <span>{doc.createdAt?.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="text-xs gap-1">
                          <Download className="h-3.5 w-3.5" />
                          <span>Scarica</span>
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: TASK CREATE / EDIT */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingTask ? 'Modifica Attività' : 'Nuova Attività Operativa'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Titolo Attività *</label>
                <Input
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Es: Configurazione Funnel e Agente AI"
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Descrizione & Deliverable</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Dettagli operativi o criteri di accettazione..."
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
                  <label className="text-slate-400 block font-medium">Data Inizio Pianificata</label>
                  <Input
                    type="date"
                    value={taskForm.plannedStartDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Data Fine Pianificata</label>
                  <Input
                    type="date"
                    value={taskForm.plannedEndDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Ore Stimate</label>
                  <Input
                    type="number"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Milestone Associata</label>
                  <Select
                    value={taskForm.milestoneId}
                    onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="">Nessuna milestone</option>
                    {milestones.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.dueDate})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Predecessor Dependency (DAG) */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  Dipendenza Predecessore (Finish-to-Start)
                </label>
                <Select
                  value={taskForm.predecessorTaskId}
                  onChange={(e) => setTaskForm({ ...taskForm, predecessorTaskId: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="">Nessun predecessore (può iniziare subito)</option>
                  {tasks
                    .filter((t: any) => !editingTask || t.id !== editingTask.id)
                    .map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                </Select>
                <span className="text-[10px] text-slate-500">
                  Questa attività rimarrà &ldquo;Bloccata&rdquo; fino al completamento del task precedente.
                </span>
              </div>

              {/* Assignees multi select */}
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Assegnatari (Operatori)</label>
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

              {/* Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-slate-400 block font-medium">Checklist di Avanzamento</label>
                <div className="space-y-1.5">
                  {taskForm.checklist.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-900 border border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => {
                            const updated = [...taskForm.checklist];
                            updated[idx].completed = e.target.checked;
                            setTaskForm({ ...taskForm, checklist: updated });
                          }}
                          className="rounded bg-slate-800 border-slate-700"
                        />
                        <span className={`text-xs ${item.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = taskForm.checklist.filter((_, i) => i !== idx);
                          setTaskForm({ ...taskForm, checklist: updated });
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs px-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Aggiungi punto checklist..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistText.trim()) {
                          setTaskForm({
                            ...taskForm,
                            checklist: [
                              ...taskForm.checklist,
                              { id: `chk_${Date.now()}`, text: newChecklistText.trim(), completed: false },
                            ],
                          });
                          setNewChecklistText('');
                        }
                      }
                    }}
                    className="bg-slate-900 border-slate-800 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newChecklistText.trim()) {
                        setTaskForm({
                          ...taskForm,
                          checklist: [
                            ...taskForm.checklist,
                            { id: `chk_${Date.now()}`, text: newChecklistText.trim(), completed: false },
                          ],
                        });
                        setNewChecklistText('');
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
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

      {/* MODAL: CREATE MILESTONE */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Nuova Milestone</h3>
            <form onSubmit={handleCreateMilestone} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Titolo Milestone *</label>
                <Input
                  required
                  placeholder="Es: Rilascio MVP & Collaudo"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Data di Scadenza *</label>
                <Input
                  type="date"
                  required
                  value={milestoneForm.dueDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Descrizione / Criteri</label>
                <textarea
                  rows={2}
                  placeholder="Criteri per considerare la milestone raggiunta..."
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsMilestoneModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-500">
                  Crea Milestone
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Carica Documento di Progetto</h3>
            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Titolo Documento</label>
                <Input
                  placeholder="Es: Brief Iniziale / Report Collaudo"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Categoria</label>
                <Select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs w-full"
                >
                  <option value="deliverable">Deliverable</option>
                  <option value="brief">Brief</option>
                  <option value="contratto">Contratto</option>
                  <option value="specifica_tecnica">Specifica Tecnica</option>
                  <option value="report">Report</option>
                  <option value="altro">Altro</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">File (PDF, Doc, Immagini, max 25MB) *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDocModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" isLoading={isUploadingDoc} className="bg-emerald-600 hover:bg-emerald-500">
                  Carica nel Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROJECT INFO */}
      {isEditProjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-base font-bold text-white">Modifica Dettagli Progetto</h3>
            <form onSubmit={handleSaveProjectDetails} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Titolo Progetto *</label>
                <Input
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Descrizione</label>
                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Data Inizio</label>
                  <Input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Data Scadenza</label>
                  <Input
                    type="date"
                    value={projectForm.dueDate}
                    onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Budget Ore Totali</label>
                  <Input
                    type="number"
                    value={projectForm.budgetHours}
                    onChange={(e) => setProjectForm({ ...projectForm, budgetHours: Number(e.target.value) })}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Project Manager</label>
                  <Select
                    value={projectForm.managerId}
                    onChange={(e) => setProjectForm({ ...projectForm, managerId: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs w-full"
                  >
                    <option value="">Seleziona manager</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditProjectOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                  Salva Modifiche
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
