/**
 * Modulo Modelli di Processo (Process Templates Engine)
 * Gestione catalogo modelli, versionamento immutabile, calcolo date in giorni lavorativi,
 * anteprima, deduplicazione e applicazione atomica su progetti esistenti.
 */

export type ProcessCategory = 'website' | 'seo' | 'google_ads' | 'meta_ads' | 'marketing';
export type ProcessTemplateStatus = 'draft' | 'active' | 'archived';
export type ProcessVersionStatus = 'draft' | 'published' | 'archived';

export type SuggestedRole =
  | 'project_manager'
  | 'account_executive'
  | 'web_designer'
  | 'frontend_dev'
  | 'fullstack_dev'
  | 'copywriter'
  | 'seo_specialist'
  | 'media_buyer'
  | 'qa_tester';

export interface SuggestedRoleOption {
  key: SuggestedRole;
  label: string;
  department: string;
}

export const SUGGESTED_ROLES_TAXONOMY: SuggestedRoleOption[] = [
  { key: 'project_manager', label: 'Project Manager / Account', department: 'management' },
  { key: 'account_executive', label: 'Account Executive', department: 'sales' },
  { key: 'web_designer', label: 'Web Designer (UI/UX)', department: 'design' },
  { key: 'frontend_dev', label: 'Frontend Developer', department: 'development' },
  { key: 'fullstack_dev', label: 'Fullstack / Backend Developer', department: 'development' },
  { key: 'copywriter', label: 'Copywriter & Content Specialist', department: 'content' },
  { key: 'seo_specialist', label: 'SEO Specialist', department: 'marketing' },
  { key: 'media_buyer', label: 'Media Buyer / Ads Specialist', department: 'marketing' },
  { key: 'qa_tester', label: 'QA / Collaudatore', department: 'quality' },
];

export interface ProcessTemplateChecklistItem {
  id: string;
  text: string;
}

export interface ProcessTemplateTaskDefinition {
  id: string; // e.g. "task_kickoff"
  phaseId: string;
  milestoneId?: string | null;
  title: string;
  description?: string;
  estimatedWorkDays: number; // Durata in giorni lavorativi (default >= 1)
  estimatedHours?: number; // Ore stimate facoltative
  suggestedRole?: SuggestedRole;
  priority?: 'bassa' | 'media' | 'alta' | 'urgente';
  requiresClientInput?: boolean; // Flag metadata: richiede input/asset cliente
  requiresApproval?: boolean; // Flag metadata: richiede approvazione
  sortOrder: number;
  checklist?: ProcessTemplateChecklistItem[];
}

export interface ProcessTemplatePhaseDefinition {
  id: string; // e.g. "phase_discovery"
  name: string;
  description?: string;
  sortOrder: number;
}

export interface ProcessTemplateMilestoneDefinition {
  id: string; // e.g. "ms_brief_completed"
  phaseId: string;
  title: string;
  description?: string;
  sortOrder: number;
}

export interface ProcessTemplateDependencyDefinition {
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: 'finish_to_start';
}

export interface ProcessTemplateDefinition {
  phases: ProcessTemplatePhaseDefinition[];
  milestones: ProcessTemplateMilestoneDefinition[];
  tasks: ProcessTemplateTaskDefinition[];
  dependencies: ProcessTemplateDependencyDefinition[];
}

export interface ScheduledTaskPreview {
  id: string; // alias for templateTaskId
  templateTaskId: string;
  phaseId: string;
  phaseName: string;
  milestoneId?: string | null;
  milestoneTitle?: string | null;
  title: string;
  description?: string;
  plannedStartDate: string; // YYYY-MM-DD
  plannedEndDate: string; // YYYY-MM-DD
  estimatedWorkDays: number;
  estimatedHours: number;
  suggestedRole?: SuggestedRole;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  priority: 'bassa' | 'media' | 'alta' | 'urgente';
  requiresClientInput: boolean;
  requiresApproval: boolean;
  checklist: Array<{ id: string; text: string; completed: boolean }>;
  predecessors: string[]; // array of templateTaskIds
  isPotentialDuplicate?: boolean;
  duplicateWarning?: string;
}

export interface ScheduledMilestonePreview {
  id: string; // alias for templateMilestoneId
  templateMilestoneId: string;
  phaseId: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
}

export interface ProcessTemplatePreviewResult {
  templateId: string;
  templateName: string;
  templateCode: string;
  versionNumber: number;
  startDate: string;
  estimatedCompletionDate: string;
  totalWorkDays: number;
  totalHours: number;
  phases: ProcessTemplatePhaseDefinition[];
  milestones: ScheduledMilestonePreview[];
  tasks: ScheduledTaskPreview[];
  potentialDuplicatesCount: number;
}

// ---------------------------------------------------------------------------
// Helpers Calendario Giorni Lavorativi (Lunedì - Venerdì)
// ---------------------------------------------------------------------------

/**
 * Verifica se una data è un giorno lavorativo (Lunedì - Venerdì)
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Domenica, 6 = Sabato
}

/**
 * Formatta un oggetto Date in stringa ISO YYYY-MM-DD
 */
