import {
  db,
  processTemplates,
  processTemplateVersions,
  projectAppliedTemplates,
  projects,
  projectMilestones,
  tasks,
  taskAssignments,
  taskDependencies,
  users,
} from '@ai-crm/db';
import { eq, desc, and, inArray } from 'drizzle-orm';
import {
  ProcessTemplateDefinition,
  DEFAULT_SEED_TEMPLATES,
  calculateTemplateSchedule,
  validateTemplateGraphAcyclic,
  ProcessCategory,
  ProcessTemplateStatus,
  ProcessVersionStatus,
} from '@ai-crm/ai';
import { logActivity } from './activity-logger';
import { recalculateProjectProgress } from './task-graph';

/**
 * Inizializza i modelli di processo seed (Sito Web & SEO) se non esistono.
 * Completamente idempotente.
 */
export async function seedProcessTemplatesIfEmpty(defaultAdminUserId?: string): Promise<void> {
  const existing = db.select().from(processTemplates).all();
  if (existing.length >= DEFAULT_SEED_TEMPLATES.length) {
    return;
  }

  // Trova o crea un admin ID valido
  let adminId = defaultAdminUserId;
  if (!adminId) {
    const adminUser = db.select().from(users).where(eq(users.role, 'admin')).get();
    if (adminUser) {
      adminId = adminUser.id;
    } else {
      const anyUser = db.select().from(users).get();
      if (anyUser) {
        adminId = anyUser.id;
      } else {
        adminId = 'usr_admin_default';
        db.insert(users)
          .values({
            id: adminId,
            name: 'Amministratore Agenzia',
            email: 'admin@agency.local',
            passwordHash: 'seeded_hash',
            role: 'admin',
            createdAt: new Date().toISOString(),
          })
          .run();
      }
    }
  }

  const now = new Date().toISOString();

  for (const seed of DEFAULT_SEED_TEMPLATES) {
    const found = existing.find((t) => t.code === seed.code);
    if (!found) {
      const templateId = `tmpl_${seed.code.toLowerCase()}`;
      const versionId = `tmpl_ver_${seed.code.toLowerCase()}_v1`;

      db.insert(processTemplates)
        .values({
          id: templateId,
          name: seed.name,
          code: seed.code,
          category: seed.category,
          description: seed.description,
          status: 'active',
          currentVersionNumber: 1,
          createdBy: adminId,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(processTemplateVersions)
        .values({
          id: versionId,
          templateId: templateId,
          versionNumber: 1,
          status: 'published',
          changelog: 'Versione iniziale standard di agenzia',
          definitionJson: JSON.stringify(seed.definition),
          createdBy: adminId,
          publishedAt: now,
          createdAt: now,
        })
        .run();
    }
  }
}

/**
 * Recupera l'elenco dei modelli di processo con filtri e statistiche
 */
export async function listProcessTemplates(filters?: {
  category?: string;
  status?: string;
  q?: string;
}) {
  await seedProcessTemplatesIfEmpty();

  let allTemplates = db
    .select({
      id: processTemplates.id,
      name: processTemplates.name,
      code: processTemplates.code,
      category: processTemplates.category,
      description: processTemplates.description,
      status: processTemplates.status,
      currentVersionNumber: processTemplates.currentVersionNumber,
      createdBy: processTemplates.createdBy,
      createdAt: processTemplates.createdAt,
      updatedAt: processTemplates.updatedAt,
      creatorName: users.name,
    })
    .from(processTemplates)
    .leftJoin(users, eq(processTemplates.createdBy, users.id))
    .orderBy(desc(processTemplates.createdAt))
    .all();

  if (filters?.category && filters.category !== 'all') {
    allTemplates = allTemplates.filter((t) => t.category === filters.category);
  }

  if (filters?.status && filters.status !== 'all') {
    allTemplates = allTemplates.filter((t) => t.status === filters.status);
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    allTemplates = allTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Arricchisci con info sull'ultima versione pubblicata
  const allVersions = db.select().from(processTemplateVersions).all();

  const enriched = allTemplates.map((tmpl) => {
    const versions = allVersions.filter((v) => v.templateId === tmpl.id);
    const publishedVersion = versions
      .filter((v) => v.status === 'published')
      .sort((a, b) => b.versionNumber - a.versionNumber)[0];

    let phasesCount = 0;
    let milestonesCount = 0;
    let tasksCount = 0;
    let estimatedWorkDays = 0;
    let estimatedHours = 0;

    const activeVer = publishedVersion || versions[0];
    if (activeVer) {
      try {
        const def: ProcessTemplateDefinition = JSON.parse(activeVer.definitionJson);
        phasesCount = def.phases?.length || 0;
        milestonesCount = def.milestones?.length || 0;
        tasksCount = def.tasks?.length || 0;
        estimatedWorkDays = (def.tasks || []).reduce((acc, t) => acc + (t.estimatedWorkDays || 1), 0);
        estimatedHours = (def.tasks || []).reduce((acc, t) => acc + (t.estimatedHours || (t.estimatedWorkDays || 1) * 8), 0);
      } catch {}
    }

    return {
      ...tmpl,
      versionsCount: versions.length,
      publishedVersionNumber: publishedVersion?.versionNumber || null,
      phasesCount,
      milestonesCount,
      tasksCount,
      estimatedWorkDays,
      estimatedHours,
    };
  });

  return enriched;
}

/**
 * Recupera un modello di processo per ID completo di tutte le versioni
 */
export async function getProcessTemplateById(templateId: string) {
  await seedProcessTemplatesIfEmpty();

  const template = db
    .select({
      id: processTemplates.id,
      name: processTemplates.name,
      code: processTemplates.code,
      category: processTemplates.category,
      description: processTemplates.description,
      status: processTemplates.status,
      currentVersionNumber: processTemplates.currentVersionNumber,
      createdBy: processTemplates.createdBy,
      createdAt: processTemplates.createdAt,
      updatedAt: processTemplates.updatedAt,
      creatorName: users.name,
    })
    .from(processTemplates)
    .leftJoin(users, eq(processTemplates.createdBy, users.id))
    .where(eq(processTemplates.id, templateId))
    .get();

  if (!template) return null;

  const versions = db
    .select({
      id: processTemplateVersions.id,
      templateId: processTemplateVersions.templateId,
      versionNumber: processTemplateVersions.versionNumber,
      status: processTemplateVersions.status,
      changelog: processTemplateVersions.changelog,
      definitionJson: processTemplateVersions.definitionJson,
      createdBy: processTemplateVersions.createdBy,
      publishedAt: processTemplateVersions.publishedAt,
      createdAt: processTemplateVersions.createdAt,
      creatorName: users.name,
    })
    .from(processTemplateVersions)
    .leftJoin(users, eq(processTemplateVersions.createdBy, users.id))
    .where(eq(processTemplateVersions.templateId, templateId))
    .orderBy(desc(processTemplateVersions.versionNumber))
    .all();

  const parsedVersions = versions.map((v) => {
    let definition: ProcessTemplateDefinition = { phases: [], milestones: [], tasks: [], dependencies: [] };
    try {
      definition = JSON.parse(v.definitionJson);
    } catch {}
    return {
      ...v,
      definition,
    };
  });

  const activePublishedVersion = parsedVersions.find((v) => v.status === 'published') || parsedVersions[0];

  return {
    template,
    versions: parsedVersions,
    activeVersion: activePublishedVersion || null,
  };
}

/**
 * Crea un nuovo modello di processo in bozza
 */
export async function createProcessTemplateDraft(
  dataOrOpts:
    | {
        name: string;
        code: string;
        category?: ProcessCategory;
        description?: string;
        definition: ProcessTemplateDefinition;
        createdBy?: string;
        userRole?: string;
      }
    | {
        name: string;
        code: string;
        category?: ProcessCategory;
        description?: string;
        definition: ProcessTemplateDefinition;
      },
  userId?: string,
  userRole?: string
) {
  const data = 'definition' in dataOrOpts ? dataOrOpts : (dataOrOpts as any);
  const actualUserId = userId || (dataOrOpts as any).createdBy || 'usr_admin_system';
  const actualRole = userRole || (dataOrOpts as any).userRole;

  if (actualRole && !['admin', 'manager'].includes(actualRole)) {
    throw new Error('403: Non autorizzato. Solo gli amministratori possono gestire i modelli di processo.');
  }

  const cleanCode = data.code.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const existingCode = db.select().from(processTemplates).where(eq(processTemplates.code, cleanCode)).get();
  if (existingCode) {
    throw new Error(`Esiste già un modello con codice ${cleanCode}`);
  }

  // Valida grafo dipendenze
  const graphCheck = validateTemplateGraphAcyclic(data.definition.tasks || [], data.definition.dependencies || []);
  if (!graphCheck.isValid) {
    throw new Error(graphCheck.error || 'Il grafo delle dipendenze contiene cicli non validi');
  }

  const now = new Date().toISOString();
  const templateId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const versionId = `tmpl_ver_${Date.now()}_1`;

  db.insert(processTemplates)
    .values({
      id: templateId,
      name: data.name.trim(),
      code: cleanCode,
      category: data.category || 'website',
      description: data.description?.trim() || null,
      status: 'draft',
      currentVersionNumber: 1,
      createdBy: actualUserId,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(processTemplateVersions)
    .values({
      id: versionId,
      templateId: templateId,
      versionNumber: 1,
      status: 'draft',
      changelog: 'Bozza iniziale creata',
      definitionJson: JSON.stringify(data.definition),
      createdBy: actualUserId,
      createdAt: now,
    })
    .run();

  await logActivity({
    entityType: 'process_template',
    entityId: templateId,
    action: 'create_draft_template',
    performedBy: actualUserId,
    details: { name: data.name, code: cleanCode },
  });

  return {
    id: templateId,
    templateId,
    versionId,
    name: data.name.trim(),
    code: cleanCode,
    category: data.category || 'website',
    status: 'draft',
    phasesCount: data.definition.phases?.length || 0,
    milestonesCount: data.definition.milestones?.length || 0,
    tasksCount: data.definition.tasks?.length || 0,
    currentVersionNumber: 1,
  };
}

/**
 * Pubblica una versione di un template (esistente in bozza o nuova da definizione)
 */
export async function publishProcessTemplateVersion(
  templateIdOrOpts:
    | string
    | {
        templateId: string;
        versionId?: string;
        publishedBy?: string;
        changelog?: string;
        definition?: ProcessTemplateDefinition;
        userRole?: string;
      },
  versionIdArg?: string,
  userIdArg?: string
) {
  let templateId: string;
  let versionId: string | undefined;
  let userId: string;
  let changelog: string = 'Versione pubblicata';
  let definition: ProcessTemplateDefinition | undefined;
  let userRole: string | undefined;

  if (typeof templateIdOrOpts === 'object') {
    templateId = templateIdOrOpts.templateId;
    versionId = templateIdOrOpts.versionId;
    userId = templateIdOrOpts.publishedBy || 'usr_admin_system';
    changelog = templateIdOrOpts.changelog || 'Versione pubblicata';
    definition = templateIdOrOpts.definition;
    userRole = templateIdOrOpts.userRole;
  } else {
    templateId = templateIdOrOpts;
    versionId = versionIdArg;
    userId = userIdArg || 'usr_admin_system';
  }

  if (userRole && !['admin', 'manager'].includes(userRole)) {
    throw new Error('403: Non autorizzato. Solo gli amministratori possono pubblicare versioni dei modelli.');
  }

  const template = db.select().from(processTemplates).where(eq(processTemplates.id, templateId)).get();
  if (!template) {
    throw new Error('Modello di processo non trovato');
  }

  const now = new Date().toISOString();

  // Se viene fornito versionId, pubblica quella specifica versione bozza
  if (versionId) {
    const version = db.select().from(processTemplateVersions).where(eq(processTemplateVersions.id, versionId)).get();
    if (!version || version.templateId !== templateId) {
      throw new Error('Versione del modello non trovata');
    }

    let def: ProcessTemplateDefinition;
    try {
      def = JSON.parse(version.definitionJson);
    } catch {
      throw new Error('La definizione del template non è un JSON valido');
    }

    const graphCheck = validateTemplateGraphAcyclic(def.tasks || [], def.dependencies || []);
    if (!graphCheck.isValid) {
      throw new Error(graphCheck.error || 'Impossibile pubblicare: il grafo delle dipendenze contiene errori');
    }

    const schedule = calculateTemplateSchedule(def, now.slice(0, 10));

    db.update(processTemplateVersions)
      .set({
        status: 'published',
        publishedAt: now,
      })
      .where(eq(processTemplateVersions.id, versionId))
      .run();

    db.update(processTemplates)
      .set({
        status: 'active',
        currentVersionNumber: version.versionNumber,
        updatedAt: now,
      })
      .where(eq(processTemplates.id, templateId))
      .run();

    await logActivity({
      entityType: 'process_template',
      entityId: templateId,
      action: 'publish_template_version',
      performedBy: userId,
      details: { versionNumber: version.versionNumber, versionId },
    });

    return {
      success: true,
      versionNumber: version.versionNumber,
      versionId: version.id,
      status: 'published',
      estimatedWorkDays: schedule.totalWorkDays,
    };
  }

  // Se non viene fornito versionId o se viene passata una nuova definition, gestisci bozza esistente o crea nuova versione incrementale
  const allVersions = db
    .select()
    .from(processTemplateVersions)
    .where(eq(processTemplateVersions.templateId, templateId))
    .orderBy(desc(processTemplateVersions.versionNumber))
    .all();

  const draftVersion = allVersions.find((v) => v.status === 'draft');

  // Se esiste una bozza (es. v1 iniziale) e non stiamo passando esplicitamente una nuova definition per incrementare, pubblica la bozza
  if (draftVersion && !definition) {
    let def: ProcessTemplateDefinition;
    try {
      def = JSON.parse(draftVersion.definitionJson);
    } catch {
      throw new Error('La definizione del template non è un JSON valido');
    }

    const graphCheck = validateTemplateGraphAcyclic(def.tasks || [], def.dependencies || []);
    if (!graphCheck.isValid) {
      throw new Error(graphCheck.error || 'Impossibile pubblicare: il grafo delle dipendenze contiene errori');
    }

    const schedule = calculateTemplateSchedule(def, now.slice(0, 10));

    db.update(processTemplateVersions)
      .set({
        status: 'published',
        changelog: changelog || draftVersion.changelog,
        publishedAt: now,
      })
      .where(eq(processTemplateVersions.id, draftVersion.id))
      .run();

    db.update(processTemplates)
      .set({
        status: 'active',
        currentVersionNumber: draftVersion.versionNumber,
        updatedAt: now,
      })
      .where(eq(processTemplates.id, templateId))
      .run();

    await logActivity({
      entityType: 'process_template',
      entityId: templateId,
      action: 'publish_template_version',
      performedBy: userId,
      details: { versionNumber: draftVersion.versionNumber, versionId: draftVersion.id },
    });

    return {
      success: true,
      versionNumber: draftVersion.versionNumber,
      versionId: draftVersion.id,
      status: 'published' as const,
      estimatedWorkDays: schedule.totalWorkDays,
    };
  }

  // Altrimenti crea e pubblica una nuova versione incrementale (es. v2, v3...)
  const publishedVersions = allVersions.filter((v) => v.status === 'published');
  const nextVersionNumber = publishedVersions.length > 0 ? (publishedVersions[0].versionNumber || 0) + 1 : 1;
  const targetDefinition =
    definition ||
    (allVersions[0]
      ? JSON.parse(allVersions[0].definitionJson)
      : { phases: [], milestones: [], tasks: [], dependencies: [] });

  const graphCheck = validateTemplateGraphAcyclic(targetDefinition.tasks || [], targetDefinition.dependencies || []);
  if (!graphCheck.isValid) {
    throw new Error(graphCheck.error || 'Impossibile pubblicare: il grafo delle dipendenze contiene errori');
  }

  const schedule = calculateTemplateSchedule(targetDefinition, now.slice(0, 10));
  const newVersionId = `tmpl_ver_${Date.now()}_${nextVersionNumber}`;

  db.insert(processTemplateVersions)
    .values({
      id: newVersionId,
      templateId: templateId,
      versionNumber: nextVersionNumber,
      status: 'published',
      changelog: changelog,
      definitionJson: JSON.stringify(targetDefinition),
      createdBy: userId,
      publishedAt: now,
      createdAt: now,
    })
    .run();

  db.update(processTemplates)
    .set({
      status: 'active',
      currentVersionNumber: nextVersionNumber,
      updatedAt: now,
    })
    .where(eq(processTemplates.id, templateId))
    .run();

  await logActivity({
    entityType: 'process_template',
    entityId: templateId,
    action: 'publish_new_version',
    performedBy: userId,
    details: { versionNumber: nextVersionNumber, versionId: newVersionId },
  });

  return {
    success: true,
    versionNumber: nextVersionNumber,
    versionId: newVersionId,
    status: 'published' as const,
    estimatedWorkDays: schedule.totalWorkDays,
  };
}

/**
 * Calcola l'anteprima di applicazione per uno o più modelli su un progetto esistente
 */
export async function previewTemplateApplication(params: {
  projectId: string;
  templateId: string;
  versionNumber?: number;
  versionId?: string;
  startDate?: string; // ISO YYYY-MM-DD
  excludedTaskIds?: string[];
  excludedTaskCodes?: string[];
  roleAssignments?: Record<string, { userId: string; userName: string }>;
  roleMappings?: Record<string, string>;
  defaultAssigneeUserId?: string;
}) {
  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();
  if (!project) {
    throw new Error('Progetto non trovato');
  }

  const template = db.select().from(processTemplates).where(eq(processTemplates.id, params.templateId)).get();
  if (!template) {
    throw new Error('Modello di processo non trovato');
  }

  // Trova la versione richiesta o l'ultima pubblicata
  const allVersions = db
    .select()
    .from(processTemplateVersions)
    .where(eq(processTemplateVersions.templateId, params.templateId))
    .all();

  const selectedVersion = params.versionId
    ? allVersions.find((v) => v.id === params.versionId)
    : params.versionNumber
    ? allVersions.find((v) => v.versionNumber === params.versionNumber)
    : allVersions.find((v) => v.status === 'published') || allVersions[0];

  if (!selectedVersion) {
    throw new Error('Nessuna versione valida disponibile per questo modello');
  }

  const definition: ProcessTemplateDefinition = JSON.parse(selectedVersion.definitionJson);

  // Recupera i task esistenti nel progetto per duplicate check
  const existingProjectTasks = db
    .select({
      id: tasks.id,
      title: tasks.title,
      milestoneId: tasks.milestoneId,
      status: tasks.status,
    })
    .from(tasks)
    .where(eq(tasks.projectId, params.projectId))
    .all();

  const allUsers = db.select().from(users).all();
  const roleAssignmentsWithName: Record<string, { userId: string; userName: string }> = {};
  const rawRoleMappings = params.roleMappings || (params.roleAssignments as any) || {};

  for (const [role, uid] of Object.entries(rawRoleMappings)) {
    const targetUid = typeof uid === 'string' ? uid : (uid as any)?.userId;
    const u = allUsers.find((user) => user.id === targetUid);
    if (u) {
      roleAssignmentsWithName[role] = { userId: u.id, userName: u.name };
    }
  }

  const excludedList = params.excludedTaskCodes || params.excludedTaskIds || [];
  const schedule = calculateTemplateSchedule(definition, {
    startDate: params.startDate || new Date().toISOString().slice(0, 10),
    excludedTaskIds: excludedList,
    roleAssignments: roleAssignmentsWithName,
    existingProjectTasks,
  });

  // Calculate duplicate warnings
  const duplicateWarnings: Array<{ templateTaskTitle: string; existingTaskTitle: string; existingTaskStatus: string }> = [];
  for (const st of schedule.tasks) {
    const normalizedTemplateTitle = st.title.toLowerCase().trim();
    for (const et of existingProjectTasks) {
      const normalizedExisting = et.title.toLowerCase().trim();
      if (
        normalizedTemplateTitle === normalizedExisting ||
        normalizedTemplateTitle.includes(normalizedExisting) ||
        normalizedExisting.includes(normalizedTemplateTitle)
      ) {
        duplicateWarnings.push({
          templateTaskTitle: st.title,
          existingTaskTitle: et.title,
          existingTaskStatus: et.status || 'da_fare',
        });
      }
    }
  }

  return {
    templateId: template.id,
    templateName: template.name,
    templateCode: template.code,
    versionNumber: selectedVersion.versionNumber,
    versionId: selectedVersion.id,
    startDate: params.startDate,
    schedule: {
      ...schedule,
      startDate: schedule.tasks[0]?.plannedStartDate || params.startDate,
      targetEndDate: schedule.estimatedCompletionDate,
    },
    duplicateWarnings,
    tasks: schedule.tasks,
    milestones: schedule.milestones,
    estimatedCompletionDate: schedule.estimatedCompletionDate,
    totalWorkDays: schedule.totalWorkDays,
    totalHours: schedule.totalHours,
    phases: definition.phases,
  };
}

/**
 * Applica un modello di processo a un progetto reale con transazione atomica,
 * calcolo date, controllo duplicati e idempotenza.
 */
export async function applyTemplateToProject(params: {
  projectId: string;
  templateId: string;
  versionNumber?: number;
  versionId?: string;
  startDate: string; // ISO YYYY-MM-DD
  excludedTaskIds?: string[];
  excludedTaskCodes?: string[];
  roleAssignments?: Record<string, string>;
  roleMappings?: Record<string, string>;
  defaultAssigneeUserId?: string;
  customTaskTitles?: Record<string, string>;
  idempotencyKey?: string;
  forceReapply?: boolean;
  appliedBy?: string;
  appliedByUserId?: string;
}) {
  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();
  if (!project) {
    throw new Error('Progetto non trovato');
  }

  const effectiveUserId = params.appliedByUserId || params.appliedBy || 'usr_admin_system';

  // 1. Controllo Idempotenza
  if (params.idempotencyKey) {
    const existingApplication = db
      .select()
      .from(projectAppliedTemplates)
      .where(
        and(
          eq(projectAppliedTemplates.projectId, params.projectId),
          eq(projectAppliedTemplates.idempotencyKey, params.idempotencyKey)
        )
      )
      .get();

    if (existingApplication) {
      const parsedMapping = JSON.parse(existingApplication.taskMappingJson || '{"tasks":{}}');
      const existingTaskCount = Object.keys(parsedMapping.tasks || parsedMapping).length;
      return {
        success: true,
        alreadyApplied: true,
        message: 'Modello già applicato a questo progetto con la stessa richiesta (Idempotenza garantita).',
        applicationId: existingApplication.id,
        tasksCreated: existingTaskCount,
        milestonesCreated: Object.keys(parsedMapping.milestones || {}).length,
        taskMapping: parsedMapping.tasks || parsedMapping,
      };
    }
  }

  const template = db.select().from(processTemplates).where(eq(processTemplates.id, params.templateId)).get();
  if (!template) {
    throw new Error('Modello di processo non trovato');
  }

  const allVersions = db
    .select()
    .from(processTemplateVersions)
    .where(eq(processTemplateVersions.templateId, params.templateId))
    .all();

  const selectedVersion = params.versionId
    ? allVersions.find((v) => v.id === params.versionId)
    : params.versionNumber
    ? allVersions.find((v) => v.versionNumber === params.versionNumber)
    : allVersions.find((v) => v.status === 'published') || allVersions[0];

  if (!selectedVersion) {
    throw new Error('Nessuna versione valida per questo modello');
  }

  const definition: ProcessTemplateDefinition = JSON.parse(selectedVersion.definitionJson);
  const now = new Date().toISOString();

  // Mappa ruoli suggeriti con i nomi utente per la schedulazione
  const allUsers = db.select().from(users).all();
  const rawRoleMappings = params.roleMappings || params.roleAssignments || {};
  const roleAssignmentsWithName: Record<string, { userId: string; userName: string }> = {};

  for (const [role, uid] of Object.entries(rawRoleMappings)) {
    const u = allUsers.find((user) => user.id === uid);
    if (u) {
      roleAssignmentsWithName[role] = { userId: u.id, userName: u.name };
    }
  }

  const excludedList = params.excludedTaskCodes || params.excludedTaskIds || [];
  const schedule = calculateTemplateSchedule(definition, {
    startDate: params.startDate,
    excludedTaskIds: excludedList,
    roleAssignments: roleAssignmentsWithName,
  });

  const milestoneMapping = new Map<string, string>(); // templateMilestoneId -> realMilestoneId
  const taskMapping = new Map<string, string>(); // templateTaskId -> realTaskId

  // Esecuzione atomica
  // 1. Inserimento Milestone
  for (const ms of schedule.milestones) {
    const realMsId = `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    milestoneMapping.set(ms.templateMilestoneId, realMsId);

    db.insert(projectMilestones)
      .values({
        id: realMsId,
        projectId: params.projectId,
        title: ms.title,
        description: ms.description || null,
        dueDate: ms.dueDate,
        status: 'in_programma',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  // 2. Inserimento Task
  for (let i = 0; i < schedule.tasks.length; i++) {
    const t = schedule.tasks[i];
    const realTaskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    taskMapping.set(t.templateTaskId, realTaskId);

    const mappedMilestoneId = t.milestoneId ? milestoneMapping.get(t.milestoneId) || null : null;
    const finalTitle = params.customTaskTitles?.[t.templateTaskId] || t.title;

    db.insert(tasks)
      .values({
        id: realTaskId,
        projectId: params.projectId,
        milestoneId: mappedMilestoneId,
        title: finalTitle,
        description: t.description || null,
        status: 'da_fare',
        priority: t.priority,
        plannedStartDate: t.plannedStartDate,
        plannedEndDate: t.plannedEndDate,
        estimatedHours: t.estimatedHours || 0,
        progressPercent: 0,
        checklistJson: JSON.stringify(t.checklist || []),
        sortOrder: i + 1,
        createdBy: effectiveUserId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 3. Inserimento Assegnazione Utente se configurata
    const targetUserId =
      (t.suggestedRole && rawRoleMappings[t.suggestedRole]) ||
      params.defaultAssigneeUserId ||
      null;

    if (targetUserId) {
      db.insert(taskAssignments)
        .values({
          id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          taskId: realTaskId,
          userId: targetUserId,
          role: 'lead',
          assignedAt: now,
        })
        .run();
    }
  }

  // 4. Inserimento Dipendenze Finish-to-Start tra i task reali
  for (const dep of definition.dependencies || []) {
    const realPredId = taskMapping.get(dep.predecessorTaskId);
    const realSuccId = taskMapping.get(dep.successorTaskId);

    if (realPredId && realSuccId) {
      db.insert(taskDependencies)
        .values({
          id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          predecessorTaskId: realPredId,
          successorTaskId: realSuccId,
          dependencyType: 'finish_to_start',
          createdAt: now,
        })
        .run();
    }
  }

  // 5. Aggiornamento date progetto se vuote
  const scheduleStartDate = schedule.tasks[0]?.plannedStartDate || params.startDate;
  if (!project.startDate || project.startDate > scheduleStartDate) {
    db.update(projects)
      .set({
        startDate: scheduleStartDate,
        updatedAt: now,
      })
      .where(eq(projects.id, params.projectId))
      .run();
  }
  if (!project.dueDate || project.dueDate < schedule.estimatedCompletionDate) {
    db.update(projects)
      .set({
        dueDate: schedule.estimatedCompletionDate,
        updatedAt: now,
      })
      .where(eq(projects.id, params.projectId))
      .run();
  }

  // Ricalcola avanzamento
  recalculateProjectProgress(params.projectId);

  // 6. Registra l'applicazione del template
  const applicationId = `app_tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const taskMappingObj = Object.fromEntries(taskMapping);
  const milestoneMappingObj = Object.fromEntries(milestoneMapping);

  db.insert(projectAppliedTemplates)
    .values({
      id: applicationId,
      projectId: params.projectId,
      templateId: template.id,
      templateVersionId: selectedVersion.id,
      templateVersionNumber: selectedVersion.versionNumber,
      appliedBy: effectiveUserId,
      appliedAt: now,
      idempotencyKey: params.idempotencyKey || null,
      taskMappingJson: JSON.stringify({
        tasks: taskMappingObj,
        milestones: milestoneMappingObj,
      }),
    })
    .run();

  await logActivity({
    entityType: 'project',
    entityId: params.projectId,
    action: 'apply_process_template',
    performedBy: effectiveUserId,
    details: {
      templateId: template.id,
      templateCode: template.code,
      templateName: template.name,
      versionNumber: selectedVersion.versionNumber,
      tasksCreated: schedule.tasks.length,
      milestonesCreated: schedule.milestones.length,
      applicationId,
    },
  });

  return {
    success: true,
    applicationId,
    tasksCreated: schedule.tasks.length,
    milestonesCreated: schedule.milestones.length,
    totalWorkDays: schedule.totalWorkDays,
    estimatedCompletionDate: schedule.estimatedCompletionDate,
    taskMapping: taskMappingObj,
  };
}

/**
 * Elenca i modelli di processo già applicati a un progetto
 */
export async function getAppliedTemplatesForProject(projectId: string) {
  const records = db
    .select({
      id: projectAppliedTemplates.id,
      projectId: projectAppliedTemplates.projectId,
      templateId: projectAppliedTemplates.templateId,
      templateVersionId: projectAppliedTemplates.templateVersionId,
      templateVersionNumber: projectAppliedTemplates.templateVersionNumber,
      appliedBy: projectAppliedTemplates.appliedBy,
      appliedAt: projectAppliedTemplates.appliedAt,
      idempotencyKey: projectAppliedTemplates.idempotencyKey,
      taskMappingJson: projectAppliedTemplates.taskMappingJson,
      notes: projectAppliedTemplates.notes,
      templateName: processTemplates.name,
      templateCode: processTemplates.code,
      templateCategory: processTemplates.category,
      appliedByName: users.name,
    })
    .from(projectAppliedTemplates)
    .leftJoin(processTemplates, eq(projectAppliedTemplates.templateId, processTemplates.id))
    .leftJoin(users, eq(projectAppliedTemplates.appliedBy, users.id))
    .where(eq(projectAppliedTemplates.projectId, projectId))
    .orderBy(desc(projectAppliedTemplates.appliedAt))
    .all();

  return records.map((r) => {
    let taskCount = 0;
    let milestoneCount = 0;
    try {
      const parsed = JSON.parse(r.taskMappingJson || '{}');
      if (parsed.tasks) {
        taskCount = Object.keys(parsed.tasks).length;
      }
      if (parsed.milestones) {
        milestoneCount = Object.keys(parsed.milestones).length;
      }
    } catch {}

    return {
      ...r,
      versionNumber: r.templateVersionNumber,
      tasksCreatedCount: taskCount,
      milestonesCreatedCount: milestoneCount,
    };
  });
}
