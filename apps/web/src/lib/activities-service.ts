import {
  db,
  crmCalls,
  crmAppointments,
  crmCallbacks,
  crmReminders,
  tasks,
  projects,
  leads,
  companies,
  users,
  CrmCall,
  CrmAppointment,
  CrmCallback,
  CrmReminder,
} from '@ai-crm/db';
import { eq, ne, and, desc, asc, gte, lte, or, inArray } from 'drizzle-orm';
import { UserSessionPayload } from './auth';
import { logActivity } from './activity-logger';
import crypto from 'crypto';

// ============================================================================
// Types & Enums
// ============================================================================

export type CallDirection = 'outbound' | 'inbound';

export type CallOutcome =
  | 'answered_interested'
  | 'answered_not_interested'
  | 'no_answer'
  | 'busy'
  | 'voicemail'
  | 'wrong_number'
  | 'callback_requested';

export type AppointmentType =
  | 'discovery_call'
  | 'demo_presentation'
  | 'quote_review'
  | 'kickoff_meeting'
  | 'in_person_meeting'
  | 'other';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export type LocationType =
  | 'video_call'
  | 'client_office'
  | 'our_office'
  | 'phone_call'
  | 'other';

export type CallbackStatus = 'pending' | 'completed' | 'cancelled' | 'overdue';
export type CallbackPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface LogCallInput {
  leadId?: string | null;
  companyId?: string | null;
  direction?: CallDirection;
  phoneNumber?: string | null;
  callOutcome: CallOutcome;
  durationSeconds?: number;
  notes?: string | null;
  calledAt?: string;
  // Option to schedule a callback simultaneously
  scheduleCallback?: {
    scheduledAt: string;
    reason: string;
    priority?: CallbackPriority;
    assignedUserId?: string;
  };
}

export interface CreateAppointmentInput {
  leadId?: string | null;
  companyId?: string | null;
  orderId?: string | null;
  projectId?: string | null;
  title: string;
  description?: string | null;
  appointmentType?: AppointmentType;
  status?: AppointmentStatus;
  scheduledStartTime: string;
  scheduledEndTime?: string;
  durationMinutes?: number;
  locationType?: LocationType;
  meetingUrl?: string | null;
  meetingAddress?: string | null;
  attendees?: Array<{ name: string; email?: string; role?: string }>;
  outcomeNotes?: string | null;
}

export interface UpdateAppointmentInput {
  title?: string;
  description?: string | null;
  appointmentType?: AppointmentType;
  status?: AppointmentStatus;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  locationType?: LocationType;
  meetingUrl?: string | null;
  meetingAddress?: string | null;
  attendees?: Array<{ name: string; email?: string; role?: string }>;
  outcomeNotes?: string | null;
}

export interface CreateCallbackInput {
  leadId?: string | null;
  companyId?: string | null;
  callId?: string | null;
  assignedUserId?: string;
  scheduledAt: string;
  priority?: CallbackPriority;
  reason: string;
}

export interface UpdateCallbackInput {
  status?: CallbackStatus;
  scheduledAt?: string;
  priority?: CallbackPriority;
  reason?: string;
  completedNotes?: string | null;
}

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderCategory = 'general' | 'admin' | 'call' | 'finance' | 'idea' | 'followup';

export interface CreateReminderInput {
  title: string;
  description?: string | null;
  dueDateTime?: string | null;
  priority?: ReminderPriority;
  category?: ReminderCategory;
  leadId?: string | null;
  companyId?: string | null;
  color?: string | null;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string | null;
  dueDateTime?: string | null;
  isCompleted?: boolean;
  priority?: ReminderPriority;
  category?: ReminderCategory;
  leadId?: string | null;
  companyId?: string | null;
  color?: string | null;
}

// ============================================================================
// Call Logging Operations
// ============================================================================

