import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import {
  db,
  users,
  sessions,
  projects,
  tasks,
  taskAssignments,
  clientRequests,
  clientRequestItems,
  documents,
} from '@ai-crm/db';
import { eq, and, or } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'super-secret-ai-agency-key-change-in-prod-2026'
);

export const COOKIE_NAME = 'ai_crm_session';

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'operator';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(allowedRoles?: ('admin' | 'operator')[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Verifies whether a user has permission to access a specific project.
 * - Admin: always has access.
 * - Operator: has access if:
 *   1) is project manager (projects.managerId === user.userId)
 *   2) is project creator (projects.createdBy === user.userId)
 *   3) is assigned to at least one task in the project (task_assignments -> tasks.projectId)
 *   4) is assigned to or created at least one client_request in the project
 */
export function checkUserProjectAccess(user: { userId: string; role: string }, projectId: string): boolean {
  if (user.role === 'admin') return true;

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return false;

  if (project.managerId === user.userId || project.createdBy === user.userId) {
    return true;
  }

  // Check if assigned to any task in this project
  const taskAssign = db
    .select({ id: taskAssignments.id })
    .from(taskAssignments)
    .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
    .where(and(eq(tasks.projectId, projectId), eq(taskAssignments.userId, user.userId)))
    .get();

  if (taskAssign) return true;

  // Check if assigned to or created any client request in this project
  const reqAssign = db
    .select({ id: clientRequests.id })
    .from(clientRequests)
    .where(
      and(
        eq(clientRequests.projectId, projectId),
        or(eq(clientRequests.assignedToUserId, user.userId), eq(clientRequests.requestedByUserId, user.userId))
      )
    )
    .get();

  if (reqAssign) return true;

  return false;
}

/**
 * Verifies whether a user has permission to access a specific client request.
 */
export function canUserAccessClientRequest(user: { userId: string; role: string }, requestId: string): boolean {
  if (user.role === 'admin') return true;

  const req = db.select().from(clientRequests).where(eq(clientRequests.id, requestId)).get();
  if (!req) return false;

  if (req.assignedToUserId === user.userId || req.requestedByUserId === user.userId) {
    return true;
  }

  return checkUserProjectAccess(user, req.projectId);
}

/**
 * Verifies whether a user has permission to download/view a document.
 */
export function canUserAccessDocument(user: { userId: string; role: string }, docIdOrDoc: string | any): boolean {
  if (user.role === 'admin') return true;

  const doc =
    typeof docIdOrDoc === 'string'
      ? db.select().from(documents).where(eq(documents.id, docIdOrDoc)).get()
      : docIdOrDoc;

  if (!doc) return false;

  if (doc.uploadedBy === user.userId) return true;

  if (doc.entityType === 'project') {
    return checkUserProjectAccess(user, doc.entityId);
  }

  if (doc.entityType === 'task') {
    const task = db.select().from(tasks).where(eq(tasks.id, doc.entityId)).get();
    if (task) {
      return checkUserProjectAccess(user, task.projectId);
    }
  }

  if (doc.entityType === 'client_request') {
    return canUserAccessClientRequest(user, doc.entityId);
  }

  // Check if this document is linked to any client request item
  const linkedItem = db
    .select({ requestId: clientRequestItems.requestId })
    .from(clientRequestItems)
    .where(eq(clientRequestItems.documentId, doc.id))
    .get();

  if (linkedItem) {
    return canUserAccessClientRequest(user, linkedItem.requestId);
  }

  return false;
}
