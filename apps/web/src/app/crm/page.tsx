import React from 'react';
import Link from 'next/link';
import { db, leads, demoRequests } from '@ai-crm/db';
import { desc } from 'drizzle-orm';
import { Header } from '@/components/crm/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatSector, formatStatus, getStatusBadgeVariant } from '@/lib/utils';
import { 
  Users, 
  Flame, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Search, 
  Sparkles, 
  ArrowRight,
  Building2,
  Phone,
  Mail
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CrmDashboardPage() {
  const allLeads = db.select().from(leads).orderBy(desc(leads.createdAt)).all();
  const allDemos = db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt)).all();

  // Metrics
  const totalLeads = allLeads.length;
  const hotLeads = allLeads.filter((l) => l.score >= 75).length;
  const totalDemos = allDemos.length;
  const convertedLeads = allLeads.filter((l) => l.status === 'convertito' || l.status === 'qualificato').length;

  // Sectors breakdown
  const sectorCounts: Record<string, number> = {};
  allLeads.forEach((l) => {
    sectorCounts[l.sector] = (sectorCounts[l.sector] || 0) + 1;
  });

  const recentHotLeads = allLeads
    .filter((l) => l.score >= 50)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header with Quick Actions */}
      <Header
        title="Dashboard Agenzia AI"
        description="Panoramica su lead acquisiti, conversioni demo e opportunità per settore."
        action={
          <div className="flex items-center gap-2.5">
            <Link href="/crm/lead-gen">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Search className="h-3.5 w-3.5 text-blue-400" />
                <span>Trova Lead (Maps)</span>
              </Button>
            </Link>
            <Link href="/crm/enrichment">
              <Button variant="glow" size="sm" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Enrichment AI</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Totale Lead Acquisiti</p>
              <p className="text-2xl font-bold text-white mt-1">{totalLeads}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{hotLeads}</span> ad alto punteggio
          </p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Lead Caldi (Score 75+)</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{hotLeads}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            {totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0}% del database totale
          </p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Richieste Demo Sito</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{totalDemos}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
            Inbound da Chatbot e form
          </p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Qualificati & Convertiti</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{convertedLeads}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            In trattativa commerciale
          </p>
        </Card>
      </div>

      {/* 2 Column Layout: Sectors + Recent Hot Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector Distribution */}
        <Card className="bg-slate-900/80 border-slate-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Distribuzione per Settore
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(sectorCounts).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nessun dato di settore disponibile.</p>
            ) : (
              Object.entries(sectorCounts).map(([sec, count]) => {
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={sec} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{formatSector(sec)}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Priority Hot Leads */}
        <Card className="bg-slate-900/80 border-slate-800 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-emerald-400" />
                Lead ad Alta Priorità (Score Top)
              </CardTitle>
              <Link
                href="/crm/leads"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>Vedi tutti</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {recentHotLeads.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nessun lead recente. Usa il tool di Lead Generation per trovarne di nuovi.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentHotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/20 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                        <Building2 className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="text-sm font-semibold text-white hover:text-blue-400 transition-colors"
                        >
                          {lead.companyName}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{formatSector(lead.sector)}</span>
                          {lead.city && <span>• {lead.city}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ScoreBadge score={lead.score} />
                      <Badge variant={getStatusBadgeVariant(lead.status)}>
                        {formatStatus(lead.status)}
                      </Badge>
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demo Requests from Website */}
      {allDemos.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" />
                Richieste Demo Inbound dal Sito Pubblico
              </CardTitle>
              <Badge variant="purple">{allDemos.length} Richieste</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Referente</th>
                    <th className="px-4 py-2.5 font-semibold">Contatti</th>
                    <th className="px-4 py-2.5 font-semibold">Settore</th>
                    <th className="px-4 py-2.5 font-semibold">Team</th>
                    <th className="px-4 py-2.5 font-semibold">Disponibilità</th>
                    <th className="px-4 py-2.5 font-semibold">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allDemos.slice(0, 5).map((demo) => (
                    <tr key={demo.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-white">
                        {demo.contactName}
                      </td>
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Mail className="h-3 w-3 text-blue-400" />
                          <span>{demo.contactEmail}</span>
                        </div>
                        {demo.contactPhone && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Phone className="h-3 w-3 text-emerald-400" />
                            <span>{demo.contactPhone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 font-medium">
                          {formatSector(demo.sector || 'local_services')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {demo.companySize || 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {demo.preferredDate || 'Prima possibile'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={demo.status === 'confirmed' ? 'success' : 'warning'}>
                          {demo.status === 'confirmed' ? 'Confermata' : 'In attesa'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
