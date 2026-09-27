import {
  db,
  clientPlatformAccounts,
  projectPlatformAccountLinks,
  companies,
  projects,
  clientRequests,
  clientRequestItems,
  documents,
  users,
  activityLog,
} from '@ai-crm/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import {
  UserSessionPayload,
  canUserAccessCompanyAccounts,
  canUserAccessPlatformAccount,
  checkUserProjectAccess,
} from './auth';

export type VerificationType = 'manual_operator' | 'api_integration';

export type PlatformType =
  | 'dns_registrar'
  | 'hosting_server'
  | 'cms_wordpress'
  | 'google_analytics_4'
  | 'google_search_console'
  | 'google_tag_manager'
  | 'google_ads_account'
  | 'google_business_profile'
  | 'meta_business_manager'
  | 'meta_pixel_dataset'
  | 'meta_facebook_page'
  | 'meta_instagram_business'
  | 'booking_engine_tour'
  | 'other_custom';

export type AccountStatus =
  | 'not_requested'
  | 'requested'
  | 'declared_by_client'
  | 'verified_active'
  | 'revoked'
  | 'expired';

export type AccessMethod =
  | 'agency_mcc_partner'
  | 'delegated_agency_email'
  | 'service_account_readonly'
  | 'partner_business_manager'
  | 'manual_shared_access'
  | 'other';

export type AccessLevel = 'admin' | 'standard_edit' | 'read_only_analytics' | 'finance_only';

/**
 * Validates that no sensitive secrets (passwords, private API keys, bearer tokens)
 * are accidentally sent or stored in DB, logs, or attachments.
 */
export function assertNoSensitiveData(data: Record<string, any>) {
  if (!data || typeof data !== 'object') return;

  const secretKeywords = ['password', 'passwd', 'secret_key', 'private_key', 'token_secret', 'api_secret', 'apikey', 'secret'];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (secretKeywords.some((kw) => lowerKey.includes(kw))) {
      throw new Error(`SECURITY_VIOLATION: Campo sensibile vietato rilevato: '${key}'. Nessuna password o token deve essere salvata nel CRM.`);
    }

    if (typeof value === 'string') {
      const lowerVal = value.toLowerCase();
      if (
        lowerVal.startsWith('bearer ') ||
        lowerVal.startsWith('ghp_') ||
        lowerVal.startsWith('eyjh') ||
        lowerVal.startsWith('aizasy') ||
        lowerVal.startsWith('sk-') ||
        lowerVal.includes('password=') ||
        lowerVal.includes('passwd=')
      ) {
        throw new Error(`SECURITY_VIOLATION: Valore sensibile vietato rilevato nel campo '${key}'. Nessun segreto o password deve essere memorizzato.`);
      }
    } else if (typeof value === 'object' && value !== null) {
      assertNoSensitiveData(value);
    }
  }
}

export interface CreateAccountInput {
  companyId: string;
  projectId?: string;
  platformType: PlatformType;
  accountName: string;
  externalId?: string;
  externalUrl?: string;
  accessMethod?: AccessMethod;
  accessLevel?: AccessLevel;
  delegatedToIdentifier?: string;
  status?: AccountStatus;
  notes?: string;
  evidenceDocumentId?: string;
  originClientRequestId?: string;
  originClientRequestItemId?: string;
}

export interface UpdateAccountInput {
  platformType?: PlatformType;
  accountName?: string;
  externalId?: string;
  externalUrl?: string;
  accessMethod?: AccessMethod;
  accessLevel?: AccessLevel;
  delegatedToIdentifier?: string;
  status?: AccountStatus;
  notes?: string;
  evidenceDocumentId?: string;
  revocationReason?: string;
}

export interface VerifyAccountInput {
  verificationType?: VerificationType;
  verificationMethod: string;
  verificationNotes?: string;
  evidenceDocumentId?: string;
}

export interface RevokeAccountInput {
  revocationReason?: string;
  notes?: string;
}

/**
 * Lists all platform accounts belonging to a company.
 */
