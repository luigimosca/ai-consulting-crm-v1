'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCentsToCurrency } from '@/lib/money';
import {
  Briefcase,
  Search,
  Building2,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  User,
  Plus,
} from 'lucide-react';

export default function CommesseListPage() {
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let url = `/api/orders?t=${Date.now()}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'da_avviare':
        return <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-700">Da Avviare</Badge>;
      case 'attiva':
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Attiva & In Corso</Badge>;
      case 'sospesa':
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">Sospesa</Badge>;
      case 'completata':
        return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">Completata</Badge>;
      case 'annullata':
        return <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30">Annullata</Badge>;
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Commesse Operative</h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              {ordersList.length} Commesse
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestione commesse generate da preventivi accettati: budget concordato, timeline, progetti e avanzamento.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per codice commessa, titolo o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
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
            <option value="da_avviare">Da Avviare</option>
            <option value="attiva">Attiva</option>
            <option value="sospesa">Sospesa</option>
            <option value="completata">Completata</option>
            <option value="annullata">Annullata</option>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchOrders} className="shrink-0">
            Filtra
          </Button>
        </div>
      </div>

      {/* Commesse Table */}
      <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Codice</th>
                <th className="py-3.5 px-4">Oggetto & Cliente</th>
                <th className="py-3.5 px-4">Stato</th>
                <th className="py-3.5 px-4">Valore Concordato</th>
                <th className="py-3.5 px-4">Responsabile</th>
                <th className="py-3.5 px-4">Progetti Collegati</th>
                <th className="py-3.5 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Caricamento commesse in corso...
                  </td>
                </tr>
              ) : ordersList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nessuna commessa trovata. Le commesse vengono generate automaticamente all&apos;accettazione di un preventivo.
                  </td>
                </tr>
              ) : (
                ordersList.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      {o.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{o.title}</div>
                      {o.leadCompanyName && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{o.leadCompanyName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(o.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {formatCentsToCurrency(o.agreedValue, o.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {o.managerName || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                        <span>{o.projectCount} {o.projectCount === 1 ? 'Progetto' : 'Progetti'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/crm/commesse/${o.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Dettaglio Commessa</span>
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
