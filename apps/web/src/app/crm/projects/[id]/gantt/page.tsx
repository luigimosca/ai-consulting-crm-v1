'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GanttChart } from '@/components/crm/GanttChart';
import {
  ArrowLeft,
  Calendar,
  FolderKanban,
  Briefcase,
  Plus,
  Eye,
} from 'lucide-react';

export default function ProjectDedicatedGanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [projectData, setProjectData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}?t=${Date.now()}`);
      if (!res.ok) {
        router.push('/crm/projects');
        return;
      }
      const data = await res.json();
      setProjectData(data);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  if (isLoading || !projectData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Caricamento Cronoprogramma Gantt...</p>
      </div>
    );
  }

  const { project, order, milestones = [], tasks = [] } = projectData;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/crm/projects/${id}`} className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Torna al Progetto {project.code}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white">Cronoprogramma Gantt: {project.title}</h1>
            <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              {project.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Timeline interattiva con visualizzazione a giorni, settimane e mesi, milestone e avanzamento percentuale.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/crm/projects/${id}`}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              <span>Hub Progetto</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Gantt Chart Component */}
      <GanttChart
        tasks={ganttTasks}
        milestones={milestones}
        onTaskClick={(t) => {
          router.push(`/crm/projects/${id}`);
        }}
      />
    </div>
  );
}
