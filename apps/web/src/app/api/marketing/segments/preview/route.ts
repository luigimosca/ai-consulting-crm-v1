import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  evaluateSegmentCandidates,
  generateNaturalLanguageSummary,
  type SegmentRules,
} from '@/lib/marketing-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const body = await request.json();

    const rules: SegmentRules = body.rules || {};
    const targetType: 'leads' | 'companies' = body.targetType || 'leads';
    const limit: number = body.limit ? Number(body.limit) : 50;

    const summary = generateNaturalLanguageSummary(rules, targetType);
    const evaluation = await evaluateSegmentCandidates(rules, targetType, limit);

    return NextResponse.json({
      success: true,
      summary,
      totalCount: evaluation.totalCount,
      eligibleCount: evaluation.eligibleCount,
      candidates: evaluation.candidates,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la simulazione del segmento' },
      { status: 500 }
    );
  }
}