export async function getCompanyPlatformAccounts(companyId: string, user: UserSessionPayload) {
  if (!canUserAccessCompanyAccounts(user, companyId, 'viewer')) {
    throw new Error('FORBIDDEN');
  }

  const accounts = db
    .select()
    .from(clientPlatformAccounts)
    .where(eq(clientPlatformAccounts.companyId, companyId))
    .orderBy(desc(clientPlatformAccounts.createdAt))
    .all();

  // Attach linked projects to each account
  const results = [];
  for (const acc of accounts) {
    const links = db
      .select({
        id: projectPlatformAccountLinks.id,
        projectId: projectPlatformAccountLinks.projectId,
        linkedAt: projectPlatformAccountLinks.linkedAt,
        projectTitle: projects.title,
        projectCode: projects.code,
      })
      .from(projectPlatformAccountLinks)
      .leftJoin(projects, eq(projectPlatformAccountLinks.projectId, projects.id))
      .where(eq(projectPlatformAccountLinks.accountId, acc.id))
      .all();

    if (user.role !== 'admin' && links.length > 0) {
      const hasAccessToAnyLinked = links.some((l) => checkUserProjectAccess(user, l.projectId, 'viewer'));
      if (!hasAccessToAnyLinked) {
        continue; // Hide account exclusive to other projects
      }
    }

    let verifierName = null;
    if (acc.verifiedByUserId) {
      const verifier = db.select({ name: users.name }).from(users).where(eq(users.id, acc.verifiedByUserId)).get();
      verifierName = verifier?.name || null;
    }

    let revokerName = null;
    if (acc.revokedByUserId) {
      const revoker = db.select({ name: users.name }).from(users).where(eq(users.id, acc.revokedByUserId)).get();
      revokerName = revoker?.name || null;
    }

    results.push({
      ...acc,
      linkedProjects: links,
      verifierName,
      revokerName,
    });
  }

  return results;
}

/**
 * Lists all platform accounts linked to a project or belonging to its company.
 */
export async function getProjectPlatformAccounts(projectId: string, user: UserSessionPayload) {
  if (!checkUserProjectAccess(user, projectId, 'viewer')) {
    throw new Error('FORBIDDEN');
  }

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project || !project.companyId) {
    return [];
  }

  // Get accounts explicitly linked to this project
  const linked = db
    .select({
      accountId: projectPlatformAccountLinks.accountId,
      linkId: projectPlatformAccountLinks.id,
      linkedAt: projectPlatformAccountLinks.linkedAt,
    })
    .from(projectPlatformAccountLinks)
    .where(eq(projectPlatformAccountLinks.projectId, projectId))
    .all();

  const linkedMap = new Map(linked.map((l) => [l.accountId, l]));

  // Get all company accounts
  const companyAccounts = db
    .select()
    .from(clientPlatformAccounts)
    .where(eq(clientPlatformAccounts.companyId, project.companyId))
    .orderBy(desc(clientPlatformAccounts.createdAt))
    .all();

  // Find all project links for these accounts
  const allLinks = db
    .select({
      accountId: projectPlatformAccountLinks.accountId,
      projectId: projectPlatformAccountLinks.projectId,
    })
    .from(projectPlatformAccountLinks)
    .all();

  const linksByAccount = new Map<string, string[]>();
  for (const l of allLinks) {
    if (!linksByAccount.has(l.accountId)) linksByAccount.set(l.accountId, []);
    linksByAccount.get(l.accountId)!.push(l.projectId);
  }

  // Filter accounts:
  // - If account is linked to this project: always visible to operator on this project
  // - If user is global admin: all accounts visible
  // - If account is NOT linked to this project:
  //   * If it is linked to OTHER project(s): operator must have access to at least one of those other projects, otherwise hidden.
  //   * If it is not linked to any project (generic company account draft): visible to company operators.
  const visibleAccounts = companyAccounts.filter((acc) => {
    if (linkedMap.has(acc.id)) return true;
    if (user.role === 'admin') return true;

    const otherProjectIds = linksByAccount.get(acc.id) || [];
    if (otherProjectIds.length > 0) {
      return otherProjectIds.some((otherPid) => checkUserProjectAccess(user, otherPid, 'viewer'));
    }
    return true;
  });

  return visibleAccounts.map((acc) => {
    const linkInfo = linkedMap.get(acc.id);
    let verifierName = null;
    if (acc.verifiedByUserId) {
      const verifier = db.select({ name: users.name }).from(users).where(eq(users.id, acc.verifiedByUserId)).get();
      verifierName = verifier?.name || null;
    }

    let revokerName = null;
    if (acc.revokedByUserId) {
      const revoker = db.select({ name: users.name }).from(users).where(eq(users.id, acc.revokedByUserId)).get();
      revokerName = revoker?.name || null;
    }

    return {
      ...acc,
      isLinkedToProject: !!linkInfo,
      projectLinkId: linkInfo?.linkId || null,
      projectLinkedAt: linkInfo?.linkedAt || null,
      verifierName,
      revokerName,
    };
  });
}

