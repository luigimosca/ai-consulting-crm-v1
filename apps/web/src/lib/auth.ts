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
  projectMembers,
  clientRequests,
  clientRequestItems,
  documents,
} from '@ai-crm/db';
import { eq, and, or } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'super-secret-ai-agency-key-change-in-prod-2026'
);

export const COOKIE_NAME = 'ai_crm_session';

export type GlobalRole = 'admin' | 'operator';
export type ProjectRole = 'manager' | 'editor' | 'contributor' | 'viewer';

export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  viewer: 1,
  contributor: 2,
  editor: 3,
  manager: 4,
};

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: GlobalRole;
  status?: 'active' | 'inactive';
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
    const sessionPayload = payload as unknown as UserSessionPayload;

    // Direct database validation: verify user exists and is still active
    const dbUser = db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, sessionPayload.userId))
      .get();

    if (!dbUser || dbUser.status === 'inactive') {
      return null;
    }

    return {
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      status: dbUser.status,
    };
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
  if (!user || user.status === 'inactive') {
    throw new Error('UNAUTHORIZED');
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Returns the effective project role for a user in a given project.
 * - Global Admin is automatically treated as 'manager' across all projects.
 * - For Operators, checks the active project_members entry.
 * - Fallbacks to project.managerId or project.createdBy if member record hasn't synced yet.
 */
export function getUserProjectRole(
  user: { userId: string; role: string },
  projectId: string
): ProjectRole | null {
  if (user.role === 'admin') return 'manager';

  const member = db
    .select({ projectRole: projectMembers.projectRole, status: projectMembers.status })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, user.userId),
        eq(projectMembers.status, 'active')
      )
    )
    .get();

  if (member) {
    return member.projectRole as ProjectRole;
  }

  // Fallback check on project record for legacy projects
  const project = db.select({ managerId: projects.managerId, createdBy: projects.createdBy }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return null;

  if (project.managerId === user.userId) return 'manager';
  if (project.createdBy === user.userId) return 'editor';

  return null;
}

/**
 * Verifies whether a user has permission to access a specific project with at least `minRole`.
 */
export function checkUserProjectAccess(
  user: { userId: string; role: string },
  projectId: string,
  minRole?: ProjectRole
): boolean {
  if (user.role === 'admin') return true;

  const userRole = getUserProjectRole(user, projectId);
  if (!userRole) return false;

  if (!minRole) return true; // At least viewer

  return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[minRole];
}

/**
 * Verifies whether a user can edit a specific task:
 * - Admin: yes
 * - Project Manager / Editor: yes
 * - Contributor: yes ONLY IF explicitly assigned to this task
 * - Viewer: no
 */
export function canUserEditTask(user: { userId: string; role: string }, taskId: string): boolean {
  if (user.role === 'admin') return true;

  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return false;

  const role = getUserProjectRole(user, task.projectId);
  if (!role) return false;

  if (role === 'manager' || role === 'editor') return true;

  if (role === 'contributor') {
    const isAssigned = db
      .select({ id: taskAssignments.id })
      .from(taskAssignments)
      .where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.userId, user.userId)))
      .get();
    return !!isAssigned;
  }

  return false;
}

/**
 * Verifies whether a user can create or delete tasks / milestones in a project:
 * - Admin: yes
 * - Manager / Editor: yes
 * - Contributor / Viewer: no
 */
export function canUserManageProjectContent(user: { userId: string; role: string }, projectId: string): boolean {
  if (user.role === 'admin') return true;
  return checkUserProjectAccess(user, projectId, 'editor');
}

/**
 * Verifies whether a user can manage the project team (add/remove members, update roles):
 * - Admin: yes
 * - Manager: yes
 * - Others: no
 */
export function canUserManageProjectTeam(user: { userId: string; role: string }, projectId: string): boolean {
  if (user.role === 'admin') return true;
  return checkUserProjectAccess(user, projectId, 'manager');
}

/**
 * Verifies whether a user has permission to access a specific client request.
 */
export function canUserAccessClientRequest(
  user: { userId: string; role: string },
  requestId: string,
  action: 'view' | 'submit' | 'edit' | 'approve' = 'view'
): boolean {
  if (user.role === 'admin') return true;

  const req = db.select().from(clientRequests).where(eq(clientRequests.id, requestId)).get();
  if (!req) return false;

  const role = getUserProjectRole(user, req.projectId);
  if (!role) return false;

  if (action === 'view') {
    return true;
  }

  if (action === 'approve') {
    return role === 'manager';
  }

  if (action === 'edit') {
    return role === 'manager' || role === 'editor';
  }

  if (action === 'submit') {
    // Contributor can submit materials, especially if assigned
    return role === 'manager' || role === 'editor' || role === 'contributor' || req.assignedToUserId === user.userId;
  }

  return false;
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
    return canUserAccessClientRequest(user, doc.entityId, 'view');
  }

  // Check if this document is linked to any client request item
  const linkedItem = db
    .select({ requestId: clientRequestItems.requestId })
    .from(clientRequestItems)
    .where(eq(clientRequestItems.documentId, doc.id))
    .get();

  if (linkedItem) {
    return canUserAccessClientRequest(user, linkedItem.requestId, 'view');
  }

  return false;
}
