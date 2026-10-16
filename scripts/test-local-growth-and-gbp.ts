import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// 1. Pre-flight Verification & Isolation Setup BEFORE ANY MODULE IMPORT
// ---------------------------------------------------------------------------
const tempDbFile = path.join(
  os.tmpdir(),
  `crm_local_growth_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`
);
process.env.DATABASE_PATH = tempDbFile;

// Strict sanity check: fail immediately if pointing to an unsafe DB path
const resolvedPath = path.resolve(process.env.DATABASE_PATH);
if (
  !process.env.DATABASE_PATH ||
  resolvedPath.endsWith('sqlite.db') ||
  resolvedPath.includes('/data/') ||
  resolvedPath.startsWith('/data') ||
  resolvedPath === path.resolve(process.cwd(), 'sqlite.db')
) {
  throw new Error(
    `[CRITICAL SECURITY REFUSAL] Test execution aborted: DATABASE_PATH points to an unsafe or production database path (${resolvedPath}). Tests must run strictly on an isolated temporary database.`
  );
}

async function runLocalGrowthTests() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: LOCAL GROWTH HUB (FASI 1, 2, 3, 4) - ISOLATED RUN    ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

  const {
    initDatabase,
    db,
    users,
    companies,
    leads,
    crmAppointments,
  } = await import('../packages/db/src');

  const {
    generateSocialPedPlan,
    listSocialPosts,
    createSocialPost,
    deleteSocialPost,
    bulkApprovePosts,
    listGbpReviews,
    seedSampleGbpReviews,
    generateReviewAiReply,
    saveReviewReply,
    listGbpPosts,
    createGbpPost,
    upsertWhatsappAgent,
    getWhatsappAgent,
    simulateIncomingWhatsappMessage,
    listWhatsappConversations,
    replyWhatsappConversationAsOperator,
    generateOrUpdateLocalWebsite,
    getLocalWebsite,
    generateLocalSeoArticlesBatch,
    listLocalSeoArticles,
    createLocalSeoArticle,
    deleteLocalSeoArticle,
    getLocalGrowthStats,
  } = await import('../apps/web/src/lib/local-growth-service');

  const { eq } = await import('drizzle-orm');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    }
  }

  try {
    // Step 0: Init database schema
    initDatabase();
    console.log('[Setup] Database isolato inizializzato con successo.');

    // Create a mock user & test local company
    const testUser = {
      id: 'usr_local_growth_tester',
      name: 'Giulia Bianchi',
      email: 'giulia.bianchi@agency.it',
      passwordHash: 'dummy_hash',
      role: 'admin' as const,
      calendarSyncToken: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert(users).values(testUser).run();

    const userSession = {
      userId: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
    };

    const testCompany = {
      id: 'comp_ristorante_da_luigi',
      name: 'Trattoria Da Luigi',
      vatId: 'IT12345678901',
      fiscalCode: 'IT12345678901',
      sector: 'horeca_ristoranti',
      city: 'Roma',
      address: 'Via dei Coronari 45',
      phone: '+39 06 68801234',
      website: 'https://trattoriadaluigi.it',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert(companies).values(testCompany).run();

    // -------------------------------------------------------------------------
    // Test 1: AI PED Generator (Piano Editoriale 30 Giorni)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing AI PED 30-Day Content Generation (Fase 1) ---');
    const pedPosts = await generateSocialPedPlan(
      {
        companyId: testCompany.id,
        sector: 'horeca_ristoranti',
        month: '2026-11',
        numPosts: 12,
        channels: ['instagram', 'facebook', 'google_business'],
        toneOfVoice: 'accattivante_amichevole',
        focusGoal: 'brand_awareness',
      },
      userSession
    );

    assert(pedPosts.length === 12, `Generated 12 posts in PED plan (got ${pedPosts.length})`);
    assert(pedPosts[0].publishStatus === 'bozza', 'Initial status of generated posts is "bozza"');
    assert(!!pedPosts[0].hook && pedPosts[0].hook.length > 10, 'Hook generated correctly');
    assert(!!pedPosts[0].caption && pedPosts[0].caption.includes('Trattoria Da Luigi'), 'Caption mentions business name');
    assert(!!pedPosts[0].visualPrompt, 'Visual prompt suggestions included for creator/photographer');
    assert(!!pedPosts[0].scheduledAt && pedPosts[0].scheduledAt.startsWith('2026-11-'), 'Posts scheduled in target month 2026-11');

    const channelsInPed = new Set(pedPosts.map((p) => p.channel));
    assert(channelsInPed.has('instagram') && channelsInPed.has('facebook') && channelsInPed.has('google_business'), 'PED covers multi-channel mix (IG, FB, GBP)');

    // -------------------------------------------------------------------------
    // Test 2: Social Posts CRUD & Bulk Approval
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Social Posts CRUD & Bulk Approvals (Fase 1) ---');

    const manualPost = await createSocialPost(
      {
        companyId: testCompany.id,
        channel: 'instagram',
        title: 'Post Speciale San Valentino',
        caption: 'Festeggia l amore con il nostro menu a lume di candela...',
        callToAction: 'Prenota il tuo tavolo',
        hashtags: ['#sanvalentino', '#cenaaromantica'],
        publishStatus: 'bozza',
      },
      userSession
    );
    assert(!!manualPost.id, 'Manual social post created');

    const allPosts = await listSocialPosts({ companyId: testCompany.id });
    assert(allPosts.length === 13, `Listed 13 posts for company (got ${allPosts.length})`);

    const idsToApprove = [pedPosts[0].id, pedPosts[1].id, pedPosts[2].id, pedPosts[3].id];
    const approvedCount = await bulkApprovePosts(idsToApprove, userSession);
    assert(approvedCount === 4, `Bulk approved 4 posts`);

    const approvedPosts = await listSocialPosts({ companyId: testCompany.id, publishStatus: 'approvato' });
    assert(approvedPosts.length === 4, `Listed 4 approved posts`);

    const isDeleted = await deleteSocialPost(manualPost.id, userSession);
    assert(isDeleted === true, 'Social post deleted successfully');

    // -------------------------------------------------------------------------
    // Test 3: Google Business Profile (GBP) - Reviews & AI Reply
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing GBP Reviews & Local SEO AI Reply (Fase 2) ---');

    const seededReviews = await seedSampleGbpReviews(testCompany.id, userSession);
    assert(seededReviews.length === 4, `Seeded 4 realistic Google reviews`);

    const allReviews = await listGbpReviews({ companyId: testCompany.id });
    assert(allReviews.length === 4, `Listed 4 Google reviews`);

    const fiveStarRev = allReviews.find((r) => r.rating === 5)!;
    const aiReplyResult = await generateReviewAiReply(fiveStarRev.id, userSession);
    assert(aiReplyResult.sentiment === 'positivo', '5-star review classified as positive sentiment');
    assert(aiReplyResult.suggestedReply.includes('Trattoria Da Luigi'), 'AI Reply references company name naturally');
    assert(aiReplyResult.suggestedReply.length > 50, 'AI Reply is detailed and polite');

    const publishedRev = await saveReviewReply(
      fiveStarRev.id,
      aiReplyResult.suggestedReply,
      true,
      userSession
    );
    assert(publishedRev?.replyStatus === 'risposta_pubblicata', 'Review status updated to "risposta_pubblicata"');
    assert(!!publishedRev?.repliedAt, 'repliedAt timestamp set');

    const threeStarRev = allReviews.find((r) => r.rating === 3)!;
    const neutralReply = await generateReviewAiReply(threeStarRev.id, userSession);
    assert(neutralReply.sentiment === 'neutro', '3-star review classified as neutral sentiment');

    // -------------------------------------------------------------------------
    // Test 4: Google Business Profile (GBP) - Posts & Updates
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Google Business Profile Posts & Updates (Fase 2) ---');
    const gbpPost = await createGbpPost(
      {
        companyId: testCompany.id,
        postType: 'offerta',
        title: 'Sconto 20% Prenotando su Google Maps',
        summary: 'Approfitta della promozione infrasettimanale dal martedì al giovedì con calice di benvenuto offerto!',
        ctaType: 'PRENOTA',
        ctaUrl: 'https://trattoriadaluigi.it/prenota',
        couponCode: 'MAPS20',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      userSession
    );
    assert(!!gbpPost.id && gbpPost.id.startsWith('gbp_'), 'GBP offer post created');
    assert(gbpPost.status === 'pubblicato', 'GBP post status is pubblicato');

    const gbpList = await listGbpPosts(testCompany.id);
    assert(gbpList.length === 1, 'Listed 1 active GBP post');

    // -------------------------------------------------------------------------
    // Test 5: Fase 3 - Agente WhatsApp AI 24/7 & Automatic CRM Sync
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing WhatsApp AI Agent 24/7 & CRM Lead/Booking Sync (Fase 3) ---');
    const waAgent = await upsertWhatsappAgent(
      {
        companyId: testCompany.id,
        autoGenerateKnowledgeBase: true,
      },
      userSession
    );
    assert(!!waAgent.id && waAgent.id.startsWith('wa_agt_'), 'WhatsApp AI Agent provisioned');
    assert(waAgent.agentName.includes('Trattoria Da Luigi'), 'Agent name customized for company');
    assert(waAgent.faqs.length >= 3, `Agent Knowledge Base has ${waAgent.faqs.length} sector FAQs`);

    const fetchedAgent = await getWhatsappAgent(testCompany.id);
    assert(fetchedAgent?.id === waAgent.id, 'getWhatsappAgent retrieves provisioned agent');

    // Simulate incoming booking message
    const bookingConv = await simulateIncomingWhatsappMessage(
      {
        companyId: testCompany.id,
        customerName: 'Lorenzo Verdi',
        customerPhone: '+39 349 8877665',
        messageText: 'Ciao! Vorrei prenotare un tavolo per domani sera per 4 persone alle 20:30.',
      },
      userSession
    );
    assert(bookingConv.intentDetected === 'prenotazione_appuntamento', 'Booking intent accurately detected');
    assert(bookingConv.status === 'prenotazione_confermata', 'Booking status automatically confirmed');
    assert(!!bookingConv.linkedLeadId, 'Lead automatically captured and created in CRM leads table');
    assert(!!bookingConv.linkedAppointmentId, 'Appointment automatically created in CRM calendar');
    assert(bookingConv.messages.length === 2, 'Conversation contains customer message + AI response');

    // Verify CRM Lead and Appointment exist in DB
    const crmLead = db.select().from(leads).where(eq(leads.id, bookingConv.linkedLeadId!)).get();
    assert(!!crmLead && crmLead.phone === '+39 349 8877665', 'CRM Lead record verified in leads table');

    const crmAppt = db.select().from(crmAppointments).where(eq(crmAppointments.id, bookingConv.linkedAppointmentId!)).get();
    assert(!!crmAppt && crmAppt.status === 'confirmed', 'CRM Appointment record verified in crm_appointments table');

    // Simulate incoming price inquiry
    const priceConv = await simulateIncomingWhatsappMessage(
      {
        companyId: testCompany.id,
        customerName: 'Sara Neri',
        customerPhone: '+39 333 1122334',
        messageText: 'Buongiorno, quali sono i prezzi del menu degustazione e del business lunch?',
      },
      userSession
    );
    assert(priceConv.intentDetected === 'preventivo_listino', 'Price/Menu intent detected');
    assert(priceConv.messages[1].text.includes('€42'), 'AI reply quotes exact pricing from Knowledge Base');

    // Operator manual reply
    const afterOpReply = await replyWhatsappConversationAsOperator(
      priceConv.id,
      'Ciao Sara! Ti confermo che per il pranzo di lavoro non serve caparra.',
      'risolta_ai',
      userSession
    );
    assert(afterOpReply?.messages.length === 3, 'Operator reply appended to WhatsApp conversation');
    assert(afterOpReply?.messages[2].role === 'operator', '3rd message has role "operator"');

    const convList = await listWhatsappConversations({ companyId: testCompany.id });
    assert(convList.length === 2, `Listed 2 WhatsApp conversations (got ${convList.length})`);

    // -------------------------------------------------------------------------
    // Test 6: Fase 4 - Sito Vetrina & Blog SEO Locale Automatizzato
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Local SEO Website, Schema.org JSON-LD & Automated Blog (Fase 4) ---');
    const website = await generateOrUpdateLocalWebsite(
      {
        companyId: testCompany.id,
        targetCity: 'Roma',
        autoOptimizeAi: true,
      },
      userSession
    );
    assert(!!website.id && website.id.startsWith('seo_web_'), 'Local SEO Website configuration created');
    assert(website.targetCity === 'Roma', 'Target city set to Roma');
    assert(website.targetKeywords.length >= 6, `Generated ${website.targetKeywords.length} geolocalized SEO keywords`);
    assert(website.servicesShowcase.length === 3, 'Generated 3 structured service showcase cards');
    assert(!!website.schemaMarkupJson && website.schemaMarkupJson.includes('Restaurant'), 'Generated valid Schema.org Restaurant JSON-LD');

    const fetchedWeb = await getLocalWebsite(testCompany.id);
    assert(fetchedWeb?.id === website.id, 'getLocalWebsite returns website config');

    // Generate 4 automated SEO blog articles
    const articles = await generateLocalSeoArticlesBatch(
      {
        companyId: testCompany.id,
        targetCity: 'Roma',
        count: 4,
      },
      userSession
    );
    assert(articles.length === 4, `Generated 4 geolocalized SEO blog articles`);
    assert(articles[0].targetCity === 'Roma', 'Articles geolocalized for Roma');
    assert(articles[0].contentHtml.includes('<h2>') && articles[0].contentHtml.includes('Trattoria Da Luigi'), 'Article HTML contains structured headings and business name');
    assert(articles[0].seoScore >= 94, `High SEO score verified (${articles[0].seoScore}/100)`);

    // Create & delete custom SEO article
    const customArt = await createLocalSeoArticle(
      {
        companyId: testCompany.id,
        title: 'I Migliori Vini Laziali da Abbinare alla Carbonara a Roma',
        targetKeyword: 'vini carbonara roma',
        targetCity: 'Roma',
        contentHtml: '<article><h2>Guida agli abbinamenti a Roma</h2><p>Scopri la cantina di Trattoria Da Luigi.</p></article>',
      },
      userSession
    );
    assert(!!customArt.id, 'Custom SEO blog article created');

    const listedArts = await listLocalSeoArticles({ companyId: testCompany.id });
    assert(listedArts.length === 5, `Listed 5 total SEO articles (got ${listedArts.length})`);

    const artDeleted = await deleteLocalSeoArticle(customArt.id, userSession);
    assert(artDeleted === true, 'Custom SEO blog article deleted');

    // -------------------------------------------------------------------------
    // Test 7: Overall Local Growth Metrics & Stats Aggregator (Fasi 1-4)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Overall Local Growth Stats (Fasi 1, 2, 3, 4) ---');
    const stats = await getLocalGrowthStats(testCompany.id);
    assert(stats.social.totalPosts === 12, `Total social posts is 12`);
    assert(stats.social.approvedPosts === 4, `Approved posts count is 4`);
    assert(stats.gbp.totalReviews === 4, 'Total reviews is 4');
    assert(stats.gbp.repliedReviews === 1, 'Replied reviews count is 1');
    assert(stats.gbp.activeUpdatesCount === 1, 'Active GBP updates count is 1');
    assert(stats.whatsapp.activeAgents === 1, '1 active WhatsApp AI agent');
    assert(stats.whatsapp.totalConversations === 2, '2 WhatsApp conversations tracked');
    assert(stats.whatsapp.confirmedBookings === 1, '1 confirmed WhatsApp booking');
    assert(stats.whatsapp.leadsCaptured === 2, '2 WhatsApp leads captured into CRM');
    assert(stats.seo.websitesCount === 1, '1 Local SEO website active');
    assert(stats.seo.totalArticles === 4, '4 Local SEO blog articles active');
    assert(stats.seo.avgSeoScore >= 95, `Average SEO score is ${stats.seo.avgSeoScore}/100`);

    console.log('\n========================================================================');
    console.log(`=== ALL LOCAL GROWTH TESTS PASSED: ${passedTests}/${totalTests} SUCCESSFUL ===`);
    console.log('========================================================================\n');
  } finally {
    // Cleanup isolated temp DB
    if (fs.existsSync(tempDbFile)) {
      try {
        fs.unlinkSync(tempDbFile);
        console.log(`[Cleanup] File temporaneo rimosso: ${tempDbFile}`);
      } catch (e) {
        console.warn(`[Cleanup Warning] Impossibile rimuovere ${tempDbFile}:`, e);
      }
    }
  }
}

runLocalGrowthTests().catch((err) => {
  console.error('\n❌ LOCAL GROWTH TEST RUNNER FATAL ERROR:', err);
  process.exit(1);
});
