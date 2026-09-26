import { NextResponse } from 'next/server';
import { db, processTemplates, processTemplateVersions } from '@ai-crm/db';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getProcessTemplateById } from '@/lib/process-templates-service';
import { validateTemplateGraphAcyclic } from '@ai-crm/ai';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const data = await getProcessTemplateById(id);
    if (!data) {
      return NextResponse.json({ error: 'Modello di processo non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero modello' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['admin']);
    const { id } = await params;
    const body = await request.json();

    const template = db.select().from(processTemplates).where(eq(processTemplates.id, id)).get();
    if (!template) {
      return NextResponse.json({ error: 'Modello non trovato' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Aggiornamento metadati di base del template (nome, descrizione, categoria, stato)
    const updatePayload: any = { updatedAt: now };
    if (body.name) updatePayload.name = body.name.trim();
    if (body.description !== undefined) updatePayload.description = body.description?.trim() || null;
    if (body.category) updatePayload.category = body.category;
    if (body.status) updatePayload.status = body.status;

    db.update(processTemplates).set(updatePayload).where(eq(processTemplates.id, id)).run();

    // 2. Se viene inviata una nuova o modificata definizione:
    if (body.definition) {
      const graphCheck = validateTemplateGraphAcyclic(
        body.definition.tasks || [],
        body.definition.dependencies || []
      );
      if (!graphCheck.isValid) {
        return NextResponse.json(
          { error: graphCheck.error || 'Grafo di dipendenze non valido' },
          { status: 400 }
        );
      }

      // Controlla se l'ultima versione è una bozza modificabile
      const latestVersion = db
        .select()
        .from(processTemplateVersions)
        .where(eq(processTemplateVersions.templateId, id))
        .orderBy(desc(processTemplateVersions.versionNumber))
        .get();

      if (latestVersion && latestVersion.status === 'draft') {
        // Aggiorna la bozza esistente
        db.update(processTemplateVersions)
          .set({
            definitionJson: JSON.stringify(body.definition),
            changelog: body.changelog !== undefined ? body.changelog : latestVersion.changelog,
          })
          .where(eq(processTemplateVersions.id, latestVersion.id))
          .run();
      } else {
        // L'ultima versione è pubblicata (immutabile): creiamo una nuova versione bozza con numero incrementato!
        const nextVerNumber = (latestVersion?.versionNumber || 0) + 1;
        const newVerId = `tmpl_ver_${id}_v${nextVerNumber}_${Date.now()}`;

        db.insert(processTemplateVersions)
          .values({
            id: newVerId,
            templateId: id,
            versionNumber: nextVerNumber,
            status: 'draft',
            changelog: body.changelog || `Bozza per nuova versione v${nextVerNumber}`,
            definitionJson: JSON.stringify(body.definition),
            createdBy: user.userId,
            createdAt: now,
          })
          .run();
      }
    }

    await logActivity({
      entityType: 'process_template',
      entityId: id,
      action: 'update_template',
      performedBy: user.userId,
      details: { name: body.name, hasNewDefinition: !!body.definition },
    });

    const updated = await getProcessTemplateById(id);
    return NextResponse.json({ success: true, ...updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permesso negato: solo gli amministratori possono modificare i modelli' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento modello' }, { status: 500 });
  }
}