/**
 * Retrieves a single platform account by ID with access check.
 */
export async function getPlatformAccountById(accountId: string, user: UserSessionPayload) {
  if (!canUserAccessPlatformAccount(user, accountId, 'view')) {
    throw new Error('FORBIDDEN');
  }

  const acc = db
    .select()
    .from(clientPlatformAccounts)
    .where(eq(clientPlatformAccounts.id, accountId))
    .get();

  if (!acc) return null;

  const links = db
    .select({
      id: projectPlatformAccountLinks.id,
      projectId: projectPlatformAccountLinks.projectId,
      linkedAt: projectPlatformAccountLinks.linkedAt,
      projectTitle: projects.title,
      projectCode: projects.code,
    })
    .from(projectPlatformAccountLinks)
    .leftJoin(projects, eq(projectPlatformAccountLinks.projectId, projects.id))
    .where(eq(projectPlatformAccountLinks.accountId, acc.id))
    .all();

  let verifierName = null;
  if (acc.verifiedByUserId) {
    const verifier = db.select({ name: users.name }).from(users).where(eq(users.id, acc.verifiedByUserId)).get();
    verifierName = verifier?.name || null;
  }

  let revokerName = null;
  if (acc.revokedByUserId) {
    const revoker = db.select({ name: users.name }).from(users).where(eq(users.id, acc.revokedByUserId)).get();
    revokerName = revoker?.name || null;
  }

  return {
    ...acc,
    linkedProjects: links,
    verifierName,
    revokerName,
  };
}

/**
 * Creates a new platform account belonging to a company.
 * If input.projectId is provided, also creates a link in projectPlatformAccountLinks.
 * Rule: status cannot be initialized directly to 'verified_active' without explicit verification method.
 */