export async function logCall(
  input: LogCallInput,
  user: UserSessionPayload
): Promise<{ call: CrmCall; callback?: CrmCallback }> {
  const callId = `call_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const calledAt = input.calledAt || now;

  const newCall = {
    id: callId,
    leadId: input.leadId || null,
    companyId: input.companyId || null,
    callerUserId: user.userId,
    direction: input.direction || 'outbound',
    phoneNumber: input.phoneNumber || null,
    callOutcome: input.callOutcome,
    durationSeconds: input.durationSeconds || 0,
    notes: input.notes || null,
    calledAt,
    createdAt: now,
  };

  db.insert(crmCalls).values(newCall).run();

  await logActivity({
    entityType: 'crm_call',
    entityId: callId,
    action: 'call_logged',
    performedBy: user.userId,
    details: {
      direction: input.direction,
      outcome: input.callOutcome,
      leadId: input.leadId,
      companyId: input.companyId,
      duration: input.durationSeconds,
    },
  });

  // If callback was requested in payload or outcome is callback_requested
  let createdCallback: CrmCallback | undefined;
  if (input.scheduleCallback) {
    const cbId = `cb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cbRecord = {
      id: cbId,
      leadId: input.leadId || null,
      companyId: input.companyId || null,
      callId,
      assignedUserId: input.scheduleCallback.assignedUserId || user.userId,
      scheduledAt: input.scheduleCallback.scheduledAt,
      status: 'pending' as CallbackStatus,
      priority: input.scheduleCallback.priority || 'medium',
      reason: input.scheduleCallback.reason,
      completedAt: null,
      completedNotes: null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(crmCallbacks).values(cbRecord).run();
    createdCallback = cbRecord;

    await logActivity({
      entityType: 'crm_callback',
      entityId: cbId,
      action: 'callback_scheduled',
      performedBy: user.userId,
      details: {
        scheduledAt: input.scheduleCallback.scheduledAt,
        reason: input.scheduleCallback.reason,
        callId,
      },
    });
  }

  return { call: newCall, callback: createdCallback };
}

