'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flag,
  User,
  ArrowRight,
  Plus,
  Filter,
} from 'lucide-react';

export interface GanttTask {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  status: 'da_fare' | 'in_corso' | 'in_revisione' | 'bloccato' | 'completato';
  priority: 'bassa' | 'media' | 'alta' | 'urgente';
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  progressPercent: number;
  estimatedHours?: number;
  isBlocked?: boolean;
  isOverdue?: boolean;
  assignees?: Array<{ userId: string; userName: string }>;
  predecessors?: Array<{ predecessorTaskId: string; dependencyType: string; title?: string }>;
}

export interface GanttMilestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  actualDate?: string | null;
  status: 'in_programma' | 'raggiunta' | 'in_ritardo' | 'annullata';
}

interface GanttChartProps {
  tasks: GanttTask[];
  milestones?: GanttMilestone[];
  onTaskClick?: (task: GanttTask) => void;
  onAddTask?: () => void;
}

export function GanttChart({
  tasks,
  milestones = [],
  onTaskClick,
  onAddTask,
}: GanttChartProps) {
  const [scale, setScale] = useState<'day' | 'week' | 'month'>('week');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (assigneeFilter !== 'all') {
        const has = t.assignees?.some((a) => a.userId === assigneeFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  // Tasks with dates vs unscheduled tasks
  const scheduledTasks = useMemo(() => {
    return filteredTasks.filter((t) => t.plannedStartDate && t.plannedEndDate);
  }, [filteredTasks]);

  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter((t) => !t.plannedStartDate || !t.plannedEndDate);
  }, [filteredTasks]);

  // Unique assignees for filter
  const allAssignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.assignees) {
        for (const a of t.assignees) {
          map.set(a.userId, a.userName);
        }
      }
    }
    return Array.from(map.entries()).map(([userId, userName]) => ({ userId, userName }));
  }, [tasks]);

  // Calculate timeline date range
  const { startDate, endDate, totalDays, datesList } = useMemo(() => {
    const allDates: number[] = [];

    for (const t of scheduledTasks) {
      if (t.plannedStartDate) allDates.push(new Date(t.plannedStartDate).getTime());
      if (t.plannedEndDate) allDates.push(new Date(t.plannedEndDate).getTime());
    }

    for (const m of milestones) {
      if (m.dueDate) allDates.push(new Date(m.dueDate).getTime());
    }

    let minTime = allDates.length > 0 ? Math.min(...allDates) : Date.now();
    let maxTime = allDates.length > 0 ? Math.max(...allDates) : Date.now() + 30 * 86400000;

    // Buffer 7 days before and after
    minTime -= 7 * 86400000;
    maxTime += 14 * 86400000;

    const start = new Date(minTime);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxTime);
    end.setHours(23, 59, 59, 999);

    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(14, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      dates.push(d);
    }

    return {
      startDate: start,
      endDate: end,
      totalDays: days,
      datesList: dates,
    };
  }, [scheduledTasks, milestones]);

  // Width per day depending on scale
  const dayWidthPx = scale === 'day' ? 44 : scale === 'week' ? 24 : 12;
  const chartWidthPx = totalDays * dayWidthPx;

  // Coordinate helper: date string to X pixel
  const getXForDate = (dateStr: string) => {
    const d = new Date(dateStr).getTime();
    const start = startDate.getTime();
    const diffDays = (d - start) / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays * dayWidthPx);
  };

  // Status badge styling
  const getStatusColor = (status: string, isBlocked?: boolean, isOverdue?: boolean) => {
    if (isBlocked) return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
    if (isOverdue) return 'bg-rose-500/20 border-rose-500/50 text-rose-300';
    switch (status) {
      case 'completato':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
      case 'in_corso':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
      case 'in_revisione':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-300';
      case 'bloccato':
        return 'bg-rose-500/20 border-rose-500/50 text-rose-300';
      default:
        return 'bg-slate-500/20 border-slate-500/50 text-slate-300';
    }
  };

  const getBarGradient = (status: string, isBlocked?: boolean, isOverdue?: boolean) => {
    if (isBlocked) return 'from-amber-600 to-amber-700';
    if (isOverdue) return 'from-rose-600 to-rose-700';
    switch (status) {
      case 'completato':
        return 'from-emerald-600 to-teal-700';
      case 'in_corso':
        return 'from-blue-600 to-indigo-700';
      case 'in_revisione':
        return 'from-purple-600 to-indigo-700';
      case 'bloccato':
        return 'from-rose-600 to-rose-800';
      default:
        return 'from-slate-600 to-slate-700';
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayX = getXForDate(todayStr);

  return (
    <div className="space-y-4">
      {/* Controls & Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setScale('day')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scale === 'day' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Giorni
            </button>
            <button
              onClick={() => setScale('week')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scale === 'week' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Settimane
            </button>
            <button
              onClick={() => setScale('month')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scale === 'month' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mesi
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tutti gli stati</option>
            <option value="da_fare">Da fare</option>
            <option value="in_corso">In corso</option>
            <option value="in_revisione">In revisione</option>
            <option value="bloccato">Bloccato</option>
            <option value="completato">Completato</option>
          </select>

          {/* Assignee Filter */}
          {allAssignees.length > 0 && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tutti gli assegnatari</option>
              {allAssignees.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.userName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onAddTask && (
            <Button size="sm" onClick={onAddTask} className="flex items-center gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Nuova Attività</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Gantt Timeline Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex">
          {/* Left Fixed Column: Task Names */}
          <div className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/60 z-10 flex flex-col">
            <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider bg-slate-900">
              <span>Attività & Deliverables ({scheduledTasks.length})</span>
              <span className="text-[10px] text-slate-400 font-mono">Progresso</span>
            </div>

            <div className="divide-y divide-slate-850">
              {scheduledTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onTaskClick?.(t)}
                  className="h-12 px-3 flex items-center justify-between hover:bg-slate-800/60 cursor-pointer transition-colors group"
                >
                  <div className="overflow-hidden pr-2">
                    <div className="flex items-center gap-1.5">
                      {t.isBlocked && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />}
                      {t.isOverdue && <Clock className="h-3 w-3 text-rose-400 shrink-0" />}
                      <span className="text-xs font-medium text-slate-200 group-hover:text-blue-400 truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{t.plannedStartDate} → {t.plannedEndDate}</span>
                      {t.assignees && t.assignees.length > 0 && (
                        <span className="text-slate-400">• {t.assignees.map((a) => a.userName.split(' ')[0]).join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-medium text-slate-300">
                      {t.progressPercent}%
                    </span>
                  </div>
                </div>
              ))}

              {scheduledTasks.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nessuna attività pianificata con date inizio/fine.
                </div>
              )}
            </div>
          </div>

          {/* Right Scrollable Timeline View */}
          <div className="flex-1 overflow-x-auto relative">
            <div style={{ width: `${chartWidthPx}px` }} className="min-w-full relative select-none">
              {/* Timeline Header (Months & Days) */}
              <div className="h-14 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 flex flex-col justify-between">
                <div className="flex border-b border-slate-800/60 text-[10px] font-medium text-slate-400">
                  {datesList.filter((d, idx) => idx % (scale === 'month' ? 14 : scale === 'week' ? 7 : 3) === 0).map((d, i) => (
                    <div
                      key={i}
                      style={{ width: `${(scale === 'month' ? 14 : scale === 'week' ? 7 : 3) * dayWidthPx}px` }}
                      className="px-2 py-0.5 border-r border-slate-800/40 truncate uppercase font-mono font-semibold text-slate-300"
                    >
                      {d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}
                    </div>
                  ))}
                </div>

                <div className="flex text-[9px] font-mono text-slate-400">
                  {datesList.map((d, idx) => {
                    const isToday = d.toISOString().slice(0, 10) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    return (
                      <div
                        key={idx}
                        style={{ width: `${dayWidthPx}px` }}
                        className={`text-center py-1 border-r border-slate-800/30 ${
                          isToday ? 'bg-blue-900/30 text-blue-300 font-bold' : isWeekend ? 'bg-slate-950/40 text-slate-400' : ''
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Background */}
              <div className="relative">
                {/* Vertical Today Line */}
                <div
                  style={{ left: `${todayX}px` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500/60 z-10 pointer-events-none"
                  title="Oggi"
                >
                  <div className="sticky top-14 -ml-4 bg-blue-600 text-white text-[9px] font-bold px-1 rounded shadow">
                    Oggi
                  </div>
                </div>

                {/* Milestone Vertical Markers */}
                {milestones.map((m) => {
                  const mX = getXForDate(m.dueDate);
                  return (
                    <div
                      key={m.id}
                      style={{ left: `${mX}px` }}
                      className="absolute top-0 bottom-0 w-px bg-amber-500/50 z-10 pointer-events-none"
                      title={`Milestone: ${m.title} (${m.dueDate})`}
                    >
                      <div className="sticky top-16 -ml-3 bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                        <Flag className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[120px]">{m.title}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Task Bars Rows */}
                <div className="divide-y divide-slate-850/60">
                  {scheduledTasks.map((t, rowIdx) => {
                    const xStart = getXForDate(t.plannedStartDate!);
                    const xEnd = getXForDate(t.plannedEndDate!) + dayWidthPx;
                    const barWidth = Math.max(dayWidthPx, xEnd - xStart);

                    return (
                      <div key={t.id} className="h-12 relative flex items-center hover:bg-slate-900/30">
                        {/* Task Bar */}
                        <div
                          onClick={() => onTaskClick?.(t)}
                          style={{
                            left: `${xStart}px`,
                            width: `${barWidth}px`,
                          }}
                          className={`absolute h-7 rounded-lg border bg-gradient-to-r shadow-md cursor-pointer transition-all hover:scale-[1.01] hover:brightness-110 flex items-center overflow-hidden z-0 ${getBarGradient(
                            t.status,
                            t.isBlocked,
                            t.isOverdue
                          )} ${
                            t.isBlocked
                              ? 'border-amber-400 ring-1 ring-amber-400/40'
                              : t.isOverdue
                              ? 'border-rose-400 ring-1 ring-rose-400/40'
                              : 'border-slate-700'
                          }`}
                        >
                          {/* Progress Fill Indicator */}
                          <div
                            style={{ width: `${t.progressPercent}%` }}
                            className="absolute top-0 bottom-0 left-0 bg-white/20 pointer-events-none"
                          />

                          {/* Task Bar Label */}
                          <div className="relative z-10 px-2 flex items-center justify-between w-full text-[11px] font-semibold text-white truncate">
                            <span className="truncate pr-1">{t.title}</span>
                            <span className="text-[10px] font-mono opacity-90">{t.progressPercent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks Section */}
      {unscheduledTasks.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Attività non ancora pianificate ({unscheduledTasks.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unscheduledTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick?.(t)}
                className="bg-slate-950 border border-slate-800/80 hover:border-blue-500/50 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs font-semibold text-slate-200 truncate">{t.title}</h5>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {t.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {t.description || 'Nessuna descrizione specificata'}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-850 text-[10px] text-slate-400">
                  <span>Stima: {t.estimatedHours || 0} ore</span>
                  <span className="text-blue-400 hover:underline">Imposta date →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