export async function createPlatformAccount(input: CreateAccountInput, user: UserSessionPayload) {
  assertNoSensitiveData(input as Record<string, any>);

  if (!canUserAccessCompanyAccounts(user, input.companyId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  const now = new Date().toISOString();
  const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Default initial status (cannot be verified_active on creation)
  let initialStatus: AccountStatus = input.status || 'not_requested';
  if (initialStatus === 'verified_active') {
    initialStatus = 'declared_by_client'; // Enforce verification step
  }

  const newAccount = {
    id,
    companyId: input.companyId,
    platformType: input.platformType,
    accountName: input.accountName.trim(),
    externalId: input.externalId?.trim() || null,
    externalUrl: input.externalUrl?.trim() || null,
    accessMethod: input.accessMethod || 'agency_mcc_partner',
    accessLevel: input.accessLevel || 'standard_edit',
    delegatedToIdentifier: input.delegatedToIdentifier?.trim() || null,
    status: initialStatus,
    originClientRequestId: input.originClientRequestId || null,
    originClientRequestItemId: input.originClientRequestItemId || null,
    evidenceDocumentId: input.evidenceDocumentId || null,
    verificationType: 'manual_operator' as const,
    verificationMethod: null,
    verificationNotes: null,
    verifiedByUserId: null,
    verifiedAt: null,
    revokedAt: null,
    revokedByUserId: null,
    revocationReason: null,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(clientPlatformAccounts).values(newAccount).run();

  // If projectId was provided, link it to the project
  if (input.projectId) {
    const linkId = `plink_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.insert(projectPlatformAccountLinks)
      .values({
        id: linkId,
        projectId: input.projectId,
        accountId: id,
        linkedByUserId: user.userId,
        linkedAt: now,
        notes: null,
      })
      .run();
  }

  return getPlatformAccountById(id, user);
}

/**
 * Updates a platform account metadata.
 * If status is being set to 'verified_active', it must be done via verifyPlatformAccount.
 * If status is being set to 'revoked', historical verification data is PRESERVED and revocation is recorded.
 */
export async function updatePlatformAccount(
  accountId: string,
  input: UpdateAccountInput,
  user: UserSessionPayload
) {
  assertNoSensitiveData(input as Record<string, any>);

  if (!canUserAccessPlatformAccount(user, accountId, 'edit')) {
    throw new Error('FORBIDDEN');
  }

  const existing = db
    .select()
    .from(clientPlatformAccounts)
    .where(eq(clientPlatformAccounts.id, accountId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    updatedAt: now,
  };

  if (input.platformType !== undefined) updatePayload.platformType = input.platformType;
  if (input.accountName !== undefined) updatePayload.accountName = input.accountName.trim();
  if (input.externalId !== undefined) updatePayload.externalId = input.externalId?.trim() || null;
  if (input.externalUrl !== undefined) updatePayload.externalUrl = input.externalUrl?.trim() || null;
  if (input.accessMethod !== undefined) updatePayload.accessMethod = input.accessMethod;
  if (input.accessLevel !== undefined) updatePayload.accessLevel = input.accessLevel;
  if (input.delegatedToIdentifier !== undefined)
    updatePayload.delegatedToIdentifier = input.delegatedToIdentifier?.trim() || null;
  if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;
  if (input.evidenceDocumentId !== undefined) updatePayload.evidenceDocumentId = input.evidenceDocumentId;

  // Status transitions
  if (input.status !== undefined) {
    if (input.status === 'verified_active' && existing.status !== 'verified_active') {
      throw new Error('INVALID_OPERATION: Per impostare lo stato su verified_active è necessario utilizzare l\'endpoint di verifica con metodo ed evidenza.');
    }
    updatePayload.status = input.status;

    // When revoked, record revocation event and PRESERVE historical verification audit!
    if (input.status === 'revoked') {
      const reason = input.revocationReason?.trim() || input.notes?.trim() || 'Accesso revocato dall\'operatore';
      updatePayload.revokedAt = now;
      updatePayload.revokedByUserId = user.userId;
      updatePayload.revocationReason = reason;

      try {
        const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        db.insert(activityLog)
          .values({
            id: activityId,
            entityType: 'client_platform_account',
            entityId: accountId,
            action: 'account_revoked',
            performedBy: user.userId,
            detailsJson: JSON.stringify({
              previousStatus: existing.status,
              revocationReason: reason,
              historicalVerification: {
                verifiedByUserId: existing.verifiedByUserId,
                verifiedAt: existing.verifiedAt,
                verificationType: existing.verificationType,
                verificationMethod: existing.verificationMethod,
                verificationNotes: existing.verificationNotes,
              },
            }),
            beforeJson: JSON.stringify(existing),
            afterJson: null,
            ipAddress: null,
            createdAt: now,
          })
          .run();
      } catch (err) {
        console.error('Failed to log account revocation activity:', err);
      }
    }
  }

  db.update(clientPlatformAccounts)
    .set(updatePayload)
    .where(eq(clientPlatformAccounts.id, accountId))
    .run();

  return getPlatformAccountById(accountId, user);
}

/**
 * Dedicated revocation of a platform account.
 * Updates status to 'revoked' and records author, timestamp and reason while PRESERVING historical verification data.
 */
export async function revokePlatformAccount(
  accountId: string,
  input: RevokeAccountInput,
  user: UserSessionPayload
) {
  return updatePlatformAccount(
    accountId,
    {
      status: 'revoked',
      revocationReason: input.revocationReason || input.notes || 'Accesso revocato dall\'operatore',
    },
    user
  );
}

/**
 * Explicit verification action by operator / admin.
 * Transitions account to 'verified_active' with mandatory verification method, timestamp, and verifier ID.
 */
export async function verifyPlatformAccount(
  accountId: string,
  input: VerifyAccountInput,
  user: UserSessionPayload
) {
  assertNoSensitiveData(input as Record<string, any>);

  if (!canUserAccessPlatformAccount(user, accountId, 'verify')) {
    throw new Error('FORBIDDEN');
  }

  if (!input.verificationMethod || !input.verificationMethod.trim()) {
    throw new Error('INVALID_INPUT: Il metodo di verifica (es. invito MCC accettato, ping GA4 in tempo reale, controllo DNS) è obbligatorio.');
  }

  const existing = db
    .select()
    .from(clientPlatformAccounts)
    .where(eq(clientPlatformAccounts.id, accountId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const now = new Date().toISOString();
  const vType: VerificationType = input.verificationType || 'manual_operator';

  db.update(clientPlatformAccounts)
    .set({
      status: 'verified_active',
      verificationType: vType,
      verificationMethod: input.verificationMethod.trim(),
      verificationNotes: input.verificationNotes?.trim() || null,
      evidenceDocumentId: input.evidenceDocumentId || existing.evidenceDocumentId,
      verifiedByUserId: user.userId,
      verifiedAt: now,
      revokedAt: null,
      revokedByUserId: null,
      revocationReason: null,
      updatedAt: now,
    })
    .where(eq(clientPlatformAccounts.id, accountId))
    .run();

  // Log verification in activityLog
  try {
    const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.insert(activityLog)
      .values({
        id: activityId,
        entityType: 'client_platform_account',
        entityId: accountId,
        action: 'account_verified',
        performedBy: user.userId,
        detailsJson: JSON.stringify({
          verificationType: vType,
          verificationMethod: input.verificationMethod.trim(),
          verificationNotes: input.verificationNotes?.trim() || null,
        }),
        beforeJson: JSON.stringify(existing),
        afterJson: null,
        ipAddress: null,
        createdAt: now,
      })
      .run();
  } catch (err) {
    console.error('Failed to log account verification activity:', err);
  }

  return getPlatformAccountById(accountId, user);
}

/**
 * Links an existing company platform account to a project.
 */
export async function linkAccountToProject(
  projectId: string,
  accountId: string,
  user: UserSessionPayload,
  notes?: string
) {
  if (!checkUserProjectAccess(user, projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project || !project.companyId) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  const account = db.select().from(clientPlatformAccounts).where(eq(clientPlatformAccounts.id, accountId)).get();
  if (!account) {
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  if (account.companyId !== project.companyId) {
    throw new Error('COMPANY_MISMATCH: L\'account selezionato appartiene a un\'altra azienda.');
  }

  const existingLink = db
    .select()
    .from(projectPlatformAccountLinks)
    .where(
      and(
        eq(projectPlatformAccountLinks.projectId, projectId),
        eq(projectPlatformAccountLinks.accountId, accountId)
      )
    )
    .get();

  if (existingLink) {
    return { success: true, linkId: existingLink.id, message: 'Account già collegato a questo progetto.' };
  }

  const now = new Date().toISOString();
  const linkId = `plink_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  db.insert(projectPlatformAccountLinks)
    .values({
      id: linkId,
      projectId,
      accountId,
      linkedByUserId: user.userId,
      linkedAt: now,
      notes: notes?.trim() || null,
    })
    .run();

  return { success: true, linkId, message: 'Account collegato con successo al progetto.' };
}

/**
 * Unlinks a platform account from a project without deleting the company account.
 */
export async function unlinkAccountFromProject(
  projectId: string,
  accountId: string,
  user: UserSessionPayload
) {
  if (!checkUserProjectAccess(user, projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  db.delete(projectPlatformAccountLinks)
    .where(
      and(
        eq(projectPlatformAccountLinks.projectId, projectId),
        eq(projectPlatformAccountLinks.accountId, accountId)
      )
    )
    .run();

  return { success: true, message: 'Collegamento rimosso dal progetto.' };
}

/**
 * Deletes a platform account and all its project links (Admin or Project Manager).
 */
export async function deletePlatformAccount(accountId: string, user: UserSessionPayload) {
  if (!canUserAccessPlatformAccount(user, accountId, 'delete')) {
    throw new Error('FORBIDDEN');
  }

  // Remove project links first
  db.delete(projectPlatformAccountLinks)
    .where(eq(projectPlatformAccountLinks.accountId, accountId))
    .run();

  // Delete account
  db.delete(clientPlatformAccounts)
    .where(eq(clientPlatformAccounts.id, accountId))
    .run();

  return { success: true, message: 'Account eliminato dal registro aziendale.' };
}

/**
 * Hook triggered when a client request item in the "accesses" category is approved:
 * Automatically creates or updates an account record in status 'declared_by_client'.
 * RULE: Does NOT set 'verified_active' automatically!
 */
export async function syncAccountFromApprovedClientRequestItem(
  requestId: string,
  itemId: string,
  approvedByUserId: string
) {
  const req = db.select().from(clientRequests).where(eq(clientRequests.id, requestId)).get();
  const item = db.select().from(clientRequestItems).where(eq(clientRequestItems.id, itemId)).get();

  if (!req || !item || !req.companyId) return;

  // Determine platform type based on label or configuration
  let platformType: PlatformType = 'other_custom';
  const labelLower = item.label.toLowerCase();

  if (labelLower.includes('dns') || labelLower.includes('dominio')) platformType = 'dns_registrar';
  else if (labelLower.includes('hosting') || labelLower.includes('server')) platformType = 'hosting_server';
  else if (labelLower.includes('wordpress') || labelLower.includes('cms')) platformType = 'cms_wordpress';
  else if (labelLower.includes('analytics') || labelLower.includes('ga4')) platformType = 'google_analytics_4';
  else if (labelLower.includes('search console') || labelLower.includes('gsc')) platformType = 'google_search_console';
  else if (labelLower.includes('tag manager') || labelLower.includes('gtm')) platformType = 'google_tag_manager';
  else if (labelLower.includes('google ads') || labelLower.includes('adwords')) platformType = 'google_ads_account';
  else if (labelLower.includes('google business') || labelLower.includes('maps')) platformType = 'google_business_profile';
  else if (labelLower.includes('meta business') || labelLower.includes('business manager')) platformType = 'meta_business_manager';
  else if (labelLower.includes('pixel') || labelLower.includes('dataset')) platformType = 'meta_pixel_dataset';
  else if (labelLower.includes('facebook')) platformType = 'meta_facebook_page';
  else if (labelLower.includes('instagram')) platformType = 'meta_instagram_business';
  else if (labelLower.includes('booking') || labelLower.includes('prenotaz')) platformType = 'booking_engine_tour';

  // Check if an account already exists for this item
  const existing = db
    .select()
    .from(clientPlatformAccounts)
    .where(
      and(
        eq(clientPlatformAccounts.companyId, req.companyId),
        eq(clientPlatformAccounts.originClientRequestItemId, itemId)
      )
    )
    .get();

  const now = new Date().toISOString();

  if (existing) {
    db.update(clientPlatformAccounts)
      .set({
        status: existing.status === 'verified_active' ? 'verified_active' : 'declared_by_client',
        evidenceDocumentId: item.documentId || existing.evidenceDocumentId,
        updatedAt: now,
      })
      .where(eq(clientPlatformAccounts.id, existing.id))
      .run();
  } else {
    const newId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.insert(clientPlatformAccounts)
      .values({
        id: newId,
        companyId: req.companyId,
        platformType,
        accountName: item.label,
        externalId: item.valueText || null,
        externalUrl: item.valueUrl || null,
        accessMethod: 'agency_mcc_partner',
        accessLevel: 'standard_edit',
        delegatedToIdentifier: null,
        status: 'declared_by_client', // RULE: 'declared_by_client', NOT 'verified_active'
        originClientRequestId: requestId,
        originClientRequestItemId: itemId,
        evidenceDocumentId: item.documentId || null,
        notes: `Generato automaticamente dall'approvazione della richiesta cliente: ${req.title}`,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Link to project
    if (req.projectId) {
      const linkId = `plink_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.insert(projectPlatformAccountLinks)
        .values({
          id: linkId,
          projectId: req.projectId,
          accountId: newId,
          linkedByUserId: approvedByUserId,
          linkedAt: now,
          notes: 'Collegato automaticamente da richiesta di onboarding approvata.',
        })
        .run();
    }
  }
}