export async function listCalls(params?: {
  leadId?: string;
  companyId?: string;
  callerUserId?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (params?.leadId) conditions.push(eq(crmCalls.leadId, params.leadId));
  if (params?.companyId) conditions.push(eq(crmCalls.companyId, params.companyId));
  if (params?.callerUserId) conditions.push(eq(crmCalls.callerUserId, params.callerUserId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rawCalls = db
    .select({
      call: crmCalls,
      callerName: users.name,
      callerEmail: users.email,
      leadCompanyName: leads.companyName,
      companyName: companies.name,
    })
    .from(crmCalls)
    .leftJoin(users, eq(crmCalls.callerUserId, users.id))
    .leftJoin(leads, eq(crmCalls.leadId, leads.id))
    .leftJoin(companies, eq(crmCalls.companyId, companies.id))
    .where(whereClause)
    .orderBy(desc(crmCalls.calledAt))
    .limit(params?.limit || 50)
    .offset(params?.offset || 0)
    .all();

  return rawCalls.map((r) => ({
    ...r.call,
    caller: { name: r.callerName, email: r.callerEmail },
    leadCompanyName: r.leadCompanyName,
    companyName: r.companyName,
  }));
}

export async function getCallById(id: string) {
  const result = db
    .select({
      call: crmCalls,
      callerName: users.name,
      callerEmail: users.email,
      leadCompanyName: leads.companyName,
      companyName: companies.name,
    })
    .from(crmCalls)
    .leftJoin(users, eq(crmCalls.callerUserId, users.id))
    .leftJoin(leads, eq(crmCalls.leadId, leads.id))
    .leftJoin(companies, eq(crmCalls.companyId, companies.id))
    .where(eq(crmCalls.id, id))
    .get();

  if (!result) return null;
  return {
    ...result.call,
    caller: { name: result.callerName, email: result.callerEmail },
    leadCompanyName: result.leadCompanyName,
    companyName: result.companyName,
  };
}

// ============================================================================
// Appointments Operations
// ============================================================================

export async function createAppointment(
  input: CreateAppointmentInput,
  user: UserSessionPayload
): Promise<CrmAppointment> {
  const appointmentId = `appt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const startTime = new Date(input.scheduledStartTime);
  const scheduledEndTime =
    input.scheduledEndTime ||
    new Date(startTime.getTime() + (input.durationMinutes || 45) * 60000).toISOString();

  const newAppt: CrmAppointment = {
    id: appointmentId,
    leadId: input.leadId || null,
    companyId: input.companyId || null,
    orderId: input.orderId || null,
    projectId: input.projectId || null,
    title: input.title,
    description: input.description || null,
    appointmentType: input.appointmentType || 'discovery_call',
    status: input.status || 'scheduled',
    scheduledStartTime: input.scheduledStartTime,
    scheduledEndTime: scheduledEndTime,
    locationType: input.locationType || 'video_call',
    meetingUrl: input.meetingUrl || null,
    meetingAddress: input.meetingAddress || null,
    organizerUserId: user.userId,
    attendeesJson: JSON.stringify(input.attendees || []),
    outcomeNotes: input.outcomeNotes || null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(crmAppointments).values(newAppt).run();

  await logActivity({
    entityType: 'crm_appointment',
    entityId: appointmentId,
    action: 'appointment_created',
    performedBy: user.userId,
    details: {
      title: input.title,
      type: input.appointmentType,
      startTime: input.scheduledStartTime,
      leadId: input.leadId,
      companyId: input.companyId,
    },
  });

  return newAppt;
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
  user: UserSessionPayload
): Promise<CrmAppointment | null> {
  const existing = db
    .select()
    .from(crmAppointments)
    .where(eq(crmAppointments.id, id))
    .get();

  if (!existing) return null;

  const now = new Date().toISOString();
  const updateData: Partial<CrmAppointment> = {
    updatedAt: now,
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.appointmentType !== undefined) updateData.appointmentType = input.appointmentType;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.scheduledStartTime !== undefined) updateData.scheduledStartTime = input.scheduledStartTime;
  if (input.scheduledEndTime !== undefined) updateData.scheduledEndTime = input.scheduledEndTime;
  if (input.locationType !== undefined) updateData.locationType = input.locationType;
  if (input.meetingUrl !== undefined) updateData.meetingUrl = input.meetingUrl;
  if (input.meetingAddress !== undefined) updateData.meetingAddress = input.meetingAddress;
  if (input.attendees !== undefined) updateData.attendeesJson = JSON.stringify(input.attendees);
  if (input.outcomeNotes !== undefined) updateData.outcomeNotes = input.outcomeNotes;

  db.update(crmAppointments)
    .set(updateData)
    .where(eq(crmAppointments.id, id))
    .run();

  await logActivity({
    entityType: 'crm_appointment',
    entityId: id,
    action: 'appointment_updated',
    performedBy: user.userId,
    details: input,
    before: existing,
  });

  return { ...existing, ...updateData };
}

export async function deleteAppointment(
  id: string,
  user: UserSessionPayload
): Promise<boolean> {
  const existing = db
    .select()
    .from(crmAppointments)
    .where(eq(crmAppointments.id, id))
    .get();

  if (!existing) return false;

  db.delete(crmAppointments).where(eq(crmAppointments.id, id)).run();

  await logActivity({
    entityType: 'crm_appointment',
    entityId: id,
    action: 'appointment_deleted',
    performedBy: user.userId,
    details: { title: existing.title },
    before: existing,
  });

  return true;
}

export async function listAppointments(params?: {
  startDate?: string;
  endDate?: string;
  leadId?: string;
  companyId?: string;
  organizerUserId?: string;
  status?: AppointmentStatus;
  limit?: number;
}) {
  const conditions = [];
  if (params?.leadId) conditions.push(eq(crmAppointments.leadId, params.leadId));
  if (params?.companyId) conditions.push(eq(crmAppointments.companyId, params.companyId));
  if (params?.organizerUserId) conditions.push(eq(crmAppointments.organizerUserId, params.organizerUserId));
  if (params?.status) conditions.push(eq(crmAppointments.status, params.status));
  if (params?.startDate) conditions.push(gte(crmAppointments.scheduledStartTime, params.startDate));
  if (params?.endDate) conditions.push(lte(crmAppointments.scheduledStartTime, params.endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rawList = db
    .select({
      appt: crmAppointments,
      organizerName: users.name,
      organizerEmail: users.email,
      leadCompanyName: leads.companyName,
      companyName: companies.name,
    })
    .from(crmAppointments)
    .leftJoin(users, eq(crmAppointments.organizerUserId, users.id))
    .leftJoin(leads, eq(crmAppointments.leadId, leads.id))
    .leftJoin(companies, eq(crmAppointments.companyId, companies.id))
    .where(whereClause)
    .orderBy(asc(crmAppointments.scheduledStartTime))
    .limit(params?.limit || 100)
    .all();

  return rawList.map((r) => {
    let attendees = [];
    try {
      attendees = JSON.parse(r.appt.attendeesJson || '[]');
    } catch {}

    return {
      ...r.appt,
      attendees,
      organizer: { name: r.organizerName, email: r.organizerEmail },
      leadCompanyName: r.leadCompanyName,
      companyName: r.companyName,
    };
  });
}

export async function getAppointmentById(id: string) {
  const result = db
    .select({
      appt: crmAppointments,
      organizerName: users.name,
      organizerEmail: users.email,
      leadCompanyName: leads.companyName,
      companyName: companies.name,
    })
    .from(crmAppointments)
    .leftJoin(users, eq(crmAppointments.organizerUserId, users.id))
    .leftJoin(leads, eq(crmAppointments.leadId, leads.id))
    .leftJoin(companies, eq(crmAppointments.companyId, companies.id))
    .where(eq(crmAppointments.id, id))
    .get();

  if (!result) return null;

  let attendees = [];
  try {
    attendees = JSON.parse(result.appt.attendeesJson || '[]');
  } catch {}

  return {
    ...result.appt,
    attendees,
    organizer: { name: result.organizerName, email: result.organizerEmail },
    leadCompanyName: result.leadCompanyName,
    companyName: result.companyName,
  };
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string for export
 */
export async function generateIcsForAppointment(id: string): Promise<string | null> {
  const appt = await getAppointmentById(id);
  if (!appt) return null;

  const formatIcsDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtStart = formatIcsDate(appt.scheduledStartTime);
  const dtEnd = formatIcsDate(appt.scheduledEndTime);
  const dtStamp = formatIcsDate(appt.createdAt);

  const escapeIcs = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const location = appt.meetingUrl || appt.meetingAddress || (appt.locationType === 'video_call' ? 'Videochiamata' : '');
  const relatedTarget = appt.leadCompanyName || appt.companyName || '';
  const summary = relatedTarget ? `${appt.title} - ${relatedTarget}` : appt.title;
  const description = [
    appt.description || '',
    relatedTarget ? `Cliente/Lead: ${relatedTarget}` : '',
    appt.meetingUrl ? `Link Riunione: ${appt.meetingUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Consulting Solutions//CRM Calendar Hub//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${appt.id}@aiconsulting.crm`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    description ? `DESCRIPTION:${escapeIcs(description)}` : '',
    location ? `LOCATION:${escapeIcs(location)}` : '',
    `STATUS:${appt.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

// ============================================================================
// Callbacks (Richiamate) Operations
// ============================================================================

export async function createCallback(
  input: CreateCallbackInput,
  user: UserSessionPayload
): Promise<CrmCallback> {
  const cbId = `cb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const newCb: CrmCallback = {
    id: cbId,
    leadId: input.leadId || null,
    companyId: input.companyId || null,
    callId: input.callId || null,
    assignedUserId: input.assignedUserId || user.userId,
    scheduledAt: input.scheduledAt,
    status: 'pending',
    priority: input.priority || 'medium',
    reason: input.reason,
    completedAt: null,
    completedNotes: null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(crmCallbacks).values(newCb).run();

  await logActivity({
    entityType: 'crm_callback',
    entityId: cbId,
    action: 'callback_created',
    performedBy: user.userId,
    details: {
      scheduledAt: input.scheduledAt,
      reason: input.reason,
      priority: input.priority,
      leadId: input.leadId,
      companyId: input.companyId,
    },
  });

  return newCb;
}

export async function updateCallback(
  id: string,
  input: UpdateCallbackInput,
  user: UserSessionPayload
): Promise<CrmCallback | null> {
  const existing = db
    .select()
    .from(crmCallbacks)
    .where(eq(crmCallbacks.id, id))
    .get();

  if (!existing) return null;

  const now = new Date().toISOString();
  const updateData: Partial<CrmCallback> = {
    updatedAt: now,
  };

  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === 'completed' && !existing.completedAt) {
      updateData.completedAt = now;
    }
  }
  if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.reason !== undefined) updateData.reason = input.reason;
  if (input.completedNotes !== undefined) updateData.completedNotes = input.completedNotes;

  db.update(crmCallbacks)
    .set(updateData)
    .where(eq(crmCallbacks.id, id))
    .run();

  await logActivity({
    entityType: 'crm_callback',
    entityId: id,
    action: 'callback_updated',
    performedBy: user.userId,
    details: input,
    before: existing,
  });

  return { ...existing, ...updateData };
}

export async function deleteCallback(
  id: string,
  user: UserSessionPayload
): Promise<boolean> {
  const existing = db
    .select()
    .from(crmCallbacks)
    .where(eq(crmCallbacks.id, id))
    .get();

  if (!existing) return false;

  db.delete(crmCallbacks).where(eq(crmCallbacks.id, id)).run();

  await logActivity({
    entityType: 'crm_callback',
    entityId: id,
    action: 'callback_deleted',
    performedBy: user.userId,
    details: { reason: existing.reason },
    before: existing,
  });

  return true;
}

export async function listCallbacks(params?: {
  leadId?: string;
  companyId?: string;
  assignedUserId?: string;
  status?: CallbackStatus;
  limit?: number;
}) {
  const conditions = [];
  if (params?.leadId) conditions.push(eq(crmCallbacks.leadId, params.leadId));
  if (params?.companyId) conditions.push(eq(crmCallbacks.companyId, params.companyId));
  if (params?.assignedUserId) conditions.push(eq(crmCallbacks.assignedUserId, params.assignedUserId));
  if (params?.status) conditions.push(eq(crmCallbacks.status, params.status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const nowIso = new Date().toISOString();

  const rawList = db
    .select({
      cb: crmCallbacks,
      assignedName: users.name,
      assignedEmail: users.email,
      leadCompanyName: leads.companyName,
      companyName: companies.name,
    })
    .from(crmCallbacks)
    .leftJoin(users, eq(crmCallbacks.assignedUserId, users.id))
    .leftJoin(leads, eq(crmCallbacks.leadId, leads.id))
    .leftJoin(companies, eq(crmCallbacks.companyId, companies.id))
    .where(whereClause)
    .orderBy(asc(crmCallbacks.scheduledAt))
    .limit(params?.limit || 100)
    .all();

  return rawList.map((r) => {
    // Check if pending callback is past due
    const isOverdue = r.cb.status === 'pending' && r.cb.scheduledAt < nowIso;
    const effectiveStatus: CallbackStatus = isOverdue ? 'overdue' : r.cb.status;

    return {
      ...r.cb,
      status: effectiveStatus,
      isOverdue,
      assignedUser: { name: r.assignedName, email: r.assignedEmail },
      leadCompanyName: r.leadCompanyName,
      companyName: r.companyName,
    };
  });
}

// ============================================================================
// Calendar Aggregator (Unified Schedule View)
// ============================================================================

export interface CalendarEvent {
  id: string;
  eventType: 'appointment' | 'callback' | 'call';
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  priority?: string;
  locationType?: string;
  meetingUrl?: string | null;
  targetName?: string;
  leadId?: string | null;
  companyId?: string | null;
  userName?: string;
}

export async function getCalendarEvents(params: {
  startDate: string;
  endDate: string;
  userId?: string;
  leadId?: string;
  companyId?: string;
}): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // 1. Fetch appointments
  const appts = await listAppointments({
    startDate: params.startDate,
    endDate: params.endDate,
    organizerUserId: params.userId,
    leadId: params.leadId,
    companyId: params.companyId,
  });

  for (const a of appts) {
    events.push({
      id: a.id,
      eventType: 'appointment',
      title: a.title,
      startTime: a.scheduledStartTime,
      endTime: a.scheduledEndTime,
      status: a.status,
      locationType: a.locationType,
      meetingUrl: a.meetingUrl,
      targetName: a.leadCompanyName || a.companyName || undefined,
      leadId: a.leadId,
      companyId: a.companyId,
      userName: a.organizer?.name || undefined,
    });
  }

  // 2. Fetch callbacks in range
  const callbacks = await listCallbacks({
    assignedUserId: params.userId,
    leadId: params.leadId,
    companyId: params.companyId,
  });

  for (const cb of callbacks) {
    if (cb.scheduledAt >= params.startDate && cb.scheduledAt <= params.endDate) {
      // Calculate a 15-minute window for callbacks
      const endTime = new Date(new Date(cb.scheduledAt).getTime() + 15 * 60 * 1000).toISOString();
      events.push({
        id: cb.id,
        eventType: 'callback',
        title: `Richiamata: ${cb.reason}`,
        startTime: cb.scheduledAt,
        endTime,
        status: cb.status,
        priority: cb.priority,
        targetName: cb.leadCompanyName || cb.companyName || undefined,
        leadId: cb.leadId,
        companyId: cb.companyId,
        userName: cb.assignedUser?.name || undefined,
      });
    }
  }

  // Sort chronologically
  events.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return events;
}

// ============================================================================
// Dashboard / Today's Agenda
// ============================================================================

export async function getTodayAgenda(userId?: string) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
  const nowIso = new Date().toISOString();

  // Appointments today
  const appointmentsToday = await listAppointments({
    startDate: startOfDay,
    endDate: endOfDay,
    organizerUserId: userId,
  });

  // Callbacks: today's callbacks and overdue callbacks
  const allCallbacks = await listCallbacks({
    assignedUserId: userId,
  });

  const callbacksToday = allCallbacks.filter(
    (c) => c.status === 'pending' && c.scheduledAt >= startOfDay && c.scheduledAt <= endOfDay
  );

  const callbacksOverdue = allCallbacks.filter(
    (c) => c.status === 'overdue' || (c.status === 'pending' && c.scheduledAt < startOfDay)
  );

  // Calls logged today
  const todayCalls = await listCalls({
    callerUserId: userId,
    limit: 20,
  });
  const filteredCallsToday = todayCalls.filter(
    (c) => c.calledAt >= startOfDay && c.calledAt <= endOfDay
  );

  // Reminders for user
  const userReminders = userId ? await listReminders({ userId, isCompleted: false, limit: 10 }) : [];
  const pendingRemindersCount = userReminders.length;

  return {
    appointmentsToday,
    callbacksToday,
    callbacksOverdue,
    todayCalls: filteredCallsToday,
    reminders: userReminders,
    pendingReminders: userReminders,
    counts: {
      todayAppointmentsCount: appointmentsToday.length,
      todayCallbacksCount: callbacksToday.length,
      overdueCallbacksCount: callbacksOverdue.length,
      todayCallsCount: filteredCallsToday.length,
      pendingRemindersCount,
    },
  };
}

// ============================================================================
// Quick Reminders & Standalone Tasks (Cose da ricordare non legate a progetti)
// ============================================================================

export async function createReminder(
  input: CreateReminderInput,
  user: UserSessionPayload
): Promise<CrmReminder> {
  const reminderId = `rem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const newRem: CrmReminder = {
    id: reminderId,
    userId: user.userId,
    title: input.title,
    description: input.description || null,
    dueDateTime: input.dueDateTime || null,
    isCompleted: false,
    completedAt: null,
    priority: input.priority || 'medium',
    category: input.category || 'general',
    leadId: input.leadId || null,
    companyId: input.companyId || null,
    color: input.color || 'slate',
    createdAt: now,
    updatedAt: now,
  };

  db.insert(crmReminders).values(newRem).run();

  await logActivity({
    entityType: 'crm_reminder',
    entityId: reminderId,
    action: 'reminder_created',
    performedBy: user.userId,
    details: {
      title: input.title,
      dueDateTime: input.dueDateTime,
      priority: input.priority,
      category: input.category,
    },
  });

  return newRem;
}

export async function updateReminder(
  id: string,
  input: UpdateReminderInput,
  user: UserSessionPayload
): Promise<CrmReminder | null> {
  const existing = db
    .select()
    .from(crmReminders)
    .where(eq(crmReminders.id, id))
    .get();

  if (!existing) return null;
  // Solo il proprietario o admin può modificare
  if (user.role !== 'admin' && existing.userId !== user.userId) {
    throw new Error('FORBIDDEN');
  }

  const now = new Date().toISOString();
  const updateData: Partial<CrmReminder> = {
    updatedAt: now,
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.dueDateTime !== undefined) updateData.dueDateTime = input.dueDateTime;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.leadId !== undefined) updateData.leadId = input.leadId;
  if (input.companyId !== undefined) updateData.companyId = input.companyId;
  if (input.color !== undefined) updateData.color = input.color;

  if (input.isCompleted !== undefined) {
    updateData.isCompleted = input.isCompleted;
    updateData.completedAt = input.isCompleted ? now : null;
  }

  db.update(crmReminders)
    .set(updateData)
    .where(eq(crmReminders.id, id))
    .run();

  await logActivity({
    entityType: 'crm_reminder',
    entityId: id,
    action: 'reminder_updated',
    performedBy: user.userId,
    details: input,
    before: existing,
  });

  return { ...existing, ...updateData };
}

export async function deleteReminder(
  id: string,
  user: UserSessionPayload
): Promise<boolean> {
  const existing = db
    .select()
    .from(crmReminders)
    .where(eq(crmReminders.id, id))
    .get();

  if (!existing) return false;
  if (user.role !== 'admin' && existing.userId !== user.userId) {
    throw new Error('FORBIDDEN');
  }

  db.delete(crmReminders).where(eq(crmReminders.id, id)).run();

  await logActivity({
    entityType: 'crm_reminder',
    entityId: id,
    action: 'reminder_deleted',
    performedBy: user.userId,
    details: { title: existing.title },
    before: existing,
  });

  return true;
}

export async function listReminders(params: {
  userId?: string;
  isCompleted?: boolean;
  status?: 'pending' | 'completed' | 'all';
  category?: string;
  priority?: string;
  limit?: number;
}) {
  const conditions = [];
  if (params.userId) conditions.push(eq(crmReminders.userId, params.userId));
  if (params.isCompleted !== undefined) {
    conditions.push(eq(crmReminders.isCompleted, params.isCompleted));
  } else if (params.status === 'pending') {
    conditions.push(eq(crmReminders.isCompleted, false));
  } else if (params.status === 'completed') {
    conditions.push(eq(crmReminders.isCompleted, true));
  }
  if (params.category) conditions.push(eq(crmReminders.category, params.category as any));
  if (params.priority) conditions.push(eq(crmReminders.priority, params.priority as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rawList = db
    .select({
      reminder: crmReminders,
      userName: users.name,
      userEmail: users.email,
      leadCompanyName: leads.companyName,
      companyName: companies.name,
    })
    .from(crmReminders)
    .leftJoin(users, eq(crmReminders.userId, users.id))
    .leftJoin(leads, eq(crmReminders.leadId, leads.id))
    .leftJoin(companies, eq(crmReminders.companyId, companies.id))
    .where(whereClause)
    .orderBy(desc(crmReminders.createdAt))
    .limit(params.limit || 100)
    .all();

  return rawList.map((r) => ({
    ...r.reminder,
    user: { name: r.userName, email: r.userEmail },
    leadCompanyName: r.leadCompanyName,
    companyName: r.companyName,
  }));
}

// ============================================================================
// Google Calendar Live iCal Feed Synchronization
// ============================================================================

export async function getOrCreateCalendarSyncToken(userId: string): Promise<string> {
  const user = db
    .select({ id: users.id, calendarSyncToken: users.calendarSyncToken })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) throw new Error('Utente non trovato');

  if (user.calendarSyncToken) {
    return user.calendarSyncToken;
  }

  const newToken = crypto.randomBytes(24).toString('hex');
  db.update(users)
    .set({ calendarSyncToken: newToken })
    .where(eq(users.id, userId))
    .run();

  return newToken;
}

export async function regenerateCalendarSyncToken(userId: string): Promise<string> {
  const newToken = crypto.randomBytes(24).toString('hex');
  db.update(users)
    .set({ calendarSyncToken: newToken })
    .where(eq(users.id, userId))
    .run();
  return newToken;
}

export async function generateUserIcsCalendarFeed(token: string): Promise<string | null> {
  // Trova utente dal token
  const user = db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.calendarSyncToken, token))
    .get();

  if (!user) return null;

  const formatIcsDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch {
      return null;
    }
  };

  const escapeIcs = (str: string) =>
    (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const nowStamp = formatIcsDate(new Date().toISOString());
  const vevents: string[] = [];

  // 1. Appuntamenti dell'utente (o tutti se admin)
  const appts = await listAppointments({
    organizerUserId: user.id,
    limit: 200,
  });

  for (const a of appts) {
    const dtStart = formatIcsDate(a.scheduledStartTime);
    const dtEnd = formatIcsDate(a.scheduledEndTime);
    if (!dtStart || !dtEnd) continue;

    const related = a.leadCompanyName || a.companyName || '';
    const summary = related ? `${a.title} - ${related}` : a.title;
    const descParts = [
      a.description || '',
      related ? `Cliente / Lead: ${related}` : '',
      a.meetingUrl ? `Link Riunione: ${a.meetingUrl}` : '',
      a.meetingAddress ? `Luogo: ${a.meetingAddress}` : '',
      `Stato CRM: ${a.status}`,
    ].filter(Boolean);

    const location = a.meetingUrl || a.meetingAddress || (a.locationType === 'video_call' ? 'Videochiamata' : '');

    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:appt-${a.id}@aiconsulting.crm`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcs(summary)}`,
        `DESCRIPTION:${escapeIcs(descParts.join('\n'))}`,
        location ? `LOCATION:${escapeIcs(location)}` : '',
        `STATUS:${a.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Promemoria: ${escapeIcs(summary)}`,
        'END:VALARM',
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n')
    );
  }

  // 2. Richiamate in sospeso dell'utente (con allarme di scadenza)
  const callbacks = await listCallbacks({
    assignedUserId: user.id,
    limit: 100,
  });

  for (const cb of callbacks) {
    if (cb.status === 'completed' || cb.status === 'cancelled') continue;
    const dtStart = formatIcsDate(cb.scheduledAt);
    if (!dtStart) continue;

    // Richiamata: finestra di 15 minuti
    const endDate = new Date(new Date(cb.scheduledAt).getTime() + 15 * 60 * 1000).toISOString();
    const dtEnd = formatIcsDate(endDate);

    const related = cb.leadCompanyName || cb.companyName || '';
    const summary = related ? `[Richiamata ${cb.priority.toUpperCase()}] ${cb.reason} - ${related}` : `[Richiamata] ${cb.reason}`;
    const desc = [
      `Motivo: ${cb.reason}`,
      `Priorità: ${cb.priority}`,
      related ? `Contatto: ${related}` : '',
      cb.callId ? `ID Chiamata di origine: ${cb.callId}` : '',
    ].filter(Boolean).join('\n');

    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:callback-${cb.id}@aiconsulting.crm`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcs(summary)}`,
        `DESCRIPTION:${escapeIcs(desc)}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT10M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Promemoria richiamata: ${escapeIcs(cb.reason)}`,
        'END:VALARM',
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n')
    );
  }

  // 3. Promemoria rapidi con data/ora impostata
  const reminders = await listReminders({
    userId: user.id,
    isCompleted: false,
    limit: 100,
  });

  for (const r of reminders) {
    if (!r.dueDateTime) continue;
    const dtStart = formatIcsDate(r.dueDateTime);
    if (!dtStart) continue;

    const endDate = new Date(new Date(r.dueDateTime).getTime() + 30 * 60 * 1000).toISOString();
    const dtEnd = formatIcsDate(endDate);

    const related = r.leadCompanyName || r.companyName || '';
    const summary = related ? `[Promemoria] ${r.title} (${related})` : `[Promemoria] ${r.title}`;
    const desc = [
      r.description || '',
      `Categoria: ${r.category}`,
      `Priorità: ${r.priority}`,
      related ? `Riferimento: ${related}` : '',
    ].filter(Boolean).join('\n');

    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:reminder-${r.id}@aiconsulting.crm`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcs(summary)}`,
        `DESCRIPTION:${escapeIcs(desc)}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcs(r.title)}`,
        'END:VALARM',
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n')
    );
  }

  // 4. Compiti/Task assegnati all'utente con plannedEndDate
  try {
    const userTasks = db
      .select({
        task: tasks,
        projectTitle: projects.title,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          ne(tasks.status, 'completato'),
          ne(tasks.status, 'bloccato')
        )
      )
      .limit(100)
      .all();

    for (const t of userTasks) {
      if (!t.task.plannedEndDate) continue;
      // Imposta evento scadenza compito
      const dueIso = t.task.plannedEndDate.includes('T') ? t.task.plannedEndDate : `${t.task.plannedEndDate}T18:00:00.000Z`;
      const dtStart = formatIcsDate(dueIso);
      if (!dtStart) continue;

      const endDate = new Date(new Date(dueIso).getTime() + 60 * 60 * 1000).toISOString();
      const dtEnd = formatIcsDate(endDate);

      const summary = `[Scadenza Task] ${t.task.title} (${t.projectTitle || 'Progetto'})`;
      const desc = [
        t.task.description || '',
        `Progetto: ${t.projectTitle || 'N/D'}`,
        `Priorità: ${t.task.priority}`,
        `Stato: ${t.task.status}`,
      ].filter(Boolean).join('\n');

      vevents.push(
        [
          'BEGIN:VEVENT',
          `UID:task-${t.task.id}@aiconsulting.crm`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `SUMMARY:${escapeIcs(summary)}`,
          `DESCRIPTION:${escapeIcs(desc)}`,
          'STATUS:CONFIRMED',
          'BEGIN:VALARM',
          'TRIGGER:-PT1H',
          'ACTION:DISPLAY',
          `DESCRIPTION:Scadenza compito: ${escapeIcs(t.task.title)}`,
          'END:VALARM',
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n')
      );
    }
  } catch (err) {
    console.warn('Errore lettura task per sync calendario:', err);
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Consulting CRM//Live Calendar Sync Hub//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:AI CRM - ${escapeIcs(user.name)}`,
    'X-WR-TIMEZONE:Europe/Rome',
    'X-PUBLISHED-TTL:PT15M',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}
