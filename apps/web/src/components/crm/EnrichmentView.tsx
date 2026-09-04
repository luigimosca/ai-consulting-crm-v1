import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

export interface EnrichmentDataDisplay {
  domain?: string;
  techStack?: {
    cms?: string;
    analytics?: string;
    chat?: boolean | string;
    booking?: boolean | string;
    ecommerce?: boolean | string;
  };
  digitalMaturity?: 'bassa' | 'media' | 'alta';
  estimatedRevenueRange?: string;
  employeeCountRange?: string;
  detectedGaps?: string[];
  aiOpportunities?: string[];
  suggestedOffer?: string;
  summary?: string;
  enrichedAt?: string;
}

export function EnrichmentView({ data }: { data?: EnrichmentDataDisplay | null }) {
  if (!data) {
    return (
      <Card className="border-dashed border-slate-800 bg-slate-900/30 text-center py-10">
        <Sparkles className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">Nessun dato di arricchimento AI</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Esegui l&apos;analisi automatica del dominio per estrarre tech stack, livello di digitalizzazione e opportunità AI.
        </p>
      </Card>
    );
  }

  const maturityBadgeVariant = 
    data.digitalMaturity === 'alta' ? 'success' : 
    data.digitalMaturity === 'media' ? 'warning' : 'default';

  return (
    <div className="space-y-6">
      {/* Top Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Maturità Digitale</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={maturityBadgeVariant} className="uppercase font-bold tracking-wider text-[11px]">
                  {data.digitalMaturity || 'media'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Fatturato Stimato</p>
              <p className="text-sm font-semibold text-white mt-0.5">{data.estimatedRevenueRange || 'N/D'}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Dimensione Team</p>
              <p className="text-sm font-semibold text-white mt-0.5">{data.employeeCountRange || 'N/D'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tech Stack Breakdown */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-sm">Stack Tecnologico Rilevato</CardTitle>
            </div>
            {data.domain && (
              <span className="text-xs text-slate-400 font-mono">{data.domain}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <p className="text-slate-400 mb-1">CMS / Framework</p>
              <p className="font-semibold text-slate-200">{data.techStack?.cms || 'Nessuno'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <p className="text-slate-400 mb-1">Analytics & Tracking</p>
              <p className="font-semibold text-slate-200">{data.techStack?.analytics || 'Nessuno'}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <p className="text-slate-400 mb-1">Live Chat / WhatsApp</p>
              <div className="flex items-center gap-1.5 font-semibold">
                {data.techStack?.chat ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-200">{typeof data.techStack.chat === 'string' ? data.techStack.chat : 'Attivo'}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-rose-300">Non presente</span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <p className="text-slate-400 mb-1">Booking / Prenotazioni</p>
              <div className="flex items-center gap-1.5 font-semibold">
                {data.techStack?.booking ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-200">{typeof data.techStack.booking === 'string' ? data.techStack.booking : 'Attivo'}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-rose-300">Non presente</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gaps & Opportunities Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-sm">Lacune & Punti Deboli Rilevati</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {data.detectedGaps && data.detectedGaps.length > 0 ? (
                data.detectedGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{gap}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400">Nessuna lacuna critica rilevata.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm">Opportunità di Vendita AI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {data.aiOpportunities && data.aiOpportunities.length > 0 ? (
                data.aiOpportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{opp}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400">Nessuna opportunità generata.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Strategy Box */}
      {data.suggestedOffer && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-800/40">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Proposta Consigliata dall&apos;AI</span>
          </div>
          <p className="text-sm font-semibold text-white">{data.suggestedOffer}</p>
          {data.summary && (
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{data.summary}</p>
          )}
        </div>
      )}
    </div>
  );
}
