import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listSocialPosts, createSocialPost, generateSocialPedPlan } from '@/lib/local-growth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuth(['admin', 'operator']);
    const { searchParams } = new URL(request.url);

    const companyId = searchParams.get('companyId') || undefined;
    const channel = searchParams.get('channel') || undefined;
    const publishStatus = searchParams.get('publishStatus') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const posts = await listSocialPosts({
      companyId,
      channel,
      publishStatus,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero dei post' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['admin', 'operator']);
    const body = await request.json();

    // Case 1: Bulk AI PED Generation
    if (body.action === 'generate_ped') {
      const generated = await generateSocialPedPlan(
        {
          companyId: body.companyId,
          companyName: body.companyName,
          sector: body.sector,
          month: body.month,
          numPosts: body.numPosts ? Number(body.numPosts) : 12,
          channels: body.channels,
          toneOfVoice: body.toneOfVoice,
          targetAudience: body.targetAudience,
          focusGoal: body.focusGoal,
          specialEvents: body.specialEvents,
        },
        user
      );

      return NextResponse.json({
        success: true,
        message: `Piano editoriale generato con successo: creati ${generated.length} post.`,
        posts: generated,
      });
    }

    // Case 2: Single Post Creation
    if (!body.title || !body.caption) {
      return NextResponse.json(
        { error: 'Titolo e testo (caption) del post sono obbligatori' },
        { status: 400 }
      );
    }

    const post = await createSocialPost(
      {
        companyId: body.companyId,
        projectId: body.projectId,
        channel: body.channel,
        postType: body.postType,
        publishStatus: body.publishStatus,
        scheduledAt: body.scheduledAt,
        topic: body.topic,
        title: body.title,
        hook: body.hook,
        caption: body.caption,
        callToAction: body.callToAction,
        hashtags: body.hashtags,
        visualPrompt: body.visualPrompt,
        mediaUrls: body.mediaUrls,
        notes: body.notes,
      },
      user
    );

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del post' },
      { status: 500 }
    );
  }
}