export function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsa una stringa YYYY-MM-DD in oggetto Date sicuro
 */
export function parseIsoToDate(isoString?: string | null): Date {
  if (!isoString) {
    return new Date();
  }
  const parts = isoString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0); // Mezzogiorno per evitare problemi di fuso
  }
  return new Date(isoString);
}

/**
 * Se la data cade di sabato o domenica, la sposta al primo giorno lavorativo successivo (Lunedì)
 */
export function rollToNextBusinessDay(date: Date): Date {
  const res = new Date(date);
  while (!isBusinessDay(res)) {
    res.setDate(res.getDate() + 1);
  }
  return res;
}

/**
 * Aggiunge N giorni lavorativi a una data di partenza
 * @param startDate Data di inizio
 * @param businessDays Numero di giorni lavorativi da aggiungere (es. 1 giorno significa fine lo stesso giorno)
 */
export function addBusinessDays(startDate: Date | string, businessDays: number): Date {
  const curr = typeof startDate === 'string' ? parseIsoToDate(startDate) : new Date(startDate);
  let d = rollToNextBusinessDay(curr);

  if (businessDays <= 1) {
    return d;
  }

  let added = 1;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) {
      added++;
    }
  }

  return d;
}

/**
 * Calcola il giorno lavorativo successivo alla data indicata
 */
export function getNextBusinessDay(date: Date | string): Date {
  const curr = typeof date === 'string' ? parseIsoToDate(date) : new Date(date);
  const next = new Date(curr);
  next.setDate(next.getDate() + 1);
  return rollToNextBusinessDay(next);
}

// ---------------------------------------------------------------------------
// Validazione Anti-Ciclo e Calcolo Schedulazione Gantt
// ---------------------------------------------------------------------------

/**
 * Verifica l'assenza di cicli nel grafo di dipendenze del template
 */
