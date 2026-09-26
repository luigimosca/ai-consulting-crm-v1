'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  FolderKanban,
  Search,
  Briefcase,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Plus,
} from 'lucide-react';

export default function ProjectsListPage() {
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      let url = `/api/projects?t=${Date.now()}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pianificato':
        return <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-700">Pianificato</Badge>;
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Progetti Operativi</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {projectsList.length} Progetti
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Visione globale di tutti i progetti attivi, avanzamento percentuale, milestone e timeline Gantt.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per codice, titolo o commessa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
            className="pl-9 bg-slate-900/80 border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border-slate-800 text-xs w-full md:w-56"
          >
            <option value="all">Tutti gli stati</option>
            <option value="pianificato">Pianificato</option>
            <option value="in_corso">In Corso</option>
            <option value="in_pausa">In Pausa</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchProjects} className="shrink-0">
            Filtra
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Codice</th>
                <th className="py-3.5 px-4">Titolo & Commessa</th>
                <th className="py-3.5 px-4">Stato</th>
                <th className="py-3.5 px-4">Avanzamento</th>
                <th className="py-3.5 px-4">Responsabile</th>
                <th className="py-3.5 px-4">Scadenza</th>
                <th className="py-3.5 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Caricamento progetti in corso...
                  </td>
                </tr>
              ) : projectsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nessun progetto trovato. I progetti vengono collegati alle Commesse.
                  </td>
                </tr>
              ) : (
                projectsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {p.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{p.title}</div>
                      {p.orderCode && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Briefcase className="h-3 w-3 text-indigo-400" />
                          <span>Commessa: {p.orderCode} - {p.orderTitle}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{p.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${p.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {p.managerName || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {p.dueDate || 'N/D'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/crm/projects/${p.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Hub Progetto</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
