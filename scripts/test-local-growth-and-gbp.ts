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
  console.log('=== TEST SUITE: LOCAL GROWTH HUB (SOCIAL PED & GBP) - ISOLATED RUN ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

  const {
    initDatabase,
    db,
    users,
    companies,
    localSocialPosts,
    localGbpReviews,
    localGbpPosts,
  } = await import('../packages/db/src');

  const {
    generateSocialPedPlan,
    listSocialPosts,
    createSocialPost,
    updateSocialPost,
    deleteSocialPost,
    bulkApprovePosts,
    listGbpReviews,
    seedSampleGbpReviews,
    generateReviewAiReply,
    saveReviewReply,
    listGbpPosts,
    createGbpPost,
    getLocalGrowthStats,
  } = await import('../apps/web/src/lib/local-growth-service');

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
      role: 'admin',
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
      vatNumber: 'IT12345678901',
      taxCode: 'IT12345678901',
      sector: 'horeca_ristoranti',
      city: 'Roma',
      address: 'Via dei Coronari 45',
      website: 'https://trattoriadaluigi.it',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert(companies).values(testCompany).run();

    // -------------------------------------------------------------------------
    // Test 1: AI PED Generator (Piano Editoriale 30 Giorni)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing AI PED 30-Day Content Generation ---');
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

    // Verify channel mix
    const channelsInPed = new Set(pedPosts.map((p) => p.channel));
    assert(channelsInPed.has('instagram') && channelsInPed.has('facebook') && channelsInPed.has('google_business'), 'PED covers multi-channel mix (IG, FB, GBP)');

    // -------------------------------------------------------------------------
    // Test 2: Social Posts CRUD & Bulk Approval
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Social Posts CRUD & Bulk Approvals ---');

    // Create a manual post
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

    // List posts
    const allPosts = await listSocialPosts({ companyId: testCompany.id });
    assert(allPosts.length === 13, `Listed 13 posts for company (got ${allPosts.length})`);

    // Bulk approve first 4 posts
    const idsToApprove = [pedPosts[0].id, pedPosts[1].id, pedPosts[2].id, pedPosts[3].id];
    const approvedCount = await bulkApprovePosts(idsToApprove, userSession);
    assert(approvedCount === 4, `Bulk approved 4 posts`);

    // Verify approved status
    const approvedPosts = await listSocialPosts({ companyId: testCompany.id, publishStatus: 'approvato' });
    assert(approvedPosts.length === 4, `Listed 4 approved posts`);

    // Delete manual post
    const isDeleted = await deleteSocialPost(manualPost.id, userSession);
    assert(isDeleted === true, 'Social post deleted successfully');

    // -------------------------------------------------------------------------
    // Test 3: Google Business Profile (GBP) - Reviews & AI Reply
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing GBP Reviews & Local SEO AI Reply ---');

    // Seed sample reviews
    const seededReviews = await seedSampleGbpReviews(testCompany.id, userSession);
    assert(seededReviews.length === 4, `Seeded 4 realistic Google reviews`);

    // List reviews
    const allReviews = await listGbpReviews({ companyId: testCompany.id });
    assert(allReviews.length === 4, `Listed 4 Google reviews`);

    // Test AI Reply generation for 5-star review
    const fiveStarRev = allReviews.find((r) => r.rating === 5)!;
    const aiReplyResult = await generateReviewAiReply(fiveStarRev.id, userSession);
    assert(aiReplyResult.sentiment === 'positivo', '5-star review classified as positive sentiment');
    assert(aiReplyResult.suggestedReply.includes('Trattoria Da Luigi'), 'AI Reply references company name naturally');
    assert(aiReplyResult.suggestedReply.length > 50, 'AI Reply is detailed and polite');

    // Save and Publish Reply
    const publishedRev = await saveReviewReply(
      fiveStarRev.id,
      aiReplyResult.suggestedReply,
      true, // publishNow
      userSession
    );
    assert(publishedRev?.replyStatus === 'risposta_pubblicata', 'Review status updated to "risposta_pubblicata"');
    assert(!!publishedRev?.repliedAt, 'repliedAt timestamp set');

    // Test AI Reply for 3-star review
    const threeStarRev = allReviews.find((r) => r.rating === 3)!;
    const neutralReply = await generateReviewAiReply(threeStarRev.id, userSession);
    assert(neutralReply.sentiment === 'neutro', '3-star review classified as neutral sentiment');
    assert(neutralReply.suggestedReply.includes('Trattoria Da Luigi'), 'Neutral AI reply customized for company');

    // -------------------------------------------------------------------------
    // Test 4: Google Business Profile (GBP) - Posts & Updates
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Google Business Profile Posts & Updates ---');
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
    assert(gbpList[0].post.couponCode === 'MAPS20', 'Coupon code preserved');

    // -------------------------------------------------------------------------
    // Test 5: Local Growth Metrics & Stats Aggregator
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Overall Local Growth Stats ---');
    const stats = await getLocalGrowthStats(testCompany.id);
    assert(stats.social.totalPosts === 12, `Total social posts is 12 (got ${stats.social.totalPosts})`);
    assert(stats.social.approvedPosts === 4, `Approved posts count is 4 (got ${stats.social.approvedPosts})`);
    assert(stats.social.pendingPosts === 8, `Pending draft posts count is 8 (got ${stats.social.pendingPosts})`);

    assert(stats.gbp.totalReviews === 4, 'Total reviews is 4');
    assert(stats.gbp.repliedReviews === 1, 'Replied reviews count is 1');
    assert(stats.gbp.pendingReplies === 3, 'Pending reviews count is 3');
    assert(parseFloat(stats.gbp.avgRating) > 4.0, `Average rating is high (>4.0: ${stats.gbp.avgRating})`);
    assert(stats.gbp.activeUpdatesCount === 1, 'Active GBP updates count is 1');

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