export function validateTemplateGraphAcyclic(
  tasks: ProcessTemplateTaskDefinition[] | string[] | Array<{ id?: string }>,
  dependencies: ProcessTemplateDependencyDefinition[]
): { isValid: boolean; error?: string } {
  const taskIds = new Set(tasks.map((t: any) => (typeof t === 'string' ? t : t.id || '')));
  const adj = new Map<string, string[]>();

  for (const tid of taskIds) {
    adj.set(tid, []);
  }

  for (const dep of dependencies) {
    if (!taskIds.has(dep.predecessorTaskId) || !taskIds.has(dep.successorTaskId)) {
      continue;
    }
    if (dep.predecessorTaskId === dep.successorTaskId) {
      return { isValid: false, error: `Auto-dipendenza rilevata sul task ${dep.predecessorTaskId}` };
    }
    adj.get(dep.predecessorTaskId)!.push(dep.successorTaskId);
  }

  // Rilevamento cicli tramite DFS con stati (0 = non visitato, 1 = in corso, 2 = completato)
  const state = new Map<string, number>();
  for (const tid of taskIds) {
    state.set(tid, 0);
  }

  function hasCycleDfs(node: string): boolean {
    state.set(node, 1);
    const neighbors = adj.get(node) || [];
    for (const next of neighbors) {
      if (state.get(next) === 1) {
        return true; // Trovato ciclo!
      }
      if (state.get(next) === 0) {
        if (hasCycleDfs(next)) return true;
      }
    }
    state.set(node, 2);
    return false;
  }

  for (const tid of taskIds) {
    if (state.get(tid) === 0) {
      if (hasCycleDfs(tid)) {
        return { isValid: false, error: `Rilevato ciclo di dipendenze nel template coinvolgente il task ${tid}` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Calcola l'anteprima temporale schedulata per tutte le attività e milestone
 */
export function calculateTemplateSchedule(
  definition: ProcessTemplateDefinition,
  optionsOrStartDate?:
    | string
    | {
        startDate?: string; // ISO YYYY-MM-DD
        excludedTaskIds?: string[];
        roleAssignments?: Record<string, { userId: string; userName: string }>;
        existingProjectTasks?: Array<{ title: string; milestoneId?: string | null }>;
      }
): {
  tasks: ScheduledTaskPreview[];
  milestones: ScheduledMilestonePreview[];
  estimatedCompletionDate: string;
  totalWorkDays: number;
  totalHours: number;
  potentialDuplicatesCount: number;
} {
  const options =
    typeof optionsOrStartDate === 'string'
      ? { startDate: optionsOrStartDate }
      : optionsOrStartDate || { startDate: formatDateToIso(new Date()) };

  const excludedSet = new Set(options.excludedTaskIds || []);
  const activeTasks = (definition.tasks || [])
    .filter((t) => !excludedSet.has(t.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const activeTaskIds = new Set(activeTasks.map((t) => t.id));
  const activeDependencies = definition.dependencies.filter(
    (d) => activeTaskIds.has(d.predecessorTaskId) && activeTaskIds.has(d.successorTaskId)
  );

  const phaseMap = new Map(definition.phases.map((p) => [p.id, p]));
  const milestoneMap = new Map(definition.milestones.map((m) => [m.id, m]));

  // In-degree & predecessors map
  const inDegree = new Map<string, number>();
  const predecessorsMap = new Map<string, string[]>();
  const successorsMap = new Map<string, string[]>();

  for (const t of activeTasks) {
    inDegree.set(t.id, 0);
    predecessorsMap.set(t.id, []);
    successorsMap.set(t.id, []);
  }

  for (const dep of activeDependencies) {
    inDegree.set(dep.successorTaskId, (inDegree.get(dep.successorTaskId) || 0) + 1);
    predecessorsMap.get(dep.successorTaskId)!.push(dep.predecessorTaskId);
    successorsMap.get(dep.predecessorTaskId)!.push(dep.successorTaskId);
  }

  const rootStartDate = rollToNextBusinessDay(parseIsoToDate(options.startDate));
  const taskDates = new Map<string, { start: Date; end: Date }>();

  // Topological sorting queue
  const queue: string[] = [];
  for (const t of activeTasks) {
    if ((inDegree.get(t.id) || 0) === 0) {
      queue.push(t.id);
    }
  }

  while (queue.length > 0) {
    const taskId = queue.shift()!;
    const taskDef = activeTasks.find((t) => t.id === taskId)!;
    const preds = predecessorsMap.get(taskId) || [];

    let taskStart: Date;
    if (preds.length === 0) {
      taskStart = new Date(rootStartDate);
    } else {
      // Inizia il giorno lavorativo successivo alla data di fine più avanzata tra i predecessori
      let maxPredEnd: Date = taskDates.get(preds[0])!.end;
      for (let i = 1; i < preds.length; i++) {
        const predEnd = taskDates.get(preds[i])!.end;
        if (predEnd.getTime() > maxPredEnd.getTime()) {
          maxPredEnd = predEnd;
        }
      }
      taskStart = getNextBusinessDay(maxPredEnd);
    }

    const durationDays = Math.max(1, taskDef.estimatedWorkDays || 1);
    const taskEnd = addBusinessDays(taskStart, durationDays);

    taskDates.set(taskId, { start: taskStart, end: taskEnd });

    const successors = successorsMap.get(taskId) || [];
    for (const succId of successors) {
      const remaining = (inDegree.get(succId) || 0) - 1;
      inDegree.set(succId, remaining);
      if (remaining === 0) {
        queue.push(succId);
      }
    }
  }

  // Fallback per eventuali task orfani non processati
  for (const t of activeTasks) {
    if (!taskDates.has(t.id)) {
      const start = new Date(rootStartDate);
      const end = addBusinessDays(start, Math.max(1, t.estimatedWorkDays || 1));
      taskDates.set(t.id, { start, end });
    }
  }

  // Normalizza i task esistenti nel progetto per duplicate check
  const existingNormTitles = (options.existingProjectTasks || []).map((et) =>
    et.title.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  let potentialDuplicatesCount = 0;
  let maxProjectEnd = new Date(rootStartDate);
  let totalHours = 0;

  const scheduledTasks: ScheduledTaskPreview[] = activeTasks.map((t) => {
    const dates = taskDates.get(t.id)!;
    if (dates.end.getTime() > maxProjectEnd.getTime()) {
      maxProjectEnd = dates.end;
    }

    const hours = t.estimatedHours || (t.estimatedWorkDays || 1) * 8;
    totalHours += hours;

    const phase = phaseMap.get(t.phaseId);
    const milestone = t.milestoneId ? milestoneMap.get(t.milestoneId) : null;

    const assignedUser = t.suggestedRole && options.roleAssignments?.[t.suggestedRole]
      ? options.roleAssignments[t.suggestedRole]
      : null;

    const normTitle = t.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isPotentialDuplicate = existingNormTitles.includes(normTitle);
    if (isPotentialDuplicate) {
      potentialDuplicatesCount++;
    }

    return {
      id: t.id,
      templateTaskId: t.id,
      phaseId: t.phaseId,
      phaseName: phase?.name || 'Fase Operativa',
      milestoneId: t.milestoneId || null,
      milestoneTitle: milestone?.title || null,
      title: t.title,
      description: t.description || '',
      plannedStartDate: formatDateToIso(dates.start),
      plannedEndDate: formatDateToIso(dates.end),
      estimatedWorkDays: t.estimatedWorkDays || 1,
      estimatedHours: hours,
      suggestedRole: t.suggestedRole,
      assignedUserId: assignedUser?.userId || null,
      assignedUserName: assignedUser?.userName || null,
      priority: t.priority || 'media',
      requiresClientInput: !!t.requiresClientInput,
      requiresApproval: !!t.requiresApproval,
      checklist: (t.checklist || []).map((c, idx) => ({
        id: c.id || `chk_${idx + 1}`,
        text: c.text,
        completed: false,
      })),
      predecessors: predecessorsMap.get(t.id) || [],
      isPotentialDuplicate,
      duplicateWarning: isPotentialDuplicate
        ? 'Attività con titolo analogo già presente in questo progetto'
        : undefined,
    };
  });

  // Calcolo scadenze milestone basate sulla data massima dei task associati
  const scheduledMilestones: ScheduledMilestonePreview[] = definition.milestones
    .filter((m) => scheduledTasks.some((t) => t.milestoneId === m.id || t.phaseId === m.phaseId))
    .map((m) => {
      const tasksInMilestone = scheduledTasks.filter(
        (t) => t.milestoneId === m.id || (t.phaseId === m.phaseId && !t.milestoneId)
      );
      let msDueDate = rootStartDate;
      if (tasksInMilestone.length > 0) {
        const lastTaskEnd = tasksInMilestone.reduce((latest, current) => {
          const cEnd = parseIsoToDate(current.plannedEndDate);
          return cEnd.getTime() > latest.getTime() ? cEnd : latest;
        }, parseIsoToDate(tasksInMilestone[0].plannedEndDate));
        msDueDate = lastTaskEnd;
      }

      return {
        id: m.id,
        templateMilestoneId: m.id,
        phaseId: m.phaseId,
        title: m.title,
        description: m.description,
        dueDate: formatDateToIso(msDueDate),
      };
    });

  const totalWorkDays = Math.max(
    1,
    scheduledTasks.reduce((acc, t) => acc + (t.estimatedWorkDays || 1), 0)
  );

  return {
    tasks: scheduledTasks,
    milestones: scheduledMilestones,
    estimatedCompletionDate: formatDateToIso(maxProjectEnd),
    totalWorkDays,
    totalHours,
    potentialDuplicatesCount,
  };
}

// ---------------------------------------------------------------------------
// Modelli Seed Operativi Professionali (Italiano)
// ---------------------------------------------------------------------------

export const SEED_WEBSITE_CREATION_TEMPLATE: {
  code: string;
  name: string;
  category: ProcessCategory;
  description: string;
  definition: ProcessTemplateDefinition;
} = {
  code: 'WEBSITE_CREATION',
  name: 'Sito web – realizzazione',
  category: 'website',
  description:
    'Processo completo end-to-end per la progettazione, sviluppo, inserimento contenuti, collaudo e pubblicazione di un sito web aziendale moderno.',
  definition: {
    phases: [
      { id: 'p1_kickoff', name: '1. Kickoff & Raccolta Brief', description: 'Allineamento perimetro e raccolta materiali', sortOrder: 1 },
      { id: 'p2_audit_arch', name: '2. Audit & Architettura', description: 'Analisi sito pregresso e albero dei contenuti', sortOrder: 2 },
      { id: 'p3_wireframe_ux', name: '3. Wireframe & Visual Direction', description: 'Struttura visuale e schemi delle pagine chiave', sortOrder: 3 },
      { id: 'p4_ui_design', name: '4. UI Design & Approvazione', description: 'Mockup grafici ad alta fedeltà e approvazione cliente', sortOrder: 4 },
      { id: 'p5_dev', name: '5. Sviluppo & Integrazioni', description: 'Implementazione frontend, backend e form di contatto', sortOrder: 5 },
      { id: 'p6_content', name: '6. Inserimento Contenuti', description: 'Popolamento testi definitivi, immagini e traduzioni', sortOrder: 6 },
      { id: 'p7_qa', name: '7. QA, Accessibilità & SEO Base', description: 'Test funzionali, responsive design, meta tag e performance', sortOrder: 7 },
      { id: 'p8_golive', name: '8. Pubblicazione & Consegna', description: 'Switch DNS, certificati SSL, tracciamenti e handover', sortOrder: 8 },
    ],
    milestones: [
      { id: 'ms_brief_ok', phaseId: 'p1_kickoff', title: 'Brief e Asset Approvati', description: 'Tutti gli asset iniziali raccolti', sortOrder: 1 },
      { id: 'ms_design_ok', phaseId: 'p4_ui_design', title: 'Design Grafico Approvato', description: 'Approvazione formale bozza grafica', sortOrder: 2 },
      { id: 'ms_dev_ok', phaseId: 'p6_content', title: 'Sviluppo & Contenuti Pronti', description: 'Sito completo in staging per collaudo', sortOrder: 3 },
      { id: 'ms_live_ok', phaseId: 'p8_golive', title: 'Sito Online & Consegna', description: 'Sito pubblicato in produzione e collaudato', sortOrder: 4 },
    ],
    tasks: [
      {
        id: 't_kickoff_meeting',
        phaseId: 'p1_kickoff',
        milestoneId: 'ms_brief_ok',
        title: 'Meeting di Kickoff e verifica perimetro contrattuale',
        description: 'Incontro con gli stakeholder per convalidare milestone, referenti e canali di comunicazione.',
        estimatedWorkDays: 1,
        estimatedHours: 4,
        suggestedRole: 'project_manager',
        priority: 'alta',
        requiresClientInput: true,
        requiresApproval: false,
        sortOrder: 1,
        checklist: [
          { id: 'c1', text: 'Conferma referenti operativi e decisori' },
          { id: 'c2', text: 'Verifica perimetro tecnologico e lingue previste' },
          { id: 'c3', text: 'Condivisione calendario e scadenze di rilascio' },
        ],
      },
      {
        id: 't_asset_collection',
        phaseId: 'p1_kickoff',
        milestoneId: 'ms_brief_ok',
        title: 'Raccolta brand book, logo vettoriale e materiali multimediali',
        description: 'Ricezione e verifica del logo in alta risoluzione, font aziendali, palette colori e archivio foto.',
        estimatedWorkDays: 2,
        estimatedHours: 6,
        suggestedRole: 'web_designer',
        priority: 'media',
        requiresClientInput: true,
        requiresApproval: false,
        sortOrder: 2,
        checklist: [
          { id: 'c1', text: 'Verifica logo SVG / vettoriale' },
          { id: 'c2', text: 'Controllo risoluzione materiale fotografico' },
          { id: 'c3', text: 'Accessi a servizi esterni o archivio media' },
        ],
      },
      {
        id: 't_audit_existing',
        phaseId: 'p2_audit_arch',
        title: 'Audit del sito esistente e analisi competitor/benchmark',
        description: 'Analisi dell’infrastruttura attuale, punti di forza/debolezza, posizionamento e benchmark di settore.',
        estimatedWorkDays: 2,
        estimatedHours: 8,
        suggestedRole: 'seo_specialist',
        priority: 'media',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 3,
        checklist: [
          { id: 'c1', text: 'Audit URL storici per piano di redirect 301' },
          { id: 'c2', text: 'Analisi benchmark di 3 competitor chiave' },
          { id: 'c3', text: 'Mappatura criticità di navigazione pregresse' },
        ],
      },
      {
        id: 't_sitemap_arch',
        phaseId: 'p2_audit_arch',
        title: 'Definizione architettura informativa e sitemap pagine',
        description: 'Elaborazione dell’albero di navigazione, struttura menu principale, footer e tassonomie.',
        estimatedWorkDays: 2,
        estimatedHours: 8,
        suggestedRole: 'project_manager',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: true,
        sortOrder: 4,
        checklist: [
          { id: 'c1', text: 'Sitemap ad albero (Home, Servizi, Chi Siamo, Contatti)' },
          { id: 'c2', text: 'Definizione gerarchia dei contenuti per SEO' },
          { id: 'c3', text: 'Approvazione struttura da parte del cliente' },
        ],
      },
      {
        id: 't_wireframe_ux',
        phaseId: 'p3_wireframe_ux',
        title: 'Progettazione wireframe e layout scheletrici UX',
        description: 'Definizione delle sezioni, call to action, funnel di conversione e blocchi funzionali delle pagine.',
        estimatedWorkDays: 3,
        estimatedHours: 16,
        suggestedRole: 'web_designer',
        priority: 'media',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 5,
        checklist: [
          { id: 'c1', text: 'Wireframe Desktop e Mobile Homepage' },
          { id: 'c2', text: 'Wireframe pagina servizio/prodotto' },
          { id: 'c3', text: 'Wireframe pagina contatti/prenotazione' },
        ],
      },
      {
        id: 't_ui_mockup',
        phaseId: 'p4_ui_design',
        milestoneId: 'ms_design_ok',
        title: 'Elaborazione grafica UI ad alta fedeltà e prototipo interattivo',
        description: 'Creazione del design grafico finale con elementi di branding, tipografia, microinterazioni e palette.',
        estimatedWorkDays: 4,
        estimatedHours: 24,
        suggestedRole: 'web_designer',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 6,
        checklist: [
          { id: 'c1', text: 'Mockup UI per desktop e mobile responsive' },
          { id: 'c2', text: 'Componenti UI kit (bottoni, form, card, tipografia)' },
          { id: 'c3', text: 'Link prototipo navigabile Figma pronto per review' },
        ],
      },
      {
        id: 't_design_approval',
        phaseId: 'p4_ui_design',
        milestoneId: 'ms_design_ok',
        title: 'Presentazione, revisione e approvazione formale bozza grafica',
        description: 'Raccolta feedback congiunto con il referente e ottenimento approvazione scritta del design.',
        estimatedWorkDays: 2,
        estimatedHours: 6,
        suggestedRole: 'account_executive',
        priority: 'urgente',
        requiresClientInput: true,
        requiresApproval: true,
        sortOrder: 7,
        checklist: [
          { id: 'c1', text: 'Presentazione prototipo con il cliente' },
          { id: 'c2', text: 'Applicazione delle correzioni concordate' },
          { id: 'c3', text: 'Firma/approvazione formale della bozza grafica' },
        ],
      },
      {
        id: 't_frontend_dev',
        phaseId: 'p5_dev',
        title: 'Sviluppo frontend responsive, componenti e animazioni',
        description: 'Codifica HTML/CSS/JS o framework moderno conforme alle specifiche di accessibilità e velocità.',
        estimatedWorkDays: 5,
        estimatedHours: 36,
        suggestedRole: 'frontend_dev',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 8,
        checklist: [
          { id: 'c1', text: 'Setup ambiente di staging' },
          { id: 'c2', text: 'Sviluppo componenti modulari responsive' },
          { id: 'c3', text: 'Ottimizzazione Core Web Vitals e caricamento asset' },
        ],
      },
      {
        id: 't_backend_integrations',
        phaseId: 'p5_dev',
        title: 'Integrazione form contatti, email transazionali e CMS/API',
        description: 'Collegamento sistemi di invio lead, API esterne, webhook CRM e gestione permessi backoffice.',
        estimatedWorkDays: 3,
        estimatedHours: 20,
        suggestedRole: 'fullstack_dev',
        priority: 'media',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 9,
        checklist: [
          { id: 'c1', text: 'Integrazione modulo contatti con notifica email' },
          { id: 'c2', text: 'Setup sistema di tracciamento e antispam (reCAPTCHA/Turnstile)' },
          { id: 'c3', text: 'Integrazione webhook CRM per ricezione lead' },
        ],
      },
      {
        id: 't_content_population',
        phaseId: 'p6_content',
        milestoneId: 'ms_dev_ok',
        title: 'Inserimento testi definitivi, copy persuasivo e ottimizzazione immagini',
        description: 'Popolamento di tutte le pagine con i testi finali, formattazione grafica e compressione immagini WebP.',
        estimatedWorkDays: 3,
        estimatedHours: 18,
        suggestedRole: 'copywriter',
        priority: 'alta',
        requiresClientInput: true,
        requiresApproval: false,
        sortOrder: 10,
        checklist: [
          { id: 'c1', text: 'Caricamento testi revisionati in tutte le sezioni' },
          { id: 'c2', text: 'Compressione immagini in formato WebP con tag alt' },
          { id: 'c3', text: 'Verifica informativa privacy, cookie e note legali' },
        ],
      },
      {
        id: 't_qa_testing',
        phaseId: 'p7_qa',
        title: 'Collaudo funzionale, cross-browser, accessibilità e SEO on-page',
        description: 'Test approfondito su Chrome, Safari, Firefox, iOS, Android, test form, link rotti e metadati SEO.',
        estimatedWorkDays: 2,
        estimatedHours: 12,
        suggestedRole: 'qa_tester',
        priority: 'urgente',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 11,
        checklist: [
          { id: 'c1', text: 'Test form e ricezione notifiche su tutti i device' },
          { id: 'c2', text: 'Verifica meta title, description e OpenGraph' },
          { id: 'c3', text: 'Test performance Google PageSpeed / Lighthouse' },
        ],
      },
      {
        id: 't_golive_deployment',
        phaseId: 'p8_golive',
        milestoneId: 'ms_live_ok',
        title: 'Puntamento DNS, emissione certificati SSL e Go-Live in produzione',
        description: 'Configurazione record DNS su server di produzione, attivazione HTTPS e pubblicazione ufficiale.',
        estimatedWorkDays: 1,
        estimatedHours: 6,
        suggestedRole: 'fullstack_dev',
        priority: 'urgente',
        requiresClientInput: true,
        requiresApproval: true,
        sortOrder: 12,
        checklist: [
          { id: 'c1', text: 'Switch record DNS e attivazione SSL' },
          { id: 'c2', text: 'Verifica sitemap.xml e robots.txt in produzione' },
          { id: 'c3', text: 'Invio sitemap a Google Search Console' },
        ],
      },
      {
        id: 't_handover_training',
        phaseId: 'p8_golive',
        milestoneId: 'ms_live_ok',
        title: 'Consegna credenziali, formazione cliente e chiusura lavori',
        description: 'Sessione di training per l’aggiornamento dei contenuti e consegna del pacchetto documentale.',
        estimatedWorkDays: 1,
        estimatedHours: 4,
        suggestedRole: 'project_manager',
        priority: 'media',
        requiresClientInput: true,
        requiresApproval: true,
        sortOrder: 13,
        checklist: [
          { id: 'c1', text: 'Consegna credenziali di accesso al cliente' },
          { id: 'c2', text: 'Sessione di handover formativa' },
          { id: 'c3', text: 'Verifica accettazione finale del rilascio' },
        ],
      },
    ],
    dependencies: [
      { predecessorTaskId: 't_kickoff_meeting', successorTaskId: 't_asset_collection', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_kickoff_meeting', successorTaskId: 't_audit_existing', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_audit_existing', successorTaskId: 't_sitemap_arch', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_sitemap_arch', successorTaskId: 't_wireframe_ux', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_asset_collection', successorTaskId: 't_ui_mockup', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_wireframe_ux', successorTaskId: 't_ui_mockup', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_ui_mockup', successorTaskId: 't_design_approval', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_design_approval', successorTaskId: 't_frontend_dev', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_frontend_dev', successorTaskId: 't_backend_integrations', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_frontend_dev', successorTaskId: 't_content_population', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_backend_integrations', successorTaskId: 't_qa_testing', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_content_population', successorTaskId: 't_qa_testing', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_qa_testing', successorTaskId: 't_golive_deployment', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_golive_deployment', successorTaskId: 't_handover_training', dependencyType: 'finish_to_start' },
    ],
  },
};

export const SEED_SEO_LAUNCH_TEMPLATE: {
  code: string;
  name: string;
  category: ProcessCategory;
  description: string;
  definition: ProcessTemplateDefinition;
} = {
  code: 'SEO_LAUNCH',
  name: 'SEO – avvio',
  category: 'seo',
  description:
    'Piano strategico e operativo per l’avvio del posizionamento organico: audit tecnico, studio parole chiave, piano di ottimizzazione on-page e report di baseline.',
  definition: {
    phases: [
      { id: 'p1_goals', name: '1. Obiettivi & Accessi', description: 'Definizione KPI e controllo proprietà analitiche', sortOrder: 1 },
      { id: 'p2_audit', name: '2. Audit Tecnico & Contenuti', description: 'Scansione completa sito e individuazione criticità', sortOrder: 2 },
      { id: 'p3_intent', name: '3. Analisi Keyword & Competitor', description: 'Mappatura query di ricerca e gap analysis', sortOrder: 3 },
      { id: 'p4_action_plan', name: '4. Piano Priorità & Interventi', description: 'Pianificazione interventi tecnici e content roadmap', sortOrder: 4 },
      { id: 'p5_onpage', name: '5. Ottimizzazioni On-Page', description: 'Interventi diretti su tag, gerarchia e contenuti', sortOrder: 5 },
      { id: 'p6_tracking', name: '6. Tracciamento & Baseline Report', description: 'Verifica Search Console e report iniziale', sortOrder: 6 },
    ],
    milestones: [
      { id: 'ms_seo_access_ok', phaseId: 'p1_goals', title: 'Accessi e Obiettivi Convalidati', description: 'Tutte le proprietà configurate', sortOrder: 1 },
      { id: 'ms_seo_audit_ok', phaseId: 'p2_audit', title: 'Audit Tecnico & Keyword Strategy Pronti', description: 'Diagnostica completa e piano approvato', sortOrder: 2 },
      { id: 'ms_seo_onpage_ok', phaseId: 'p5_onpage', title: 'Ottimizzazioni On-Page Applicate', description: 'Pagine chiave aggiornate con i nuovi metadati', sortOrder: 3 },
      { id: 'ms_seo_baseline_ok', phaseId: 'p6_tracking', title: 'Report Baseline & Roadmap Trimestrale', description: 'Consegna reportistica e piano di mantenimento', sortOrder: 4 },
    ],
    tasks: [
      {
        id: 't_seo_goals_kpi',
        phaseId: 'p1_goals',
        milestoneId: 'ms_seo_access_ok',
        title: 'Definizione obiettivi commerciali, target geografico e KPI SEO',
        description: 'Identificazione dei segmenti target, mercati geografici prioritari e metriche di successo (impression, clic, conversioni).',
        estimatedWorkDays: 1,
        estimatedHours: 4,
        suggestedRole: 'seo_specialist',
        priority: 'alta',
        requiresClientInput: true,
        requiresApproval: false,
        sortOrder: 1,
        checklist: [
          { id: 'c1', text: 'Identificazione prodotti/servizi ad alta marginalità' },
          { id: 'c2', text: 'Definizione raggio geografico (Locale vs Nazionale/Estero)' },
          { id: 'c3', text: 'Fissazione target numerici a 3, 6 e 12 mesi' },
        ],
      },
      {
        id: 't_seo_access_setup',
        phaseId: 'p1_goals',
        milestoneId: 'ms_seo_access_ok',
        title: 'Verifica e configurazione accessi Google Search Console e GA4',
        description: 'Controllo proprietà dominio in Search Console, flussi dati GA4 e associazione Google Tag Manager.',
        estimatedWorkDays: 1,
        estimatedHours: 4,
        suggestedRole: 'seo_specialist',
        priority: 'urgente',
        requiresClientInput: true,
        requiresApproval: false,
        sortOrder: 2,
        checklist: [
          { id: 'c1', text: 'Verifica proprietà DNS su Google Search Console' },
          { id: 'c2', text: 'Controllo tracciamento conversioni e eventi in GA4' },
          { id: 'c3', text: 'Controllo sitemap indicizzata in GSC' },
        ],
      },
      {
        id: 't_seo_tech_crawl',
        phaseId: 'p2_audit',
        milestoneId: 'ms_seo_audit_ok',
        title: 'Crawl tecnico del sito web ed estrazione anomalie',
        description: 'Scansione integrale del sito con crawler per individuare errori 404, catene di redirect, pagine orfane e lentezze.',
        estimatedWorkDays: 2,
        estimatedHours: 12,
        suggestedRole: 'seo_specialist',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 3,
        checklist: [
          { id: 'c1', text: 'Analisi codici di stato HTTP (4xx, 5xx, 3xx)' },
          { id: 'c2', text: 'Verifica file robots.txt e direttive noindex accidentali' },
          { id: 'c3', text: 'Controllo canonical URL e tag hreflang se multilingua' },
        ],
      },
      {
        id: 't_seo_keyword_research',
        phaseId: 'p3_intent',
        milestoneId: 'ms_seo_audit_ok',
        title: 'Ricerca parole chiave, intenzione di ricerca e mappatura competitor',
        description: 'Studio dei volumi di ricerca, difficoltà posizionamento, query transazionali e informational di settore.',
        estimatedWorkDays: 3,
        estimatedHours: 16,
        suggestedRole: 'seo_specialist',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 4,
        checklist: [
          { id: 'c1', text: 'Estrazione cluster di keyword primarie e correlate' },
          { id: 'c2', text: 'Analisi del posizionamento organico dei top 3 competitor' },
          { id: 'c3', text: 'Mappatura keyword sulle pagine del sito (Search Intent Mapping)' },
        ],
      },
      {
        id: 't_seo_action_plan',
        phaseId: 'p4_action_plan',
        title: 'Elaborazione del piano di intervento e priorità correttive',
        description: 'Prioritizzazione delle azioni correttive (Quick Wins vs interventi strutturali a medio termine).',
        estimatedWorkDays: 2,
        estimatedHours: 8,
        suggestedRole: 'seo_specialist',
        priority: 'media',
        requiresClientInput: false,
        requiresApproval: true,
        sortOrder: 5,
        checklist: [
          { id: 'c1', text: 'Classificazione task per impatto e facilità d’esecuzione' },
          { id: 'c2', text: 'Definizione linee guida per la redazione contenuti' },
          { id: 'c3', text: 'Condivisione piano con il team di sviluppo/marketing' },
        ],
      },
      {
        id: 't_seo_onpage_opt',
        phaseId: 'p5_onpage',
        milestoneId: 'ms_seo_onpage_ok',
        title: 'Ottimizzazione tag on-page (Title, Meta Description, H1/H2, Schema.org)',
        description: 'Riscrivere e implementare metadati persuasivi e SEO-friendly sulle pagine primarie e strutturare i dati JSON-LD.',
        estimatedWorkDays: 3,
        estimatedHours: 18,
        suggestedRole: 'seo_specialist',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 6,
        checklist: [
          { id: 'c1', text: 'Ottimizzazione Title tag e Meta Description pagine chiave' },
          { id: 'c2', text: 'Riorganizzazione gerarchica dei tag di intestazione H1-H3' },
          { id: 'c3', text: 'Implementazione markup dati strutturati Schema.org' },
        ],
      },
      {
        id: 't_seo_internal_linking',
        phaseId: 'p5_onpage',
        milestoneId: 'ms_seo_onpage_ok',
        title: 'Ottimizzazione link building interna e anchor text strategiche',
        description: 'Rafforzamento della distribuzione del PageRank interno verso le landing page di conversione.',
        estimatedWorkDays: 1,
        estimatedHours: 6,
        suggestedRole: 'seo_specialist',
        priority: 'media',
        requiresClientInput: false,
        requiresApproval: false,
        sortOrder: 7,
        checklist: [
          { id: 'c1', text: 'Inserimento link contestuali con anchor text mirate' },
          { id: 'c2', text: 'Rimozione link rotti interni o redirect inutili' },
          { id: 'c3', text: 'Controllo navigabilità da mobile' },
        ],
      },
      {
        id: 't_seo_baseline_report',
        phaseId: 'p6_tracking',
        milestoneId: 'ms_seo_baseline_ok',
        title: 'Redazione Report di Baseline e Roadmap continuativa',
        description: 'Documentazione delle posizioni di partenza, metriche attuali e piano di mantenimento/content trimestrale.',
        estimatedWorkDays: 2,
        estimatedHours: 8,
        suggestedRole: 'account_executive',
        priority: 'alta',
        requiresClientInput: false,
        requiresApproval: true,
        sortOrder: 8,
        checklist: [
          { id: 'c1', text: 'Creazione dashboard Looker Studio / report baseline' },
          { id: 'c2', text: 'Confronto impression e posizioni medie iniziali' },
          { id: 'c3', text: 'Presentazione del piano editoriale e di crescita organica' },
        ],
      },
    ],
    dependencies: [
      { predecessorTaskId: 't_seo_goals_kpi', successorTaskId: 't_seo_access_setup', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_access_setup', successorTaskId: 't_seo_tech_crawl', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_access_setup', successorTaskId: 't_seo_keyword_research', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_tech_crawl', successorTaskId: 't_seo_action_plan', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_keyword_research', successorTaskId: 't_seo_action_plan', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_action_plan', successorTaskId: 't_seo_onpage_opt', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_onpage_opt', successorTaskId: 't_seo_internal_linking', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_seo_internal_linking', successorTaskId: 't_seo_baseline_report', dependencyType: 'finish_to_start' },
    ],
  },
};

export const DEFAULT_SEED_TEMPLATES = [
  SEED_WEBSITE_CREATION_TEMPLATE,
  SEED_SEO_LAUNCH_TEMPLATE,
];
